<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreBatchLocationRequest;
use App\Http\Requests\StoreLocationRequest;
use App\Services\RiderTrackingService;
use App\Services\RiderService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;
use Exception;

/**
 * Rider Location Tracking Controller (API for Mobile App)
 * 
 * Handles GPS location tracking for riders
 * Uses RiderGpsPoint model for tracking points
 */
class RiderTrackingController extends Controller
{
    public function __construct(
        private RiderTrackingService $trackingService,
        private RiderService $riderService
    ) {}

    /**
     * Record a single GPS location point
     * 
     * POST /api/rider/location
     */
    public function store(StoreLocationRequest $request): JsonResponse
    {
        try {
            $rider = $this->getRider();

            $locationData = [
                'latitude' => $request->latitude,
                'longitude' => $request->longitude,
                'accuracy' => $request->accuracy,
                'altitude' => $request->altitude,
                'speed' => $request->speed,
                'heading' => $request->heading,
                'recorded_at' => $request->recorded_at 
                    ? Carbon::parse($request->recorded_at) 
                    : now(),
                'source' => $this->getSource($request),
                'metadata' => $request->metadata,
            ];

            $gpsPoint = $this->trackingService->recordLocation($rider->id, $locationData);

            return $this->success([
                'gps_point_id' => $gpsPoint->id,
                'recorded_at' => $gpsPoint->recorded_at->toIso8601String(),
                'latitude' => (float) $gpsPoint->latitude,
                'longitude' => (float) $gpsPoint->longitude,
            ], 'Location recorded successfully', 201);

        } catch (Exception $e) {
            return $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    /**
     * Record multiple GPS location points in batch (offline sync)
     * 
     * POST /api/rider/locations/batch
     */
    public function storeBatch(StoreBatchLocationRequest $request): JsonResponse
    {
        try {
            $rider = $this->getRider();

            $count = $this->trackingService->recordBatchLocations(
                $rider->id, 
                $request->locations
            );

            return $this->success([
                'recorded_count' => $count,
                'timestamp' => now()->toIso8601String(),
            ], "{$count} locations recorded successfully", 201);

        } catch (Exception $e) {
            return $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    /**
     * Get rider's current/latest GPS location
     * 
     * GET /api/rider/location/current
     */
    public function current(): JsonResponse
    {
        try {
            $rider = $this->getRider();
            
            $gpsPoint = $this->trackingService->getCurrentLocation($rider->id);

            if (!$gpsPoint) {
                return $this->success(null, 'No location data found');
            }

            return $this->success([
                'id' => $gpsPoint->id,
                'latitude' => (float) $gpsPoint->latitude,
                'longitude' => (float) $gpsPoint->longitude,
                'accuracy' => $gpsPoint->accuracy ? (float) $gpsPoint->accuracy : null,
                'speed' => $gpsPoint->speed ? (float) $gpsPoint->speed : null,
                'heading' => $gpsPoint->heading ? (float) $gpsPoint->heading : null,
                'recorded_at' => $gpsPoint->recorded_at->toIso8601String(),
                'time_ago' => $gpsPoint->recorded_at->diffForHumans(),
                'is_recent' => $gpsPoint->is_recent,
            ]);

        } catch (Exception $e) {
            return $this->error($e->getMessage());
        }
    }

    /**
     * Get today's route summary
     * 
     * GET /api/rider/routes/today
     */
    public function getTodayRoute(): JsonResponse
    {
        try {
            $rider = $this->getRider();
            
            $stats = $this->trackingService->getRiderStats($rider->id, today());

            return $this->success([
                'date' => $stats['date'],
                'checked_in' => $stats['checked_in'],
                'check_in_time' => $stats['check_in_time'],
                'tracking_status' => $stats['tracking_status'],
                'total_locations_recorded' => $stats['total_locations_recorded'],
                'total_pause_duration' => $stats['total_pause_duration'],
                'average_speed' => $stats['average_speed'],
                'max_speed' => $stats['max_speed'],
            ]);

        } catch (Exception $e) {
            return $this->error($e->getMessage());
        }
    }

    /**
     * Get rider's route history
     * 
     * GET /api/rider/routes/history
     */
    public function getRouteHistory(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
            'limit' => 'nullable|integer|min:1|max:30',
        ]);

        try {
            $rider = $this->getRider();

            $filters = [
                'date_from' => $validated['date_from'] ?? now()->subDays(30),
                'date_to' => $validated['date_to'] ?? today(),
                'limit' => $validated['limit'] ?? 1000,
            ];

            $gpsPoints = $this->trackingService->getRiderLocations($rider->id, $filters);

            return $this->success([
                'count' => $gpsPoints->count(),
                'locations' => $gpsPoints->map(fn($point) => [
                    'id' => $point->id,
                    'latitude' => (float) $point->latitude,
                    'longitude' => (float) $point->longitude,
                    'speed' => $point->speed ? (float) $point->speed : null,
                    'recorded_at' => $point->recorded_at->toIso8601String(),
                ]),
            ]);

        } catch (Exception $e) {
            return $this->error($e->getMessage());
        }
    }

    /**
     * Get specific route details
     * 
     * GET /api/rider/routes/{routeId}
     */
    public function getRouteDetails(int $routeId): JsonResponse
    {
        try {
            $rider = $this->getRider();
            
            // Implementation depends on your RiderRoute relationship
            // For now, return basic route info
            
            return $this->success([
                'message' => 'Route details feature coming soon'
            ]);

        } catch (Exception $e) {
            return $this->error($e->getMessage());
        }
    }

    /**
     * Get rider's tracking statistics
     * 
     * GET /api/rider/tracking/stats
     */
    public function stats(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'date' => 'nullable|date',
        ]);

        try {
            $rider = $this->getRider();
            $date = isset($validated['date']) ? Carbon::parse($validated['date']) : today();

            $stats = $this->trackingService->getRiderStats($rider->id, $date);

            return $this->success($stats);

        } catch (Exception $e) {
            return $this->error($e->getMessage());
        }
    }

