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

            $this->updateRouteRecord($checkIn, $gpsPoint);

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
                throw new \Exception('No active check-in found');
            }

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
                $lastPoint = RiderGpsPoint::where('check_in_id', $checkIn->id)
                    ->latest('recorded_at')
                    ->first();

                if ($lastPoint) {
                    $this->updateRouteRecord($checkIn, $lastPoint);
                }
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
                    'campaign_assignment_id' => $checkIn->campaign_assignment_id ?? null,
                    'started_at'             => $checkIn->check_in_time,
                    'status'                 => 'active',
                    'tracking_status'        => 'active',
                ]
            );

            if ($route->tracking_status === 'paused') {
                throw new \Exception('Tracking is already paused');
            }

            $route->update(['tracking_status' => 'paused', 'last_paused_at' => now()]);

            $currentLocation = $this->getCurrentLocation($riderId);

            $pauseHistory   = $route->pause_history ?? [];
            $pauseHistory[] = [
                'paused_at' => now()->toIso8601String(),
                'location'  => $currentLocation
                    ? [
                        'latitude'  => $currentLocation->latitude,
                        'longitude' => $currentLocation->longitude,
                    ]
                    : null,
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

            $pauseDuration      = $route->last_paused_at
                ? now()->diffInMinutes($route->last_paused_at)
                : 0;
            $totalPauseDuration = ($route->total_pause_duration ?? 0) + $pauseDuration;

            $route->update([
                'tracking_status'      => 'active',
                'last_resumed_at'      => now(),
                'total_pause_duration' => $totalPauseDuration,
            ]);

            // Avoid reference bugs by using index-based access instead of &$ref
            $pauseHistory = $route->pause_history ?? [];
            if (!empty($pauseHistory)) {
                $lastIndex                                    = count($pauseHistory) - 1;
                $pauseHistory[$lastIndex]['resumed_at']       = now()->toIso8601String();
                $pauseHistory[$lastIndex]['duration_minutes'] = $pauseDuration;
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
                'check_in_time'   => $checkIn->check_in_time?->toIso8601String(),
                'message'         => 'Checked in, tracking active',
            ];
        }

        return [
            'is_active'            => true,
            'tracking_status'      => $route->tracking_status ?? 'active',
            'check_in_time'        => $checkIn->check_in_time?->toIso8601String(),
            'last_paused_at'       => $route->last_paused_at?->toIso8601String(),
            'last_resumed_at'      => $route->last_resumed_at?->toIso8601String(),
            'total_pause_duration' => $route->total_pause_duration ?? 0,
            'locations_recorded'   => $route->location_points_count ?? 0,
            'message'              => $route->tracking_status === 'paused'
                ? 'Tracking paused'
                : 'Tracking active',
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

        $activeRiders = DB::table('rider_check_ins')
            ->where('status', 'active')
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
            ->where('rider_check_ins.status', 'active')
            ->whereDate('rider_check_ins.check_in_date', today())
            ->distinct('campaigns.id')
            ->count('campaigns.id');

        $avgSpeed = RiderRoute::where('route_date', '>=', $dateFilter)
            ->whereNotNull('avg_speed')
            ->avg('avg_speed');

        $coverageAreas = RiderRoute::where('route_date', '>=', $dateFilter)
            ->whereNotNull('coverage_areas')
            ->pluck('coverage_areas')
            ->flatten()
            ->unique()
            ->count();

        return [
            'active_riders'    => $activeRiders ?? 0,
            'total_distance'   => round((float) ($totalDistance ?? 0), 2),
            'total_locations'  => $totalLocations ?? 0,
            'active_campaigns' => $activeCampaigns ?? 0,
            'avg_speed'        => $avgSpeed ? round((float) $avgSpeed, 2) : 0.0,
            'coverage_areas'   => $coverageAreas ?? 0,
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
            'tracking_status'          => $route?->tracking_status ?? 'stopped',
            'total_locations_recorded' => $gpsPoints->count(),
            'total_pause_duration'     => $route?->total_pause_duration ?? 0,
            'pause_count'              => count($route?->pause_history ?? []),
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

            // ✅ FIX: Check if viewing today or historical date
            // $isToday = $date->isToday();
            $isToday = false;

            $query = RiderGpsPoint::query()
                ->with(['rider.user', 'campaignAssignment.campaign'])
                ->join('rider_check_ins', 'rider_gps_points.check_in_id', '=', 'rider_check_ins.id')
                ->select('rider_gps_points.*');

            // ✅ FIX: For today, only active check-ins. For historical, include completed.
            if ($isToday) {
                $query->where('rider_check_ins.status', 'active');
            } else {
                // Allow both active and completed for historical dates
                $query->whereIn('rider_check_ins.status', ['active', 'completed']);
            }

            // $query->whereDate('rider_gps_points.recorded_at', $date);

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

            $dateString = $date->toDateString();

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

    private function updateRouteRecord(RiderCheckIn $checkIn, RiderGpsPoint $gpsPoint): void
    {
        $route = RiderRoute::firstOrCreate(
            [
                'rider_id'    => $checkIn->rider_id,
                'check_in_id' => $checkIn->id,
                'route_date'  => today(),
            ],
            [
                'campaign_assignment_id' => $checkIn->campaign_assignment_id ?? null,
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
