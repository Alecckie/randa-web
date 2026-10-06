<?php

namespace App\Services;

use App\Models\RiderGpsPoint;
use App\Models\RiderCheckIn;
use App\Models\RiderPauseEvent;
use App\Models\RiderRoute;
use App\Services\Shift\RiderMovementAnalyzer;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class RiderTrackingService
{
    public function __construct(
        private RiderMovementAnalyzer $movementAnalyzer,
    ) {}

    // ──────────────────────────────────────────────────────────────────────────
    // GPS RECORDING
    // ──────────────────────────────────────────────────────────────────────────

    public function recordLocation(int $riderId, array $locationData): RiderGpsPoint
    {
        try {
            $checkIn = $this->getActiveCheckIn($riderId);

            // getActiveCheckIn() already excludes paused check-ins (only
            // started/resumed qualify as "tracking"), so a paused rider
            // lands here as null and throwNoActiveCheckInError() below
            // reports the precise "tracking is paused" message.
            if (!$checkIn) {
                $this->throwNoActiveCheckInError($riderId);
            }

            // Captured before creating the new point so it's the point that
            // immediately precedes this one — the other endpoint of the
            // distance segment being added.
            $previousPoint = RiderGpsPoint::where('check_in_id', $checkIn->id)
                ->latest('recorded_at')
                ->first();

            $gpsPoint = RiderGpsPoint::create([
                'rider_id'               => $riderId,
                'check_in_id'            => $checkIn->id,
                'campaign_assignment_id' => $checkIn->campaign_assignment_id ?? null,
                'latitude'               => $locationData['latitude'],
                'longitude'              => $locationData['longitude'],
                'accuracy'               => $locationData['accuracy'] ?? null,
                'altitude'               => $locationData['altitude'] ?? null,
                'speed'                  => $locationData['speed'] ?? null,
                'heading'                => $locationData['heading'] ?? null,
                'recorded_at'            => $locationData['recorded_at'] ?? now(),
                'source'                 => $locationData['source'] ?? 'mobile',
                'metadata'               => $locationData['metadata'] ?? null,
            ]);

            $this->updateRouteRecord($checkIn, collect([$gpsPoint]), $previousPoint);

            Cache::put("rider.{$riderId}.latest_gps_point", $gpsPoint, now()->addHours(24));

            Log::info('GPS point recorded', [
                'rider_id'     => $riderId,
                'gps_point_id' => $gpsPoint->id,
                'lat'          => $gpsPoint->latitude,
                'lng'          => $gpsPoint->longitude,
            ]);

            return $gpsPoint;
        } catch (\Exception $e) {
            Log::error('Failed to record GPS point', [
                'rider_id' => $riderId,
                'error'    => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    public function recordBatchLocations(int $riderId, array $locations): int
    {
        try {
            $checkIn = $this->getActiveCheckIn($riderId);

            if (!$checkIn) {
                $this->throwNoActiveCheckInError($riderId);
            }

            // The point immediately before this batch — the other endpoint
            // of the first new distance segment. Captured before insert so
            // it's never one of the rows we're about to add.
            $previousPoint = RiderGpsPoint::where('check_in_id', $checkIn->id)
                ->latest('recorded_at')
                ->first();

            $records = collect($locations)->map(fn($loc) => [
                'rider_id'               => $riderId,
                'check_in_id'            => $checkIn->id,
                'campaign_assignment_id' => $checkIn->campaign_assignment_id ?? null,
                'latitude'               => $loc['latitude'],
                'longitude'              => $loc['longitude'],
                'accuracy'               => $loc['accuracy'] ?? null,
                'altitude'               => $loc['altitude'] ?? null,
                'speed'                  => $loc['speed'] ?? null,
                'heading'                => $loc['heading'] ?? null,
                'recorded_at'            => $loc['recorded_at'] ?? now(),
                'source'                 => $loc['source'] ?? 'mobile',
                'metadata'               => isset($loc['metadata']) ? json_encode($loc['metadata']) : null,
                'created_at'             => now(),
                'updated_at'             => now(),
            ])->toArray();

            RiderGpsPoint::insert($records);

            $count = count($records);

            if ($count > 0) {
                // Re-fetch as models (not the raw insert arrays) so recorded_at
                // is a Carbon instance, ordered chronologically to walk the
                // path in the order the rider actually moved through it.
                $newPoints = RiderGpsPoint::where('check_in_id', $checkIn->id)
                    ->when(
                        $previousPoint,
                        fn($q) => $q->where('recorded_at', '>', $previousPoint->recorded_at)
                    )
                    ->orderBy('recorded_at')
                    ->get();

                $this->updateRouteRecord($checkIn, $newPoints, $previousPoint);
            }

            Log::info('Batch GPS points recorded', [
                'rider_id' => $riderId,
                'count'    => $count,
            ]);

            return $count;
        } catch (\Exception $e) {
            Log::error('Failed to record batch GPS points', [
                'rider_id' => $riderId,
                'error'    => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // TRACKING PAUSE / RESUME
    // ──────────────────────────────────────────────────────────────────────────

    public function pauseTracking(int $riderId): array
    {
        DB::beginTransaction();

        try {
            // Not getActiveCheckIn() — that excludes paused check-ins by
            // design (it gates GPS recording). Pause/resume need to find
            // the check-in regardless of started/paused/resumed.
            $checkIn = $this->getTodayCheckIn($riderId);

            if (!$checkIn) {
                throw new \Exception('No active check-in found');
            }

            if ($checkIn->isPaused()) {
                throw new \Exception('Tracking is already paused');
            }

            // Update check-in status
            $checkIn->update(['status' => RiderCheckIn::STATUS_PAUSED]);

            // Get or create route
            $route = $this->getTodayRoute($riderId);
            if (!$route) {
                $route = RiderRoute::create([
                    'rider_id' => $riderId,
                    'check_in_id' => $checkIn->id,
                    'campaign_assignment_id' => $checkIn->campaign_assignment_id,
                    'route_date' => today(),
                    'started_at' => $checkIn->check_in_time,
                ]);
            }

            // Get current location
            $currentLocation = $this->getCurrentLocation($riderId);

            // Create new pause event
            $pauseEvent = RiderPauseEvent::create([
                'rider_id' => $riderId,
                'check_in_id' => $checkIn->id,
                'route_id' => $route->id,
                'paused_at' => now(),
                'pause_latitude' => $currentLocation?->latitude,
                'pause_longitude' => $currentLocation?->longitude,
                'reason' => 'break',
            ]);

            DB::commit();

            $this->clearRiderCache($riderId);

            return [
                'check_in' => $checkIn->fresh(),
                'pause_event' => $pauseEvent,
                'message' => 'Tracking paused successfully',
            ];
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    public function resumeTracking(int $riderId): array
    {
        DB::beginTransaction();

        try {
            $checkIn = $this->getTodayCheckIn($riderId);

            if (!$checkIn) {
                throw new \Exception('No active check-in found');
            }

            if (!$checkIn->isPaused()) {
                throw new \Exception('Tracking is not paused');
            }

            // Find active pause event
            $pauseEvent = RiderPauseEvent::where('rider_id', $riderId)
                ->whereNull('resumed_at')
                ->latest('paused_at')
                ->first();

            if (!$pauseEvent) {
                throw new \Exception('No active pause found');
            }

            // Update check-in status
            $checkIn->update(['status' => RiderCheckIn::STATUS_RESUMED]);

            // Complete pause event
            $duration = $pauseEvent->calculateDuration();
            $pauseEvent->update([
                'resumed_at' => now(),
                'duration_minutes' => $duration,
            ]);

            // Update route summary
            if ($pauseEvent->route) {
                $pauseEvent->route->updatePauseSummary();
            }

            DB::commit();

            $this->clearRiderCache($riderId);

            return [
                'check_in' => $checkIn->fresh(),
                'pause_event' => $pauseEvent->fresh(),
                'message' => 'Tracking resumed successfully',
            ];
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // STATUS & STATS
    // ──────────────────────────────────────────────────────────────────────────

    public function getTrackingStatus(int $riderId): array
    {
        // getTodayCheckIn() (not getActiveCheckIn()) — must include a
        // paused check-in so a paused rider is correctly reported as
        // "tracking paused" rather than "no active check-in found".
        $checkIn = $this->getTodayCheckIn($riderId);

        if (!$checkIn) {
            return [
                'is_active'       => false,
                'tracking_status' => 'stopped',
                'message'         => 'No active check-in found',
            ];
        }

        $route = $this->getTodayRoute($riderId);
        $latestPause = RiderPauseEvent::where('check_in_id', $checkIn->id)
            ->latest('paused_at')
            ->first();

        $trackingStatus = $checkIn->isPaused() ? 'paused' : 'active';

        return [
            'is_active'            => true,
            'tracking_status'      => $trackingStatus,
            'check_in_time'        => $checkIn->check_in_time?->toIso8601String(),
            'last_paused_at'       => $latestPause?->paused_at?->toIso8601String(),
            'last_resumed_at'      => $latestPause?->resumed_at?->toIso8601String(),
            'total_pause_duration' => $route->total_pause_duration ?? 0,
            'locations_recorded'   => $route->location_points_count ?? 0,
            'message'              => $trackingStatus === 'paused' ? 'Tracking paused' : 'Tracking active',
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

        // rider_check_ins.status is an enum of started/paused/resumed/ended
        // — there is no 'active' value, so this previously matched zero rows
        // no matter what. "Actively tracking" means started or resumed
        // (matches RiderCheckIn::scopeTracking()).
        $activeRiders = DB::table('rider_check_ins')
            ->whereIn('status', [RiderCheckIn::STATUS_STARTED, RiderCheckIn::STATUS_RESUMED])
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
            ->whereIn('rider_check_ins.status', [RiderCheckIn::STATUS_STARTED, RiderCheckIn::STATUS_RESUMED])
            ->whereDate('rider_check_ins.check_in_date', today())
            ->distinct('campaigns.id')
            ->count('campaigns.id');

        $avgSpeed = RiderRoute::where('route_date', '>=', $dateFilter)
            ->whereNotNull('avg_speed')
            ->avg('avg_speed');

        return [
            'active_riders'    => $activeRiders ?? 0,
            'total_distance'   => round((float) ($totalDistance ?? 0), 2),
            'total_locations'  => $totalLocations ?? 0,
            'active_campaigns' => $activeCampaigns ?? 0,
            'avg_speed'        => $avgSpeed ? round((float) $avgSpeed, 2) : 0.0,
            // rider_routes.coverage_areas was dropped by
            // 2026_02_26_143937_drop_rider_routes_columns.php with no
            // replacement data source. Kept as a static 0 (not removed)
            // because the frontend stat tile (TrackingStats.tsx) still
            // renders this key unconditionally.
            'coverage_areas'   => 0,
        ];
    }

    public function getRiderStats(int $riderId, ?Carbon $date = null): array
    {
        $date = $date ?? today();

        $gpsPoints = RiderGpsPoint::where('rider_id', $riderId)
            ->whereDate('recorded_at', $date)
            ->get();

        $checkIn = RiderCheckIn::where('rider_id', $riderId)
            ->whereDate('check_in_date', $date)
            ->first();

        // Use an explicit date query so historical dates work correctly,
        // not just today's route.
        $route = RiderRoute::where('rider_id', $riderId)
            ->whereDate('route_date', $date)
            ->first();

        $avgSpeed = $gpsPoints->avg('speed');
        $maxSpeed = $gpsPoints->max('speed');

        return [
            'date'                     => $date->toDateString(),
            'checked_in'               => (bool) $checkIn,
            'check_in_time'            => $checkIn?->check_in_time?->format('H:i:s'),
            'check_out_time'           => $checkIn?->check_out_time?->format('H:i:s'),
            'tracking_status'          => $checkIn?->isPaused() ? 'paused' : ($checkIn ? 'active' : 'stopped'),
            'total_locations_recorded' => $gpsPoints->count(),
            'total_pause_duration'     => $route?->total_pause_duration ?? 0,
            'pause_count'              => $route?->pause_count ?? 0,
            'first_location_time'      => $gpsPoints->first()?->recorded_at?->format('H:i:s'),
            'last_location_time'       => $gpsPoints->last()?->recorded_at?->format('H:i:s'),
            'average_speed'            => $avgSpeed ? round((float) $avgSpeed, 2) : null,
            'max_speed'                => $maxSpeed ? round((float) $maxSpeed, 2) : null,
        ];
    }

    // ──────────────────────────────────────────────────────────────────────────
    // LIVE TRACKING
    // ──────────────────────────────────────────────────────────────────────────

    public function getLiveTrackingData(array $filters = []): array
    {
        try {
            $date = $filters['date'] ?? today();

            // Convert to Carbon if string
            if (is_string($date)) {
                $date = Carbon::parse($date);
            }

            $isToday = $date->isToday();

            $query = RiderGpsPoint::query()
                ->with(['rider.user', 'campaignAssignment.campaign'])
                ->join('rider_check_ins', 'rider_gps_points.check_in_id', '=', 'rider_check_ins.id')
                ->select('rider_gps_points.*');

            // rider_check_ins.status is started/paused/resumed/ended — 'active'
            // and 'completed' never exist, so the old version of this branch
            // always matched zero rows regardless of $isToday (see the fixed
            // sibling logic in getDashboardStats() above). For today, only
            // riders currently tracking (started/resumed) count as "live";
            // historical dates also include ended shifts.
            if ($isToday) {
                $query->whereIn('rider_check_ins.status', [RiderCheckIn::STATUS_STARTED, RiderCheckIn::STATUS_RESUMED]);
            } else {
                $query->whereIn('rider_check_ins.status', [RiderCheckIn::STATUS_STARTED, RiderCheckIn::STATUS_RESUMED, RiderCheckIn::STATUS_ENDED]);
            }

            // Without these, a shift stuck in started/resumed from a prior
            // day (e.g. rider-shifts:auto-close missed a day) surfaces its
            // last real GPS point as if it were "live" — a marker that never
            // moves because the rider stopped transmitting days ago. Scoping
            // both the check-in and its points to $date keeps "live" meaning
            // today only, never blended with historical days.
            $dateString = $date->toDateString();
            $query->whereDate('rider_check_ins.check_in_date', $dateString);
            $query->whereDate('rider_gps_points.recorded_at', $dateString);

            if (!empty($filters['campaign_id'])) {
                $query->whereHas(
                    'campaignAssignment',
                    fn($q) =>
                    $q->where('campaign_id', $filters['campaign_id'])
                );
            }

            if (!empty($filters['rider_ids']) && is_array($filters['rider_ids'])) {
                $query->whereIn('rider_gps_points.rider_id', $filters['rider_ids']);
            }

            // Get latest point per rider for this date
            $latestPoints = $query->get()
                ->groupBy('rider_id')
                ->map(fn($points) => $points->sortByDesc('recorded_at')->first())
                ->values();

            return [
                'active_riders'   => $latestPoints->count(),
                'locations'       => $latestPoints,
                'last_updated'    => now()->toIso8601String(),
                'filters_applied' => [
                    'date'        => $dateString,
                    'campaign_id' => $filters['campaign_id'] ?? null,
                    'is_today'    => $isToday,  // Debug info
                ],
            ];
        } catch (\Exception $e) {
            Log::error('Failed to get live tracking data', [
                'error'   => $e->getMessage(),
                'filters' => $filters,
                'trace'   => $e->getTraceAsString(),
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
     * Transform a RiderGpsPoint into the enriched array used by both
     * the Inertia page and the API. Every nested relationship access
     * is null-safe so missing rider / user / campaign never causes an error.
     */
    public function enrichLocation(RiderGpsPoint $gpsPoint): array
    {

        // dd($gpsPoint);
        $rider              = $gpsPoint->rider;
        $user               = $rider?->user;
        $campaignAssignment = $gpsPoint->campaignAssignment;
        $campaign           = $campaignAssignment?->campaign;
        $recordedAt         = $gpsPoint->recorded_at;

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
                'address'   => null,  // TODO: Add reverse geocoding if needed
            ],

            'campaign' => ($campaignAssignment && $campaign)
                ? [
                    'id'   => $campaignAssignment->campaign_id,
                    'name' => $campaign->name,
                ]
                : null,

            'recorded_at' => $recordedAt?->toIso8601String(),
            'time_ago'    => $recordedAt?->diffForHumans(),
            'is_recent'   => $gpsPoint->is_recent ?? false,

            // Also include flat properties for backward compatibility
            'latitude'  => $gpsPoint->latitude  !== null ? (float) $gpsPoint->latitude  : null,
            'longitude' => $gpsPoint->longitude !== null ? (float) $gpsPoint->longitude : null,
            'accuracy'  => $gpsPoint->accuracy  !== null ? (float) $gpsPoint->accuracy  : null,
            'speed'     => $gpsPoint->speed     !== null ? (float) $gpsPoint->speed     : null,
            'heading'   => $gpsPoint->heading   !== null ? (float) $gpsPoint->heading   : null,
            'address'   => null,  // TODO: Add reverse geocoding if needed
        ];
    }

    // ──────────────────────────────────────────────────────────────────────────
    // QUERY HELPERS
    // ──────────────────────────────────────────────────────────────────────────

    public function getRiderLocations(int $riderId, array $filters = [])
    {
        $query = RiderGpsPoint::where('rider_id', $riderId)
            ->with(['campaignAssignment.campaign']);

        if (!empty($filters['date_from'])) {
            $query->whereDate('recorded_at', '>=', $filters['date_from']);
        }

        if (!empty($filters['date_to'])) {
            $query->whereDate('recorded_at', '<=', $filters['date_to']);
        }

        if (empty($filters['date_from']) && empty($filters['date_to'])) {
            $query->whereDate('recorded_at', today());
        }

        $query->limit($filters['limit'] ?? 1000);

        return $query->orderBy('recorded_at')->get();
    }

    public function getCurrentLocation(int $riderId): ?RiderGpsPoint
    {
        return Cache::remember(
            "rider.{$riderId}.latest_gps_point",
            now()->addMinutes(5),
            fn() => RiderGpsPoint::where('rider_id', $riderId)
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

    // ──────────────────────────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Recomputes rider_routes.total_distance / avg_speed / max_speed from
     * real GPS deltas as new points arrive, instead of leaving them at their
     * seed-only default of 0 (the only place they were ever previously
     * written was the tracking test seeders). Walks $newPoints in
     * chronological order, chaining from $previousPoint (the last point
     * already on file), and sums each consecutive haversine segment — O(new
     * points) per call rather than re-summing the whole day's trail every
     * time, since a shift can accumulate thousands of points.
     *
     * Reuses RiderMovementAnalyzer::haversineKm() (also used for movement-based
     * pay) rather than a second haversine implementation.
     */
    private function updateRouteRecord(RiderCheckIn $checkIn, Collection $newPoints, ?RiderGpsPoint $previousPoint): void
    {
        if ($newPoints->isEmpty()) {
            return;
        }

        $route = RiderRoute::firstOrCreate(
            [
                'rider_id'    => $checkIn->rider_id,
                'check_in_id' => $checkIn->id,
                'route_date'  => today(),
            ],
            [
                'campaign_assignment_id' => $checkIn->campaign_assignment_id ?? null,
                'started_at'             => $checkIn->check_in_time,
            ]
        );

        $addedDistanceKm = 0.0;
        $maxSpeedKmh      = (float) ($route->max_speed ?? 0);
        $previous         = $previousPoint;

        foreach ($newPoints as $point) {
            if ($previous) {
                $minutes = $previous->recorded_at->diffInMinutes($point->recorded_at, false);

                if ($minutes > 0) {
                    $segmentKm = RiderMovementAnalyzer::haversineKm(
                        (float) $previous->latitude,
                        (float) $previous->longitude,
                        (float) $point->latitude,
                        (float) $point->longitude
                    );

                    $addedDistanceKm += $segmentKm;
                    $maxSpeedKmh = max($maxSpeedKmh, $segmentKm / ($minutes / 60));
                }
            }

            $previous = $point;
        }

        $totalDistanceKm = (float) $route->total_distance + $addedDistanceKm;

        $started       = $route->started_at ?? $checkIn->check_in_time;
        $elapsedHours  = max(1, $started->diffInMinutes($previous->recorded_at, false)) / 60;

        $route->increment('location_points_count', $newPoints->count());
        $route->update([
            'total_distance' => round($totalDistanceKm, 2),
            'avg_speed'      => round($totalDistanceKm / $elapsedHours, 2),
            'max_speed'      => round($maxSpeedKmh, 2),
        ]);

        $route->touch();
    }

    /**
     * Throws a precise error for why there's no active (tracking) check-in:
     * distinguishes "you haven't checked in" from "you're paused" so the
     * mobile app can show the rider something actionable.
     *
     * @throws \Exception
     */
    private function throwNoActiveCheckInError(int $riderId): never
    {
        $todayCheckIn = $this->getTodayCheckIn($riderId);

        if ($todayCheckIn && $todayCheckIn->isPaused()) {
            throw new \Exception('Location tracking is currently paused. Please resume to continue recording.');
        }

        throw new \Exception('No active check-in found for this rider');
    }

    /**
     * The rider's check-in for today that is actively tracking (started or
     * resumed) — excludes paused/ended. Used to gate GPS point recording.
     */
    private function getActiveCheckIn(int $riderId): ?RiderCheckIn
    {
        return Cache::remember(
            "rider.{$riderId}.active_checkin",
            now()->addMinutes(5),
            fn() => RiderCheckIn::where('rider_id', $riderId)
                ->tracking() // status in [started, resumed] — excludes paused/ended
                ->whereDate('check_in_date', today())
                ->latest()
                ->first()
        );
    }

    /**
     * The rider's check-in for today regardless of started/paused/resumed
     * (only excludes ended). Used by pause/resume, which must be able to
     * find a check-in that is currently paused.
     */
    private function getTodayCheckIn(int $riderId): ?RiderCheckIn
    {
        return RiderCheckIn::where('rider_id', $riderId)
            ->where('status', '!=', RiderCheckIn::STATUS_ENDED)
            ->whereDate('check_in_date', today())
            ->latest()
            ->first();
    }

    private function getTodayRoute(int $riderId): ?RiderRoute
    {
        return RiderRoute::where('rider_id', $riderId)
            ->whereDate('route_date', today())
            ->first();
    }
}
