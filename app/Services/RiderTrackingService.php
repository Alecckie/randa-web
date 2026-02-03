<?php
namespace App\Services;

use App\Models\RiderLocation;
use App\Models\RiderRoute;
use App\Models\RiderCheckIn;
use App\Events\RiderLocationUpdated;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class RiderTrackingService
{
    /**
     * Record a new location point for a rider
     */
    public function recordLocation(int $riderId, array $locationData): RiderLocation
    {
        // Get active check-in
        $checkIn = RiderCheckIn::where('rider_id', $riderId)
            ->where('status', 'active')
            ->latest()
            ->first();

        if (!$checkIn) {
            throw new \Exception('No active check-in found for this rider');
        }

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

        // Update route asynchronously
        dispatch(function () use ($checkIn, $location) {
            $this->updateRoute($checkIn, $location);
        })->afterResponse();

        // Reverse geocode asynchronously
        dispatch(function () use ($location) {
            $this->reverseGeocode($location);
        })->afterResponse();

        // Broadcast location update for real-time tracking
        broadcast(new RiderLocationUpdated($location))->toOthers();

        // Cache latest location
        Cache::put("rider.{$riderId}.latest_location", $location, now()->addHours(24));

        return $location;
    }

    /**
     * Batch record multiple location points
     */
    public function recordBatchLocations(int $riderId, array $locations): int
    {
        $checkIn = RiderCheckIn::where('rider_id', $riderId)
            ->where('status', 'active')
            ->latest()
            ->first();

        if (!$checkIn) {
            throw new \Exception('No active check-in found');
        }

        $records = collect($locations)->map(function ($loc) use ($riderId, $checkIn) {
            return [
                'rider_id' => $riderId,
                'check_in_id' => $checkIn->id,
                'campaign_assignment_id' => $checkIn->campaign_assignment_id,
                'latitude' => $loc['latitude'],
                'longitude' => $loc['longitude'],
                'accuracy' => $loc['accuracy'] ?? null,
                'speed' => $loc['speed'] ?? null,
                'recorded_at' => $loc['recorded_at'] ?? now(),
                'source' => $loc['source'] ?? 'mobile',
                'created_at' => now(),
                'updated_at' => now(),
            ];
        })->toArray();

        RiderLocation::insert($records);

        // Update route
        dispatch(function () use ($checkIn) {
            $this->recalculateRoute($checkIn);
        })->afterResponse();

        return count($records);
    }

    /**
     * Update or create route for a check-in
     */
    protected function updateRoute(RiderCheckIn $checkIn, RiderLocation $location): void
    {
         RiderRoute::firstOrCreate(
            [
                'rider_id' => $checkIn->rider_id,
                'check_in_id' => $checkIn->id,
                'route_date' => $checkIn->check_in_date,
            ],
            [
                'campaign_assignment_id' => $checkIn->campaign_assignment_id,
                'started_at' => $checkIn->check_in_time,
                'status' => 'active',
            ]
        );

        $this->recalculateRoute($checkIn);
    }

    /**
     * Recalculate route statistics
     */
    public function recalculateRoute(RiderCheckIn $checkIn): void
    {
        $locations = RiderLocation::where('check_in_id', $checkIn->id)
            ->orderBy('recorded_at')
            ->get();

        if ($locations->count() < 2) {
            return;
        }

        $totalDistance = 0;
        $speeds = [];
        $coverageAreas = [];

        for ($i = 1; $i < $locations->count(); $i++) {
            $prev = $locations[$i - 1];
            $current = $locations[$i];

            // Calculate distance using Haversine formula
            $distance = $this->calculateDistance(
                $prev->latitude,
                $prev->longitude,
                $current->latitude,
                $current->longitude
            );

            $totalDistance += $distance;

            if ($current->speed) {
                $speeds[] = $current->speed;
            }

            // Track coverage areas
            if ($current->ward_id && !in_array($current->ward_id, $coverageAreas)) {
                $coverageAreas[] = $current->ward_id;
            }
        }

        $route = RiderRoute::where('check_in_id', $checkIn->id)->first();
        
        if ($route) {
            $route->update([
                'total_distance' => $totalDistance,
                'total_duration' => $locations->last()->recorded_at->diffInMinutes($locations->first()->recorded_at),
                'location_points_count' => $locations->count(),
                'coverage_areas' => $coverageAreas,
                'avg_speed' => count($speeds) > 0 ? array_sum($speeds) / count($speeds) : null,
                'max_speed' => count($speeds) > 0 ? max($speeds) : null,
                'route_polyline' => $this->encodePolyline($locations),
            ]);
        }
    }

    /**
     * Calculate distance between two coordinates (Haversine formula)
     */
    protected function calculateDistance($lat1, $lon1, $lat2, $lon2): float
    {
        $earthRadius = 6371; // km

        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);

        $a = sin($dLat / 2) * sin($dLat / 2) +
            cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
            sin($dLon / 2) * sin($dLon / 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $earthRadius * $c;
    }

    /**
     * Encode locations as polyline
     */
    protected function encodePolyline($locations): string
    {
        $points = $locations->map(fn($loc) => [$loc->latitude, $loc->longitude])->toArray();
        return \Polyline::encode($points);
    }

    /**
     * Reverse geocode location (get address from coordinates)
     */
    protected function reverseGeocode(RiderLocation $location): void
    {
        // Implement reverse geocoding using a service
        // This is a placeholder - implement based on your chosen service
    }

    /**
     * Get rider's current location
     */
    public function getCurrentLocation(int $riderId): ?RiderLocation
    {
        return Cache::remember(
            "rider.{$riderId}.latest_location",
            now()->addMinutes(5),
            fn() => RiderLocation::where('rider_id', $riderId)
                ->latest('recorded_at')
                ->first()
        );
    }

    /**
     * Get rider's route for a specific date
     */
    public function getRiderRoute(int $riderId, Carbon $date): ?array
    {
        $route = RiderRoute::where('rider_id', $riderId)
            ->whereDate('route_date', $date)
            ->with('locations')
            ->first();

        if (!$route) {
            return null;
        }

        return [
            'route' => $route,
            'locations' => $route->locations()->orderBy('recorded_at')->get(),
            'summary' => [
                'distance' => $route->total_distance,
                'duration' => $route->total_duration,
                'avg_speed' => $route->avg_speed,
                'coverage_areas_count' => count($route->coverage_areas ?? []),
            ],
        ];
    }

    /**
     * Get live tracking data for admin dashboard
     */
    public function getLiveTrackingData(array $filters = []): array
    {
        $query = RiderLocation::query()
            ->select('rider_locations.*')
            ->join('rider_check_ins', 'rider_locations.check_in_id', '=', 'rider_check_ins.id')
            ->where('rider_check_ins.status', 'active')
            ->whereDate('rider_locations.recorded_at', today());

        // Apply filters
        if (!empty($filters['campaign_id'])) {
            $query->join('campaign_assignments', 'rider_locations.campaign_assignment_id', '=', 'campaign_assignments.id')
                ->where('campaign_assignments.campaign_id', $filters['campaign_id']);
        }

        if (!empty($filters['rider_ids'])) {
            $query->whereIn('rider_locations.rider_id', $filters['rider_ids']);
        }

        // Get latest location for each rider
        $locations = $query->get()
            ->groupBy('rider_id')
            ->map(fn($group) => $group->sortByDesc('recorded_at')->first())
            ->values();

        return [
            'active_riders' => $locations->count(),
            'locations' => $locations,
            'last_updated' => now()->toIso8601String(),
        ];
    }
}