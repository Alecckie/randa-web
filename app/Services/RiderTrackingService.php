<?php

namespace App\Services;

use App\Models\RiderGpsPoint;
use App\Models\RiderCheckIn;
use App\Models\RiderPauseEvent;
use App\Models\RiderRoute;
use App\Support\GpsPathSimplifier;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RiderTrackingService
{
    /**
     * How many days to retain full-resolution GPS points.
     * After this window the nightly purge deletes raw rows.
     * The rider_routes summary (distance, speed, polyline) is kept forever.
     */
    private const GPS_RETENTION_DAYS = 7;

    /**
     * Time-based heartbeat: always record a point if the rider has been
     * stationary for this many seconds, so the session stays "alive".
     */
    private const HEARTBEAT_SECONDS = 60;

    /**
     * Active check-in cache TTL (minutes).
     * Short enough that a check-out is reflected quickly.
     */
    private const CHECKIN_CACHE_TTL = 5;

    // ──────────────────────────────────────────────────────────────────────
    // GPS RECORDING — single point
    // ──────────────────────────────────────────────────────────────────────

    /**
     * Record a single GPS point sent by the mobile app.
     *
     * The single-point endpoint is used for real-time updates while the
     * rider has connectivity. Batch is used for offline sync.
     * Both paths share the same validation/dedup/route-update logic.
     */
    public function recordLocation(int $riderId, array $locationData): RiderGpsPoint
    {
        $checkIn = $this->getActiveCheckIn($riderId);

        if (! $checkIn) {
            throw new \Exception('No active check-in found for this rider.');
        }

        $route = $this->getTodayRoute($riderId);

        if ($route && $route->tracking_status === 'paused') {
            throw new \Exception('Location tracking is currently paused. Please resume to continue recording.');
        }

        // Run single-point deduplication against the last stored point
        if (! $this->shouldRecordSinglePoint($riderId, $locationData)) {
            // Return the last known point rather than creating a new one,
            // so the mobile app still gets a valid 201 response.
            $last = $this->getLastStoredPoint($riderId);
            if ($last) {
                return $last;
            }
        }

        $gpsPoint = RiderGpsPoint::create([
            'rider_id'               => $riderId,
            'check_in_id'            => $checkIn->id,
            'campaign_assignment_id' => $checkIn->campaign_assignment_id,
            'latitude'               => $locationData['latitude'],
            'longitude'              => $locationData['longitude'],
            'accuracy'               => $locationData['accuracy']    ?? null,
            'altitude'               => $locationData['altitude']    ?? null,
            'speed'                  => $locationData['speed']       ?? null,
            'heading'                => $locationData['heading']     ?? null,
            'recorded_at'            => $locationData['recorded_at'] ?? now(),
            'source'                 => $locationData['source']      ?? 'mobile',
            'metadata'               => $locationData['metadata']    ?? null,
        ]);

        $this->updateRouteRecord($checkIn, $gpsPoint);
        $this->cacheLatestPoint($riderId, $gpsPoint);

        return $gpsPoint;
    }

    // ──────────────────────────────────────────────────────────────────────
    // GPS RECORDING — batch (offline sync)
    // ──────────────────────────────────────────────────────────────────────

    /**
     * Record a batch of GPS points collected while offline.
     *
     * Pipeline:
     *   1. Sort by recorded_at           — ensure chronological order
     *   2. deduplicateBatch()            — remove same-spot / noisy points
     *   3. simplify() (RDP)              — collapse straight-road segments
     *   4. Bulk INSERT                   — one query, not N queries
     *   5. updateRouteRecord()           — refresh route summary
     *
     * @return array{
     *   stored: int,
     *   original: int,
     *   after_dedup: int,
     *   dedup_reduction_pct: float,
     *   rdp_reduction_pct: float
     * }
     */
    public function recordBatchLocations(int $riderId, array $locations): array
    {
        $checkIn = $this->getActiveCheckIn($riderId);

        if (! $checkIn) {
            throw new \Exception('No active check-in found.');
        }

        $originalCount = count($locations);

        if ($originalCount === 0) {
            return $this->buildBatchResult(0, 0, 0);
        }

        // ── Step 1: sort chronologically ─────────────────────────────────
        usort($locations, fn ($a, $b) => strcmp(
            $a['recorded_at'] ?? '',
            $b['recorded_at'] ?? ''
        ));

        // ── Step 2: deduplication (device-side noise, retries) ───────────
        $deduplicated = GpsPathSimplifier::deduplicateBatch($locations);
        $dedupCount   = count($deduplicated);

        if ($dedupCount === 0) {
            Log::info('Batch GPS: all points filtered by deduplication', [
                'rider_id'       => $riderId,
                'original_count' => $originalCount,
            ]);
            return $this->buildBatchResult(0, $originalCount, 0);
        }

        // ── Step 3: RDP path simplification ──────────────────────────────
        $simplified    = GpsPathSimplifier::simplify($deduplicated);
        $insertedCount = count($simplified);

        // ── Step 4: bulk INSERT ───────────────────────────────────────────
        $now     = now();
        $records = array_map(fn ($loc) => [
            'rider_id'               => $riderId,
            'check_in_id'            => $checkIn->id,
            'campaign_assignment_id' => $checkIn->campaign_assignment_id,
            'latitude'               => $loc['latitude'],
            'longitude'              => $loc['longitude'],
            'accuracy'               => $loc['accuracy']  ?? null,
            'altitude'               => $loc['altitude']  ?? null,
            'speed'                  => $loc['speed']     ?? null,
            'heading'                => $loc['heading']   ?? null,
            'recorded_at'            => $loc['recorded_at'] ?? $now,
            'source'                 => $loc['source']    ?? 'mobile',
            'metadata'               => isset($loc['metadata'])
                ? json_encode($loc['metadata'])
                : null,
            'created_at'             => $now,
            'updated_at'             => $now,
        ], $simplified);

        RiderGpsPoint::insert($records);

        // ── Step 5: refresh route summary ────────────────────────────────
        $lastPoint = RiderGpsPoint::where('check_in_id', $checkIn->id)
            ->latest('recorded_at')
            ->first();

        if ($lastPoint) {
            $this->updateRouteRecord($checkIn, $lastPoint);
            $this->cacheLatestPoint($riderId, $lastPoint);
        }

        $result = $this->buildBatchResult($insertedCount, $originalCount, $dedupCount);

        Log::info('Batch GPS points recorded', [
            'rider_id'            => $riderId,
            'original'            => $originalCount,
            'after_dedup'         => $dedupCount,
            'stored'              => $insertedCount,
            'dedup_reduction_pct' => $result['dedup_reduction_pct'],
            'rdp_reduction_pct'   => $result['rdp_reduction_pct'],
        ]);

        return $result;
    }

    // ──────────────────────────────────────────────────────────────────────
    // TRACKING PAUSE / RESUME
    // ──────────────────────────────────────────────────────────────────────

    public function pauseTracking(int $riderId): array
    {
        return DB::transaction(function () use ($riderId) {
            $checkIn = $this->getActiveCheckIn($riderId);

            if (! $checkIn) {
                throw new \Exception('No active check-in found.');
            }

            if ($checkIn->isPaused()) {
                throw new \Exception('Tracking is already paused.');
            }

            $checkIn->update(['status' => RiderCheckIn::STATUS_PAUSED]);

            $route = $this->getOrCreateRoute($checkIn);

            $route->update([
                'tracking_status' => 'paused',
                'last_paused_at'  => now(),
            ]);

            $currentLocation = $this->getLastStoredPoint($riderId);

            $pauseEvent = RiderPauseEvent::create([
                'rider_id'        => $riderId,
                'check_in_id'     => $checkIn->id,
                'route_id'        => $route->id,
                'paused_at'       => now(),
                'pause_latitude'  => $currentLocation?->latitude,
                'pause_longitude' => $currentLocation?->longitude,
                'reason'          => 'break',
            ]);

            // Bust the active check-in cache so subsequent calls see paused status
            $this->clearRiderCache($riderId);

            return [
                'check_in'    => $checkIn->fresh(),
                'pause_event' => $pauseEvent,
                'message'     => 'Tracking paused successfully.',
            ];
        });
    }

    public function resumeTracking(int $riderId): array
    {
        return DB::transaction(function () use ($riderId) {
            // Load WITHOUT the cache so we see the paused status
            $checkIn = RiderCheckIn::where('rider_id', $riderId)
                ->whereIn('status', [
                    RiderCheckIn::STATUS_PAUSED,
                    RiderCheckIn::STATUS_STARTED,
                    RiderCheckIn::STATUS_RESUMED,
                ])
                ->whereDate('check_in_date', today())
                ->latest()
                ->first();

            if (! $checkIn) {
                throw new \Exception('No active check-in found.');
            }

            if (! $checkIn->isPaused()) {
                throw new \Exception('Tracking is not currently paused.');
            }

            $pauseEvent = RiderPauseEvent::where('rider_id', $riderId)
                ->whereNull('resumed_at')
                ->latest('paused_at')
                ->first();

            if (! $pauseEvent) {
                throw new \Exception('No active pause event found.');
            }

            $checkIn->update(['status' => RiderCheckIn::STATUS_RESUMED]);

            $duration = $pauseEvent->calculateDuration();
            $pauseEvent->update([
                'resumed_at'       => now(),
                'duration_minutes' => $duration,
            ]);

            // Update route tracking status and pause summary
            $route = $this->getTodayRoute($riderId);
            if ($route) {
                $route->update([
                    'tracking_status'  => 'active',
                    'last_resumed_at'  => now(),
                ]);
                $route->updatePauseSummary();
            }

            $this->clearRiderCache($riderId);

            return [
                'check_in'    => $checkIn->fresh(),
                'pause_event' => $pauseEvent->fresh(),
                'message'     => 'Tracking resumed successfully.',
            ];
        });
    }

    // ──────────────────────────────────────────────────────────────────────
    // RETENTION CLEANUP
    // ──────────────────────────────────────────────────────────────────────

    /**
     * Delete raw GPS points older than GPS_RETENTION_DAYS.
     *
     * Runs in chunks to avoid a single massive DELETE lock.
     * The rider_routes summary row is never touched — historical
     * reporting continues to work from that table.
     *
     * @return int Total rows deleted.
     */
    public function purgeOldGpsPoints(): int
    {
        $cutoff = now()->subDays(self::GPS_RETENTION_DAYS);
        $total  = 0;

        do {
            $deleted = RiderGpsPoint::where('recorded_at', '<', $cutoff)
                ->limit(5000)
                ->delete();

            $total += $deleted;
        } while ($deleted > 0);

        Log::info('GPS retention purge complete', [
            'deleted'        => $total,
            'cutoff_date'    => $cutoff->toDateString(),
            'retention_days' => self::GPS_RETENTION_DAYS,
        ]);

        return $total;
    }

    // ──────────────────────────────────────────────────────────────────────
    // STATUS & STATS
    // ──────────────────────────────────────────────────────────────────────

    public function getTrackingStatus(int $riderId): array
    {
        $checkIn = $this->getActiveCheckIn($riderId);

        if (! $checkIn) {
            return [
                'is_active'       => false,
                'tracking_status' => 'stopped',
                'message'         => 'No active check-in found.',
            ];
        }

        $route = $this->getTodayRoute($riderId);

        return [
            'is_active'            => true,
            'tracking_status'      => $route?->tracking_status ?? 'active',
            'check_in_time'        => $checkIn->check_in_time?->toIso8601String(),
            'last_paused_at'       => $route?->last_paused_at?->toIso8601String(),
            'last_resumed_at'      => $route?->last_resumed_at?->toIso8601String(),
            'total_pause_duration' => $route?->total_pause_duration ?? 0,
            'locations_recorded'   => $route?->location_points_count ?? 0,
            'message'              => ($route?->tracking_status === 'paused')
                ? 'Tracking paused.'
                : 'Tracking active.',
        ];
    }

    /**
     * @param  string  $period  'today' | 'week' | 'month'
     */
    public function getDashboardStats(string $period = 'today'): array
    {
        $dateFilter = match ($period) {
            'week'  => now()->subDays(7),
            'month' => now()->subDays(30),
            default => today(),
        };

        $activeRiders = RiderCheckIn::whereIn('status', [
            RiderCheckIn::STATUS_STARTED,
            RiderCheckIn::STATUS_RESUMED,
        ])
            ->whereDate('check_in_date', today())
            ->count();

        $totalDistance = RiderRoute::where('route_date', '>=', $dateFilter)
            ->sum('total_distance') ?? 0;

        $totalLocations = RiderGpsPoint::where('recorded_at', '>=', $dateFilter)
            ->count();

        $activeCampaigns = DB::table('campaigns')
            ->join('campaign_assignments', 'campaigns.id', '=', 'campaign_assignments.campaign_id')
            ->join('rider_check_ins', 'campaign_assignments.id', '=', 'rider_check_ins.campaign_assignment_id')
            ->where('campaigns.status', 'active')
            ->whereIn('rider_check_ins.status', [
                RiderCheckIn::STATUS_STARTED,
                RiderCheckIn::STATUS_RESUMED,
            ])
            ->whereDate('rider_check_ins.check_in_date', today())
            ->distinct('campaigns.id')
            ->count('campaigns.id');

        $avgSpeed = RiderRoute::where('route_date', '>=', $dateFilter)
            ->whereNotNull('avg_speed')
            ->avg('avg_speed');

        return [
            'active_riders'   => $activeRiders  ?? 0,
            'total_distance'  => round((float) ($totalDistance ?? 0), 2),
            'total_locations' => $totalLocations ?? 0,
            'active_campaigns'=> $activeCampaigns ?? 0,
            'avg_speed'       => $avgSpeed ? round((float) $avgSpeed, 2) : 0.0,
        ];
    }

    public function getRiderStats(int $riderId, ?Carbon $date = null): array
    {
        $date = $date ?? today();

        $route   = RiderRoute::where('rider_id', $riderId)
            ->whereDate('route_date', $date)
            ->first();

        $checkIn = RiderCheckIn::where('rider_id', $riderId)
            ->whereDate('check_in_date', $date)
            ->first();

        // Aggregate speed from GPS points instead of loading all into memory
        $speedStats = RiderGpsPoint::where('rider_id', $riderId)
            ->whereDate('recorded_at', $date)
            ->whereNotNull('speed')
            ->selectRaw('AVG(speed) as avg_speed, MAX(speed) as max_speed')
            ->first();

        return [
            'date'                     => $date->toDateString(),
            'checked_in'               => (bool) $checkIn,
            'check_in_time'            => $checkIn?->check_in_time?->format('H:i:s'),
            'check_out_time'           => $checkIn?->check_out_time?->format('H:i:s'),
            'tracking_status'          => $route?->tracking_status ?? 'stopped',
            'total_locations_recorded' => $route?->location_points_count ?? 0,
            'total_distance_km'        => $route ? (float) $route->total_distance : 0.0,
            'total_pause_duration'     => $route?->total_pause_duration ?? 0,
            'pause_count'              => $route?->pause_count ?? 0,
            'first_location_time'      => $route?->started_at?->format('H:i:s'),
            'last_location_time'       => $route?->ended_at?->format('H:i:s'),
            'average_speed'            => $speedStats?->avg_speed
                ? round((float) $speedStats->avg_speed, 2)
                : null,
            'max_speed'                => $speedStats?->max_speed
                ? round((float) $speedStats->max_speed, 2)
                : null,
        ];
    }

    // ──────────────────────────────────────────────────────────────────────
    // LIVE TRACKING (admin map view)
    // ──────────────────────────────────────────────────────────────────────

    public function getLiveTrackingData(array $filters = []): array
    {
        try {
            $query = RiderGpsPoint::query()
                ->with(['rider.user', 'campaignAssignment.campaign'])
                ->join('rider_check_ins', 'rider_gps_points.check_in_id', '=', 'rider_check_ins.id')
                ->whereIn('rider_check_ins.status', [
                    RiderCheckIn::STATUS_STARTED,
                    RiderCheckIn::STATUS_RESUMED,
                ])
                // ->whereDate('rider_check_ins.check_in_date', today())
                ->select('rider_gps_points.*');

            if (! empty($filters['campaign_id'])) {
                $query->whereHas('campaignAssignment', fn ($q) =>
                    $q->where('campaign_id', $filters['campaign_id'])
                );
            }

            if (! empty($filters['rider_ids']) && is_array($filters['rider_ids'])) {
                $query->whereIn('rider_gps_points.rider_id', $filters['rider_ids']);
            }

            // Latest point per active rider
            $latestPoints = $query->get()
                ->groupBy('rider_id')
                ->map(fn ($pts) => $pts->sortByDesc('recorded_at')->first())
                ->values();

            return [
                'active_riders' => $latestPoints->count(),
                'locations'     => $latestPoints,
                'last_updated'  => now()->toIso8601String(),
            ];
        } catch (\Exception $e) {
            Log::error('Failed to get live tracking data', [
                'error'   => $e->getMessage(),
                'filters' => $filters,
            ]);

            return [
                'active_riders' => 0,
                'locations'     => collect([]),
                'last_updated'  => now()->toIso8601String(),
                'error'         => $e->getMessage(),
            ];
        }
    }

    /**
     * Enrich a RiderGpsPoint into a flat array safe for JSON / Inertia props.
     * Shared between TrackingController (Inertia) and AdminTrackingController (API).
     */
    public function enrichLocation(RiderGpsPoint $gpsPoint): array
    {
        $rider              = $gpsPoint->rider;
        $user               = $rider?->user;
        $campaignAssignment = $gpsPoint->campaignAssignment;
        $campaign           = $campaignAssignment?->campaign;

        return [
            'id'       => $gpsPoint->id,
            'rider_id' => $gpsPoint->rider_id,

            'rider' => [
                'id'     => $rider?->id,
                'name'   => $user?->name,
                'phone'  => $user?->phone,
                'email'  => $user?->email,
                'status' => $rider?->status,
            ],

            'location' => [
                'latitude'  => $gpsPoint->latitude  !== null ? (float) $gpsPoint->latitude  : null,
                'longitude' => $gpsPoint->longitude !== null ? (float) $gpsPoint->longitude : null,
                'accuracy'  => $gpsPoint->accuracy  !== null ? (float) $gpsPoint->accuracy  : null,
                'speed'     => $gpsPoint->speed     !== null ? (float) $gpsPoint->speed     : null,
                'heading'   => $gpsPoint->heading   !== null ? (float) $gpsPoint->heading   : null,
            ],

            'campaign' => ($campaignAssignment && $campaign) ? [
                'id'   => $campaignAssignment->campaign_id,
                'name' => $campaign->name,
            ] : null,

            'recorded_at' => $gpsPoint->recorded_at?->toIso8601String(),
            'time_ago'    => $gpsPoint->recorded_at?->diffForHumans(),
            'is_recent'   => $gpsPoint->is_recent ?? false,

            // Flat aliases for map libraries that expect top-level lat/lng
            'latitude'  => $gpsPoint->latitude  !== null ? (float) $gpsPoint->latitude  : null,
            'longitude' => $gpsPoint->longitude !== null ? (float) $gpsPoint->longitude : null,
        ];
    }

    // ──────────────────────────────────────────────────────────────────────
    // QUERY HELPERS
    // ──────────────────────────────────────────────────────────────────────

    public function getRiderLocations(int $riderId, array $filters = [])
    {
        $query = RiderGpsPoint::where('rider_id', $riderId)
            ->with(['campaignAssignment.campaign']);

        if (! empty($filters['date_from'])) {
            $query->whereDate('recorded_at', '>=', $filters['date_from']);
        }

        if (! empty($filters['date_to'])) {
            $query->whereDate('recorded_at', '<=', $filters['date_to']);
        }

        if (empty($filters['date_from']) && empty($filters['date_to'])) {
            $query->whereDate('recorded_at', today());
        }

        return $query
            ->orderBy('recorded_at')
            ->limit($filters['limit'] ?? 1000)
            ->get();
    }

    public function getCurrentLocation(int $riderId): ?RiderGpsPoint
    {
        return Cache::remember(
            "rider.{$riderId}.latest_gps_point",
            now()->addMinutes(5),
            fn () => RiderGpsPoint::where('rider_id', $riderId)
                ->with(['rider.user'])
                ->latest('recorded_at')
                ->first()
        );
    }

    public function clearRiderCache(int $riderId): void
    {
        Cache::forget("rider.{$riderId}.latest_gps_point");
        Cache::forget("rider.{$riderId}.active_checkin");
    }

    // ──────────────────────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ──────────────────────────────────────────────────────────────────────

    /**
     * Decide whether a single incoming point should be stored.
     * Mirrors the device-side GpsRecorder logic as a server-side safety net.
     */
    private function shouldRecordSinglePoint(int $riderId, array $locationData): bool
    {
        // Reject poor accuracy readings outright
        if (
            isset($locationData['accuracy']) &&
            $locationData['accuracy'] !== null &&
            (float) $locationData['accuracy'] > GpsPathSimplifier::DEDUP_MAX_ACCURACY_M
        ) {
            return false;
        }

        $last = $this->getLastStoredPoint($riderId);

        if (! $last) {
            return true; // First point — always record
        }

        $dist = GpsPathSimplifier::haversine(
            ['latitude' => $last->latitude, 'longitude' => $last->longitude],
            ['latitude' => $locationData['latitude'], 'longitude' => $locationData['longitude']]
        );

        // Same spot check
        if ($dist < GpsPathSimplifier::DEDUP_MIN_DISTANCE_M) {
            $speed        = isset($locationData['speed']) ? (float) $locationData['speed'] : null;
            $isStationary = $speed === null ? true : $speed < 0.5;

            if ($isStationary) {
                // Allow through only as a heartbeat if enough time has passed
                $elapsed = now()->diffInSeconds($last->recorded_at);
                return $elapsed >= self::HEARTBEAT_SECONDS;
            }
        }

        return true;
    }

    /**
     * Create or update the rider_routes summary row for today.
     *
     * Calculates incremental distance between the new point and the
     * previous latest point, updates speed stats, and increments the
     * point counter — all without loading all GPS points into memory.
     */
    private function updateRouteRecord(RiderCheckIn $checkIn, RiderGpsPoint $newPoint): void
    {
        $route = $this->getOrCreateRoute($checkIn);

        // Incremental distance: distance from previous latest point to new point
        $prevPoint = RiderGpsPoint::where('check_in_id', $checkIn->id)
            ->where('id', '!=', $newPoint->id)
            ->latest('recorded_at')
            ->first();

        $additionalDistanceKm = 0.0;

        if ($prevPoint) {
            $additionalDistanceKm = GpsPathSimplifier::haversine(
                ['latitude' => $prevPoint->latitude,  'longitude' => $prevPoint->longitude],
                ['latitude' => $newPoint->latitude,   'longitude' => $newPoint->longitude]
            ) / 1000.0;
        }

        // Speed stats — avoid loading all rows; use DB aggregation
        $speedStats = RiderGpsPoint::where('check_in_id', $checkIn->id)
            ->whereNotNull('speed')
            ->selectRaw('AVG(speed) as avg_speed, MAX(speed) as max_speed')
            ->first();

        $route->increment('location_points_count');
        $route->increment('total_distance', $additionalDistanceKm);

        $updateData = ['updated_at' => now()];

        if ($speedStats && $speedStats->avg_speed !== null) {
            $updateData['avg_speed'] = round((float) $speedStats->avg_speed, 2);
            $updateData['max_speed'] = round((float) $speedStats->max_speed, 2);
        }

        $route->update($updateData);
    }

    /**
     * Get or create today's route record for a check-in.
     */
    private function getOrCreateRoute(RiderCheckIn $checkIn): RiderRoute
    {
        return RiderRoute::firstOrCreate(
            [
                'rider_id'    => $checkIn->rider_id,
                'check_in_id' => $checkIn->id,
                'route_date'  => today(),
            ],
            [
                'campaign_assignment_id' => $checkIn->campaign_assignment_id,
                'started_at'             => $checkIn->check_in_time,
                'status'                 => 'active',
                'tracking_status'        => 'active',
            ]
        );
    }

    /**
     * Fetch the active check-in for a rider (started OR resumed).
     * Cached briefly to avoid a DB hit on every GPS point.
     */
    private function getActiveCheckIn(int $riderId): ?RiderCheckIn
    {
        return Cache::remember(
            "rider.{$riderId}.active_checkin",
            now()->addMinutes(self::CHECKIN_CACHE_TTL),
            fn () => RiderCheckIn::where('rider_id', $riderId)
                ->whereIn('status', [
                    RiderCheckIn::STATUS_STARTED,
                    RiderCheckIn::STATUS_RESUMED,
                ])
                ->whereDate('check_in_date', today())
                ->latest()
                ->first()
        );
    }

    private function getTodayRoute(int $riderId): ?RiderRoute
    {
        return RiderRoute::where('rider_id', $riderId)
            ->whereDate('route_date', today())
            ->first();
    }

    /**
     * Get the last GPS point stored for a rider without touching the
     * full-history cache (which is keyed differently).
     */
    private function getLastStoredPoint(int $riderId): ?RiderGpsPoint
    {
        return Cache::remember(
            "rider.{$riderId}.latest_gps_point",
            now()->addMinutes(5),
            fn () => RiderGpsPoint::where('rider_id', $riderId)
                ->latest('recorded_at')
                ->first()
        );
    }

    private function cacheLatestPoint(int $riderId, RiderGpsPoint $point): void
    {
        Cache::put(
            "rider.{$riderId}.latest_gps_point",
            $point,
            now()->addHours(24)
        );
    }

    /**
     * Build the standardised batch result array.
     */
    private function buildBatchResult(int $stored, int $original, int $afterDedup): array
    {
        $dedupReduction = $original > 0
            ? round((1 - $afterDedup / $original) * 100, 1)
            : 0.0;

        $rdpReduction = $afterDedup > 0
            ? round((1 - $stored / $afterDedup) * 100, 1)
            : 0.0;

        return [
            'stored'              => $stored,
            'original'            => $original,
            'after_dedup'         => $afterDedup,
            'dedup_reduction_pct' => $dedupReduction,
            'rdp_reduction_pct'   => $rdpReduction,
        ];
    }
}