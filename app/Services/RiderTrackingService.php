<?php

namespace App\Services;

use App\Models\RiderGpsPoint;
use App\Models\RiderCheckIn;
use App\Models\RiderRoute;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class RiderTrackingService
{
    // ──────────────────────────────────────────────────────────────────────────
    // GPS RECORDING
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Record a new GPS point for a rider.
     */
    public function recordLocation(int $riderId, array $locationData): RiderGpsPoint
    {
        try {
            $checkIn = $this->getActiveCheckIn($riderId);

            if (!$checkIn) {
                throw new \Exception('No active check-in found for this rider');
            }

            $route = $this->getTodayRoute($riderId);

            if ($route && $route->tracking_status === 'paused') {
                throw new \Exception('Location tracking is currently paused. Please resume to continue recording.');
            }

            $gpsPoint = RiderGpsPoint::create([
                'rider_id'               => $riderId,
                'check_in_id'            => $checkIn->id,
                'campaign_assignment_id' => $checkIn->campaign_assignment_id,
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

            $this->updateRouteRecord($checkIn, $gpsPoint);

            Cache::put("rider.{$riderId}.latest_gps_point", $gpsPoint, now()->addHours(24));

            Log::info('GPS point recorded', [
                'rider_id'    => $riderId,
                'gps_point_id' => $gpsPoint->id,
                'lat'         => $gpsPoint->latitude,
                'lng'         => $gpsPoint->longitude,
            ]);

            return $gpsPoint;

        } catch (\Exception $e) {
            Log::error('Failed to record GPS point', ['rider_id' => $riderId, 'error' => $e->getMessage()]);
            throw $e;
        }
    }

    /**
     * Batch-record multiple GPS points.
     */
    public function recordBatchLocations(int $riderId, array $locations): int
    {
        try {
            $checkIn = $this->getActiveCheckIn($riderId);

            if (!$checkIn) {
                throw new \Exception('No active check-in found');
            }

            $records = collect($locations)->map(fn($loc) => [
                'rider_id'               => $riderId,
                'check_in_id'            => $checkIn->id,
                'campaign_assignment_id' => $checkIn->campaign_assignment_id,
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
                $lastPoint = RiderGpsPoint::where('check_in_id', $checkIn->id)
                    ->latest('recorded_at')
                    ->first();

                if ($lastPoint) {
                    $this->updateRouteRecord($checkIn, $lastPoint);
                }
            }

            Log::info('Batch GPS points recorded', ['rider_id' => $riderId, 'count' => $count]);

            return $count;

        } catch (\Exception $e) {
            Log::error('Failed to record batch GPS points', ['rider_id' => $riderId, 'error' => $e->getMessage()]);
            throw $e;
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // TRACKING PAUSE / RESUME
    // ──────────────────────────────────────────────────────────────────────────

    public function pauseTracking(int $riderId): RiderRoute
    {
        try {
            DB::beginTransaction();

            $checkIn = $this->getActiveCheckIn($riderId);

            if (!$checkIn) {
                throw new \Exception('No active check-in found');
            }

            $route = RiderRoute::firstOrCreate(
                ['rider_id' => $riderId, 'check_in_id' => $checkIn->id, 'route_date' => today()],
                [
                    'campaign_assignment_id' => $checkIn->campaign_assignment_id,
                    'started_at'             => $checkIn->check_in_time,
                    'status'                 => 'active',
                    'tracking_status'        => 'active',
                ]
            );

            if ($route->tracking_status === 'paused') {
                throw new \Exception('Tracking is already paused');
            }

            $route->update(['tracking_status' => 'paused', 'last_paused_at' => now()]);

            $pauseHistory   = $route->pause_history ?? [];
            $pauseHistory[] = [
                'paused_at' => now()->toIso8601String(),
                'location'  => $this->getCurrentLocation($riderId)?->only(['latitude', 'longitude']),
            ];

            $route->update(['pause_history' => $pauseHistory]);

            DB::commit();

            return $route->fresh();

        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    public function resumeTracking(int $riderId): RiderRoute
    {
        try {
            DB::beginTransaction();

            $checkIn = $this->getActiveCheckIn($riderId);

            if (!$checkIn) {
                throw new \Exception('No active check-in found');
            }

            $route = $this->getTodayRoute($riderId);

            if (!$route) {
                throw new \Exception('No route found to resume');
            }

            if ($route->tracking_status === 'active') {
                throw new \Exception('Tracking is already active');
            }

            $pauseDuration      = $route->last_paused_at ? now()->diffInMinutes($route->last_paused_at) : 0;
            $totalPauseDuration = ($route->total_pause_duration ?? 0) + $pauseDuration;

            $route->update([
                'tracking_status'      => 'active',
                'last_resumed_at'      => now(),
                'total_pause_duration' => $totalPauseDuration,
            ]);

            $pauseHistory = $route->pause_history ?? [];
            if (!empty($pauseHistory)) {
                $lastPause                      = &$pauseHistory[count($pauseHistory) - 1];
                $lastPause['resumed_at']        = now()->toIso8601String();
                $lastPause['duration_minutes']  = $pauseDuration;
            }

            $route->update(['pause_history' => $pauseHistory]);

            DB::commit();

            return $route->fresh();

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
        $checkIn = $this->getActiveCheckIn($riderId);

        if (!$checkIn) {
            return [
                'is_active'       => false,
                'tracking_status' => 'stopped',
                'message'         => 'No active check-in found',
            ];
        }

        $route = $this->getTodayRoute($riderId);

        if (!$route) {
            return [
                'is_active'       => true,
                'tracking_status' => 'active',
                'check_in_time'   => $checkIn->check_in_time->toIso8601String(),
                'message'         => 'Checked in, tracking active',
            ];
        }

        return [
            'is_active'            => true,
            'tracking_status'      => $route->tracking_status ?? 'active',
            'check_in_time'        => $checkIn->check_in_time->toIso8601String(),
            'last_paused_at'       => $route->last_paused_at?->toIso8601String(),
            'last_resumed_at'      => $route->last_resumed_at?->toIso8601String(),
            'total_pause_duration' => $route->total_pause_duration ?? 0,
            'locations_recorded'   => $route->location_points_count ?? 0,
            'message'              => $route->tracking_status === 'paused' ? 'Tracking paused' : 'Tracking active',
        ];
    }

    /**
     * Get dashboard statistics for the tracking overview page.
     *
     * Returns the shape expected by the TrackingStats React component:
     *   active_riders, total_distance, total_locations,
     *   active_campaigns, avg_speed, coverage_areas
     *
     * @param  string  $period  'today' | 'week' | 'month'
     */
    public function getDashboardStats(string $period = 'today'): array
    {
        $dateFilter = match ($period) {
            'week'  => now()->subDays(7),
            'month' => now()->subDays(30),
            default => today(),
        };

        // Riders with an active check-in today (always "today" regardless of period)
        $activeRiders = DB::table('rider_check_ins')
            ->where('status', 'active')
            ->whereDate('check_in_date', today())
            ->count();

        $totalDistance = RiderRoute::where('route_date', '>=', $dateFilter)
            ->sum('total_distance');

        $totalLocations = RiderGpsPoint::where('recorded_at', '>=', $dateFilter)
            ->count();

        // Active campaigns that have at least one rider checked in today
        $activeCampaigns = DB::table('campaigns')
            ->join('campaign_assignments', 'campaigns.id', '=', 'campaign_assignments.campaign_id')
            ->join('rider_check_ins', 'campaign_assignments.id', '=', 'rider_check_ins.campaign_assignment_id')
            ->where('campaigns.status', 'active')
            ->where('rider_check_ins.status', 'active')
            ->whereDate('rider_check_ins.check_in_date', today())
            ->distinct('campaigns.id')
            ->count('campaigns.id');

        $avgSpeed = RiderRoute::where('route_date', '>=', $dateFilter)
            ->whereNotNull('avg_speed')
            ->avg('avg_speed');

        // coverage_areas is a JSON array cast on RiderRoute; flatten & deduplicate in PHP.
        // For large datasets, consider a DB-native JSON query or a pivot table instead.
        $coverageAreas = RiderRoute::where('route_date', '>=', $dateFilter)
            ->whereNotNull('coverage_areas')
            ->pluck('coverage_areas')
            ->flatten()
            ->unique()
            ->count();

        return [
            'active_riders'    => $activeRiders,
            'total_distance'   => round((float) $totalDistance, 2),
            'total_locations'  => $totalLocations,
            'active_campaigns' => $activeCampaigns,
            'avg_speed'        => $avgSpeed ? round((float) $avgSpeed, 2) : 0.0,
            'coverage_areas'   => $coverageAreas,
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

        $route = $this->getTodayRoute($riderId);

        return [
            'date'                    => $date->toDateString(),
            'checked_in'              => (bool) $checkIn,
            'check_in_time'           => $checkIn?->check_in_time?->format('H:i:s'),
            'check_out_time'          => $checkIn?->check_out_time?->format('H:i:s'),
            'tracking_status'         => $route?->tracking_status ?? 'stopped',
            'total_locations_recorded' => $gpsPoints->count(),
            'total_pause_duration'    => $route?->total_pause_duration ?? 0,
            'pause_count'             => count($route?->pause_history ?? []),
            'first_location_time'     => $gpsPoints->first()?->recorded_at?->format('H:i:s'),
            'last_location_time'      => $gpsPoints->last()?->recorded_at?->format('H:i:s'),
            'average_speed'           => $gpsPoints->avg('speed') ? round($gpsPoints->avg('speed'), 2) : null,
            'max_speed'               => $gpsPoints->max('speed') ? round($gpsPoints->max('speed'), 2) : null,
        ];
    }

    // ──────────────────────────────────────────────────────────────────────────
    // LIVE TRACKING
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Return raw live-tracking data (latest GPS point per active rider).
     *
     * Controllers should call enrichLocation() on each item before returning
     * to the client, so presentation logic stays out of the service.
     */
    public function getLiveTrackingData(array $filters = []): array
    {
        try {
            $query = RiderGpsPoint::query()
                ->with(['rider.user', 'campaignAssignment.campaign'])
                ->join('rider_check_ins', 'rider_gps_points.check_in_id', '=', 'rider_check_ins.id')
                ->where('rider_check_ins.status', 'active')
                ->select('rider_gps_points.*');

            $date = $filters['date'] ?? today();
            $query->whereDate('rider_gps_points.recorded_at', $date);

            if (!empty($filters['campaign_id'])) {
                $query->whereHas('campaignAssignment', fn($q) =>
                    $q->where('campaign_id', $filters['campaign_id'])
                );
            }

            if (!empty($filters['rider_ids']) && is_array($filters['rider_ids'])) {
                $query->whereIn('rider_gps_points.rider_id', $filters['rider_ids']);
            }

            $latestPoints = $query->get()
                ->groupBy('rider_id')
                ->map(fn($points) => $points->sortByDesc('recorded_at')->first())
                ->values();

            return [
                'active_riders' => $latestPoints->count(),
                'locations'     => $latestPoints,
                'last_updated'  => now()->toIso8601String(),
                'filters_applied' => [
                    'date'        => ($date instanceof \Carbon\Carbon ? $date : Carbon::parse($date))->toDateString(),
                    'campaign_id' => $filters['campaign_id'] ?? null,
                ],
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
     * Transform a single RiderGpsPoint model into the enriched array shape
     * used by both the Inertia page (via TrackingController) and the API
     * (via AdminTrackingController).  Keeping this in the service means
     * neither controller needs to know about the transformation.
     */
    public function enrichLocation(RiderGpsPoint $gpsPoint): array
    {
        return [
            'id'     => $gpsPoint->id,
            'rider_id' => $gpsPoint->rider_id,
            'rider'  => [
                'id'     => $gpsPoint->rider->id,
                'name'   => $gpsPoint->rider->user->name,
                'phone'  => $gpsPoint->rider->user->phone,
                'status' => $gpsPoint->rider->status,
            ],
            'location' => [
                'latitude'  => (float) $gpsPoint->latitude,
                'longitude' => (float) $gpsPoint->longitude,
                'accuracy'  => $gpsPoint->accuracy ? (float) $gpsPoint->accuracy : null,
                'speed'     => $gpsPoint->speed    ? (float) $gpsPoint->speed    : null,
                'heading'   => $gpsPoint->heading  ? (float) $gpsPoint->heading  : null,
            ],
            'campaign'    => $gpsPoint->campaignAssignment ? [
                'id'   => $gpsPoint->campaignAssignment->campaign_id,
                'name' => $gpsPoint->campaignAssignment->campaign->name,
            ] : null,
            'recorded_at' => $gpsPoint->recorded_at->toIso8601String(),
            'time_ago'    => $gpsPoint->recorded_at->diffForHumans(),
            'is_recent'   => $gpsPoint->is_recent,
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

    private function updateRouteRecord(RiderCheckIn $checkIn, RiderGpsPoint $gpsPoint): void
    {
        $route = RiderRoute::firstOrCreate(
            ['rider_id' => $checkIn->rider_id, 'check_in_id' => $checkIn->id, 'route_date' => today()],
            [
                'campaign_assignment_id' => $checkIn->campaign_assignment_id,
                'started_at'             => $checkIn->check_in_time,
                'status'                 => 'active',
                'tracking_status'        => 'active',
            ]
        );

        $route->increment('location_points_count');
        $route->touch();
    }

    private function getActiveCheckIn(int $riderId): ?RiderCheckIn
    {
        return Cache::remember(
            "rider.{$riderId}.active_checkin",
            now()->addMinutes(5),
            fn() => RiderCheckIn::where('rider_id', $riderId)
                ->where('status', 'active')
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
}