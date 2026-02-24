<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreBatchLocationRequest;
use App\Http\Requests\StoreLocationRequest;
use App\Services\RiderTrackingService;
use App\Services\RiderService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;
use Exception;

/**
 * Rider Location Tracking Controller
 * 
 * Handles location tracking for both web (Inertia) and mobile (API)
 * Uses Form Requests for validation and calls RiderTrackingService
 */
class RiderTrackingController extends Controller
{
    public function __construct(
        private RiderTrackingService $trackingService,
        private RiderService $riderService
    ) {}

    /**
     * Record a single location point
     * 
     * POST /rider/location (web)
     * POST /api/rider/location (mobile)
     */
    public function store(StoreLocationRequest $request): JsonResponse|RedirectResponse
    {
        try {
            $rider = $this->getRider();

            // Prepare location data from validated request
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

            // Call service to record location
            $location = $this->trackingService->recordLocation($rider->id, $locationData);

            return $this->success([
                'location_id' => $location->id,
                'recorded_at' => $location->recorded_at->toIso8601String(),
                'latitude' => (float) $location->latitude,
                'longitude' => (float) $location->longitude,
            ], 'Location recorded successfully', 201);

        } catch (Exception $e) {
            return $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    /**
     * Record multiple location points in batch
     * 
     * POST /rider/locations/batch (web)
     * POST /api/rider/locations/batch (mobile)
     */
    public function storeBatch(StoreBatchLocationRequest $request): JsonResponse|RedirectResponse
    {
        try {
            $rider = $this->getRider();

            // Call service to record batch locations
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
     * Get rider's current/latest location
     * 
     * GET /rider/location/current (web)
     * GET /api/rider/location/current (mobile)
     */
    public function current(): JsonResponse|RedirectResponse
    {
        try {
            $rider = $this->getRider();
            
            // Call service to get current location
            $location = $this->trackingService->getCurrentLocation($rider->id);

            if (!$location) {
                return $this->success(null, 'No location data found');
            }

            return $this->success([
                'id' => $location->id,
                'latitude' => (float) $location->latitude,
                'longitude' => (float) $location->longitude,
                'accuracy' => $location->accuracy ? (float) $location->accuracy : null,
                'speed' => $location->speed ? (float) $location->speed : null,
                'heading' => $location->heading ? (float) $location->heading : null,
                'address' => $location->address,
                'recorded_at' => $location->recorded_at->toIso8601String(),
                'time_ago' => $location->recorded_at->diffForHumans(),
            ]);

        } catch (Exception $e) {
            return $this->error($e->getMessage());
        }
    }

    /**
     * Get rider's locations for a specific date range
     * 
     * GET /rider/locations (web)
     * GET /api/rider/locations (mobile)
     */
    public function index(Request $request): JsonResponse|RedirectResponse
    {
        $validated = $request->validate([
            'date' => 'nullable|date',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
            'limit' => 'nullable|integer|min:1|max:1000',
        ]);

        try {
            $rider = $this->getRider();

            $filters = [
                'date_from' => $validated['date_from'] ?? $validated['date'] ?? null,
                'date_to' => $validated['date_to'] ?? $validated['date'] ?? null,
                'limit' => $validated['limit'] ?? 1000,
            ];

            // Call service to get locations
            $locations = $this->trackingService->getRiderLocations($rider->id, $filters);

            return $this->success([
                'count' => $locations->count(),
                'locations' => $locations->map(fn($location) => [
                    'id' => $location->id,
                    'latitude' => (float) $location->latitude,
                    'longitude' => (float) $location->longitude,
                    'speed' => $location->speed ? (float) $location->speed : null,
                    'recorded_at' => $location->recorded_at->toIso8601String(),
                    'address' => $location->address,
                ]),
            ]);

        } catch (Exception $e) {
            return $this->error($e->getMessage());
        }
    }

    /**
     * Get rider's tracking statistics
     * 
     * GET /rider/stats (web)
     * GET /api/rider/stats (mobile)
     */
    public function stats(Request $request): JsonResponse|RedirectResponse
    {
        $validated = $request->validate([
            'date' => 'nullable|date',
        ]);

        try {
            $rider = $this->getRider();
            $date = isset($validated['date']) ? Carbon::parse($validated['date']) : today();

            // Call service to get stats
            $stats = $this->trackingService->getRiderStats($rider->id, $date);

            return $this->success($stats);

        } catch (Exception $e) {
            return $this->error($e->getMessage());
        }
    }

    /**
     * Pause location tracking
     * 
     * POST /rider/tracking/pause (web)
     * POST /api/rider/tracking/pause (mobile)
     */
    public function pause(): JsonResponse|RedirectResponse
    {
        try {
            $rider = $this->getRider();

            // Call service to pause tracking
            $route = $this->trackingService->pauseTracking($rider->id);

            return $this->success([
                'route_id' => $route->id,
                'tracking_status' => $route?->tracking_status,
                'paused_at' => $route?->last_paused_at?->toIso8601String() ?? null,
                'total_pause_duration' => $route?->total_pause_duration,
            ], 'Tracking paused successfully');

        } catch (Exception $e) {
            return $this->error($e->getMessage());
        }
    }

    /**
     * Resume location tracking
     * 
     * POST /rider/tracking/resume (web)
     * POST /api/rider/tracking/resume (mobile)
     */
    public function resume(): JsonResponse|RedirectResponse
    {
        try {
            $rider = $this->getRider();

            // Call service to resume tracking
            $route = $this->trackingService->resumeTracking($rider->id);

            return $this->success([
                'route_id' => $route->id,
                'tracking_status' => $route->tracking_status,
                'resumed_at' => $route?->last_resumed_at?->toIso8601String(),
                'total_pause_duration' => $route->total_pause_duration,
            ], 'Tracking resumed successfully');

        } catch (Exception $e) {
            return $this->error($e->getMessage());
        }
    }

    /**
     * Get tracking status
     * 
     * GET /rider/tracking/status (web)
     * GET /api/rider/tracking/status (mobile)
     */
    public function trackingStatus(): JsonResponse|RedirectResponse
    {
        try {
            $rider = $this->getRider();

            // Call service to get status
            $status = $this->trackingService->getTrackingStatus($rider->id);

            return $this->success($status);

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

        return $request->is('api/*') ? 'mobile' : 'web';
    }

    /**
     * Check if request is from API
     */
    private function isApiRequest(): bool
    {
        return request()->is('api/*') || request()->expectsJson();
    }

    /**
     * Success response
     */
    private function success(
        mixed $data = null, 
        string $message = 'Success', 
        int $code = 200
    ): JsonResponse|RedirectResponse 
    {
        if ($this->isApiRequest()) {
            return response()->json([
                'success' => true,
                'message' => $message,
                'data' => $data,
            ], $code);
        }

        return back()->with('success', $message)->with('data', $data);
    }

    /**
     * Error response
     */
    private function error(
        string $message = 'An error occurred', 
        int $code = 400
    ): JsonResponse|RedirectResponse 
    {
        if ($this->isApiRequest()) {
            return response()->json([
                'success' => false,
                'message' => $message,
            ], $code);
        }

        return back()->withErrors(['error' => $message]);
    }
}