    /**
     * Pause location tracking
     * 
     * POST /api/rider/tracking/pause
     */
    public function pause(): JsonResponse
    {
        try {
            $rider = $this->getRider();

            $route = $this->trackingService->pauseTracking($rider->id);

            return $this->success([
                'route_id' => $route->id,
                'tracking_status' => $route->tracking_status,
                'paused_at' => $route->last_paused_at?->toIso8601String(),
                'total_pause_duration' => $route->total_pause_duration,
            ], 'Tracking paused successfully');

        } catch (Exception $e) {
            return $this->error($e->getMessage());
        }
    }

    /**
     * Resume location tracking
     * 
     * POST /api/rider/tracking/resume
     */
    public function resume(): JsonResponse
    {
        try {
            $rider = $this->getRider();

            $route = $this->trackingService->resumeTracking($rider->id);

            return $this->success([
                'route_id' => $route->id,
                'tracking_status' => $route->tracking_status,
                'resumed_at' => $route->last_resumed_at?->toIso8601String(),
                'total_pause_duration' => $route->total_pause_duration,
            ], 'Tracking resumed successfully');

        } catch (Exception $e) {
            return $this->error($e->getMessage());
        }
    }

    // ============================================
    // HELPER METHODS
    // ============================================

    /**
     * Get authenticated rider
     */
    private function getRider()
    {
        $user = Auth::user();

        if (!$user) {
            throw new Exception('User not authenticated', 401);
        }

        $rider = $this->riderService->getRiderByUserId($user->id);

        if (!$rider) {
            throw new Exception('Rider profile not found', 404);
        }

        return $rider;
    }

    /**
     * Determine source of request
     */
    private function getSource(Request $request): string
    {
        if ($request->header('User-Agent-Type')) {
            return $request->header('User-Agent-Type');
        }

        return 'mobile';
    }

    /**
     * Success response
     */
    private function success(
        mixed $data = null, 
        string $message = 'Success', 
        int $code = 200
    ): JsonResponse 
    {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $data,
        ], $code);
    }

    /**
     * Error response
     */
    private function error(
        string $message = 'An error occurred', 
        int $code = 400
    ): JsonResponse 
    {
        return response()->json([
            'success' => false,
            'message' => $message,
        ], $code);
    }
}