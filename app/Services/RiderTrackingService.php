<?php

namespace App\Services;

use App\Models\RiderLocation;
use App\Models\RiderCheckIn;
use App\Models\RiderRoute;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

/**
 * Rider Tracking Service
 * 
 * Handles all location tracking operations with database persistence
 * Maintains pause/resume state for accurate record keeping
 */
class RiderTrackingService
{
    /**
     * Record a new location point for a rider
     * 
     * @param int $riderId
     * @param array $locationData
     * @return RiderLocation
     * @throws \Exception
     */
    public function recordLocation(int $riderId, array $locationData): RiderLocation
    {
        try {
            // Get active check-in
            $checkIn = $this->getActiveCheckIn($riderId);

            if (!$checkIn) {
                throw new \Exception('No active check-in found for this rider');
            }

            // Check if tracking is paused
            $route = $this->getTodayRoute($riderId);
            
            if ($route && $route->tracking_status === 'paused') {
                throw new \Exception('Location tracking is currently paused. Please resume to continue recording.');
            }

            // Create location record
            $location = RiderLocation::create([
                'rider_id' => $riderId,
                'check_in_id' => $checkIn->id,
                'campaign_assignment_id' => $checkIn->campaign_assignment_id,
                'latitude' => $locationData['latitude'],
                'longitude' => $locationData['longitude'],
                'accuracy' => $locationData['accuracy'] ?? null,
                'altitude' => $locationData['altitude'] ?? null,
                'speed' => $locationData['speed'] ?? null,
                'heading' => $locationData['heading'] ?? null,
                'recorded_at' => $locationData['recorded_at'] ?? now(),
                'source' => $locationData['source'] ?? 'mobile',
                'metadata' => $locationData['metadata'] ?? null,
            ]);

            // Update or create route record
            $this->updateRouteRecord($checkIn, $location);

            // Update cache with latest location
            Cache::put(
                "rider.{$riderId}.latest_location",
                $location,
                now()->addHours(24)
            );

            Log::info("Location recorded", [
                'rider_id' => $riderId,
                'location_id' => $location->id,
                'lat' => $location->latitude,
                'lng' => $location->longitude,
            ]);

            return $location;

        } catch (\Exception $e) {
            Log::error("Failed to record location", [
                'rider_id' => $riderId,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Batch record multiple location points
     * 
     * @param int $riderId
     * @param array $locations
     * @return int Number of locations recorded
     * @throws \Exception
     */
    public function recordBatchLocations(int $riderId, array $locations): int
    {
        try {
            $checkIn = $this->getActiveCheckIn($riderId);

            if (!$checkIn) {
                throw new \Exception('No active check-in found');
            }

            // Prepare records for bulk insert
            $records = collect($locations)->map(function ($loc) use ($riderId, $checkIn) {
                return [
                    'rider_id' => $riderId,
                    'check_in_id' => $checkIn->id,
                    'campaign_assignment_id' => $checkIn->campaign_assignment_id,
                    'latitude' => $loc['latitude'],
                    'longitude' => $loc['longitude'],
                    'accuracy' => $loc['accuracy'] ?? null,
                    'altitude' => $loc['altitude'] ?? null,
                    'speed' => $loc['speed'] ?? null,
                    'heading' => $loc['heading'] ?? null,
                    'recorded_at' => $loc['recorded_at'] ?? now(),
                    'source' => $loc['source'] ?? 'mobile',
                    'metadata' => isset($loc['metadata']) ? json_encode($loc['metadata']) : null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            })->toArray();

            // Bulk insert
            RiderLocation::insert($records);

            $count = count($records);

            // Update route with latest location
            if ($count > 0) {
                $lastLocation = RiderLocation::where('check_in_id', $checkIn->id)
                    ->latest('recorded_at')
                    ->first();
                    
                if ($lastLocation) {
                    $this->updateRouteRecord($checkIn, $lastLocation);
                }
            }

            Log::info("Batch locations recorded", [
                'rider_id' => $riderId,
                'count' => $count,
            ]);

            return $count;

        } catch (\Exception $e) {
            Log::error("Failed to record batch locations", [
                'rider_id' => $riderId,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Pause location tracking
     * Records pause event in database for record keeping
     * 
     * @param int $riderId
     * @return RiderRoute
     * @throws \Exception
     */
    public function pauseTracking(int $riderId): RiderRoute
    {
        try {
            DB::beginTransaction();

            $checkIn = $this->getActiveCheckIn($riderId);

            if (!$checkIn) {
                throw new \Exception('No active check-in found');
            }

            // Get or create today's route
            $route = RiderRoute::firstOrCreate(
                [
                    'rider_id' => $riderId,
                    'check_in_id' => $checkIn->id,
                    'route_date' => today(),
                ],
                [
                    'campaign_assignment_id' => $checkIn->campaign_assignment_id,
                    'started_at' => $checkIn->check_in_time,
                    'status' => 'active',
                    'tracking_status' => 'active',
                ]
            );

            // Check if already paused
            if ($route->tracking_status === 'paused') {
                throw new \Exception('Tracking is already paused');
            }

            // Update route status
            $route->update([
                'tracking_status' => 'paused',
                'last_paused_at' => now(),
            ]);

            // Record pause event in metadata
            $pauseHistory = $route->pause_history ?? [];
            $pauseHistory[] = [
                'paused_at' => now()->toIso8601String(),
                'location' => $this->getCurrentLocation($riderId)?->only(['latitude', 'longitude']),
            ];

            $route->update(['pause_history' => $pauseHistory]);

            DB::commit();

            Log::info("Tracking paused", [
                'rider_id' => $riderId,
                'route_id' => $route->id,
            ]);

            return $route->fresh();

        } catch (\Exception $e) {
            DB::rollBack();
            
            Log::error("Failed to pause tracking", [
                'rider_id' => $riderId,
                'error' => $e->getMessage(),
            ]);
            
            throw $e;
        }
    }

    /**
     * Resume location tracking
     * Records resume event in database for record keeping
     * 
     * @param int $riderId
     * @return RiderRoute
     * @throws \Exception
     */
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

            // Check if already active
            if ($route->tracking_status === 'active') {
                throw new \Exception('Tracking is already active');
            }

            // Calculate pause duration
            $pauseDuration = $route->last_paused_at 
                ? now()->diffInMinutes($route->last_paused_at)
                : 0;

            // Update total pause duration
            $totalPauseDuration = ($route->total_pause_duration ?? 0) + $pauseDuration;

            // Update route status
            $route->update([
                'tracking_status' => 'active',
                'last_resumed_at' => now(),
                'total_pause_duration' => $totalPauseDuration,
            ]);

            // Record resume event in metadata
            $pauseHistory = $route->pause_history ?? [];
            if (!empty($pauseHistory)) {
                $lastPause = &$pauseHistory[count($pauseHistory) - 1];
                $lastPause['resumed_at'] = now()->toIso8601String();
                $lastPause['duration_minutes'] = $pauseDuration;
            }

            $route->update(['pause_history' => $pauseHistory]);

            DB::commit();

            Log::info("Tracking resumed", [
                'rider_id' => $riderId,
                'route_id' => $route->id,
                'pause_duration_minutes' => $pauseDuration,
            ]);

            return $route->fresh();

        } catch (\Exception $e) {
            DB::rollBack();
            
            Log::error("Failed to resume tracking", [
                'rider_id' => $riderId,
                'error' => $e->getMessage(),
            ]);
            
            throw $e;
        }
    }

    /**
     * Get tracking status for a rider
     * 
     * @param int $riderId
     * @return array
     */
    public function getTrackingStatus(int $riderId): array
    {
        $checkIn = $this->getActiveCheckIn($riderId);
        
        if (!$checkIn) {
            return [
                'is_active' => false,
                'tracking_status' => 'stopped',
                'message' => 'No active check-in found',
            ];
        }

        $route = $this->getTodayRoute($riderId);

        if (!$route) {
            return [
                'is_active' => true,
                'tracking_status' => 'active',
                'check_in_time' => $checkIn->check_in_time->toIso8601String(),
                'message' => 'Checked in, tracking active',
            ];
        }

        return [
            'is_active' => true,
            'tracking_status' => $route->tracking_status ?? 'active',
            'check_in_time' => $checkIn->check_in_time->toIso8601String(),
            'last_paused_at' => $route->last_paused_at?->toIso8601String(),
            'last_resumed_at' => $route->last_resumed_at?->toIso8601String(),
            'total_pause_duration' => $route->total_pause_duration ?? 0,
            'locations_recorded' => $route->location_points_count ?? 0,
            'message' => $route->tracking_status === 'paused' 
                ? 'Tracking paused' 
                : 'Tracking active',
        ];
    }

    /**
     * Update or create route record
     * 
     * @param RiderCheckIn $checkIn
     * @param RiderLocation $location
     * @return void
     */
    private function updateRouteRecord(RiderCheckIn $checkIn, RiderLocation $location): void
    {
        $route = RiderRoute::firstOrCreate(
            [
                'rider_id' => $checkIn->rider_id,
                'check_in_id' => $checkIn->id,
                'route_date' => today(),
            ],
            [
                'campaign_assignment_id' => $checkIn->campaign_assignment_id,
                'started_at' => $checkIn->check_in_time,
                'status' => 'active',
                'tracking_status' => 'active',
            ]
        );

        // Update location count
        $route->increment('location_points_count');
        $route->update(['updated_at' => now()]);
    }

    /**
     * Get active check-in for a rider
     * 
     * @param int $riderId
     * @return RiderCheckIn|null
     */
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

    /**
     * Get today's route for a rider
     * 
     * @param int $riderId
     * @return RiderRoute|null
     */
    private function getTodayRoute(int $riderId): ?RiderRoute
    {
        return RiderRoute::where('rider_id', $riderId)
            ->whereDate('route_date', today())
            ->first();
    }

    /**
     * Get rider's current/latest location
     * 
     * @param int $riderId
     * @return RiderLocation|null
     */
    public function getCurrentLocation(int $riderId): ?RiderLocation
    {
        return Cache::remember(
            "rider.{$riderId}.latest_location",
            now()->addMinutes(5),
            fn() => RiderLocation::where('rider_id', $riderId)
                ->with(['rider.user'])
                ->latest('recorded_at')
                ->first()
        );
    }

    /**
     * Get rider's locations for a specific date range
     * 
     * @param int $riderId
     * @param array $filters
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public function getRiderLocations(int $riderId, array $filters = [])
    {
        $query = RiderLocation::where('rider_id', $riderId)
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

        $limit = $filters['limit'] ?? 1000;
        $query->limit($limit);

        return $query->orderBy('recorded_at')->get();
    }

    /**
     * Get rider's tracking statistics
     * 
     * @param int $riderId
     * @param Carbon|null $date
     * @return array
     */
    public function getRiderStats(int $riderId, ?Carbon $date = null): array
    {
        $date = $date ?? today();

        $locations = RiderLocation::where('rider_id', $riderId)
            ->whereDate('recorded_at', $date)
            ->get();

        $checkIn = RiderCheckIn::where('rider_id', $riderId)
            ->whereDate('check_in_date', $date)
            ->first();

        $route = $this->getTodayRoute($riderId);

        return [
            'date' => $date->toDateString(),
            'checked_in' => $checkIn ? true : false,
            'check_in_time' => $checkIn?->check_in_time?->format('H:i:s'),
            'check_out_time' => $checkIn?->check_out_time?->format('H:i:s'),
            'tracking_status' => $route?->tracking_status ?? 'stopped',
            'total_locations_recorded' => $locations->count(),
            'total_pause_duration' => $route?->total_pause_duration ?? 0,
            'pause_count' => count($route?->pause_history ?? []),
            'first_location_time' => $locations->first()?->recorded_at?->format('H:i:s'),
            'last_location_time' => $locations->last()?->recorded_at?->format('H:i:s'),
            'average_speed' => $locations->avg('speed') ? round($locations->avg('speed'), 2) : null,
            'max_speed' => $locations->max('speed') ? round($locations->max('speed'), 2) : null,
        ];
    }

    /**
     * Get live tracking data for admin dashboard
     * 
     * @param array $filters
     * @return array
     */
    public function getLiveTrackingData(array $filters = []): array
    {
        try {
            $query = RiderLocation::query()
                ->with(['rider.user', 'campaignAssignment.campaign'])
                ->join('rider_check_ins', 'rider_locations.check_in_id', '=', 'rider_check_ins.id')
                ->where('rider_check_ins.status', 'active')
                ->select('rider_locations.*');

            $date = $filters['date'] ?? today();
            $query->whereDate('rider_locations.recorded_at', $date);

            if (!empty($filters['campaign_id'])) {
                $query->whereHas('campaignAssignment', function ($q) use ($filters) {
                    $q->where('campaign_id', $filters['campaign_id']);
                });
            }

            if (!empty($filters['rider_ids']) && is_array($filters['rider_ids'])) {
                $query->whereIn('rider_locations.rider_id', $filters['rider_ids']);
            }

            $allLocations = $query->get();

            $latestLocations = $allLocations
                ->groupBy('rider_id')
                ->map(function ($locations) {
                    return $locations->sortByDesc('recorded_at')->first();
                })
                ->values();

            return [
                'active_riders' => $latestLocations->count(),
                'locations' => $latestLocations,
                'last_updated' => now()->toIso8601String(),
                'filters_applied' => [
                    'date' => $date->toDateString(),
                    'campaign_id' => $filters['campaign_id'] ?? null,
                ],
            ];

        } catch (\Exception $e) {
            Log::error("Failed to get live tracking data", [
                'error' => $e->getMessage(),
                'filters' => $filters,
            ]);

            return [
                'active_riders' => 0,
                'locations' => collect([]),
                'last_updated' => now()->toIso8601String(),
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Clear rider location cache
     * 
     * @param int $riderId
     * @return void
     */
    public function clearRiderCache(int $riderId): void
    {
        Cache::forget("rider.{$riderId}.latest_location");
        Cache::forget("rider.{$riderId}.active_checkin");
    }
}