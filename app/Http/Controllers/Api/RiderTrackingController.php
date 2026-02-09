<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\RiderTrackingService;
use App\Services\RiderService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Carbon\Carbon;
use Exception;

class RiderTrackingController extends Controller
{
    public function __construct(
        private RiderTrackingService $trackingService,
        private RiderService $riderService
    ) {}

    /**
     * Record a single location point
     * 
     * POST /api/rider/location
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function recordLocation(Request $request): JsonResponse
    {
        try {
            // Get authenticated user's rider profile
            $rider = $this->riderService->getRiderByUserId(Auth::id());

            if (!$rider) {
                return response()->json([
                    'success' => false,
                    'message' => 'Rider profile not found.'
                ], 404);
            }

            // Validate the incoming location data
            $validator = Validator::make($request->all(), [
                'latitude' => 'required|numeric|between:-90,90',
                'longitude' => 'required|numeric|between:-180,180',
                'accuracy' => 'nullable|numeric|min:0',
                'altitude' => 'nullable|numeric',
                'speed' => 'nullable|numeric|min:0',
                'heading' => 'nullable|numeric|between:0,360',
                'recorded_at' => 'nullable|date',
                'metadata' => 'nullable|array',
                'metadata.battery_level' => 'nullable|numeric|between:0,100',
                'metadata.network_type' => 'nullable|string|in:wifi,cellular,none',
                'metadata.app_version' => 'nullable|string',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed.',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Prepare location data
            $locationData = [
                'latitude' => $request->latitude,
                'longitude' => $request->longitude,
                'accuracy' => $request->accuracy,
                'altitude' => $request->altitude,
                'speed' => $request->speed,
                'heading' => $request->heading,
                'recorded_at' => $request->recorded_at ? Carbon::parse($request->recorded_at) : now(),
                'source' => $request->header('User-Agent-Type', 'mobile'), // mobile or web
                'metadata' => $request->metadata,
            ];

            // Record the location
            $location = $this->trackingService->recordLocation($rider->id, $locationData);

            return response()->json([
                'success' => true,
                'message' => 'Location recorded successfully.',
                'data' => [
                    'location_id' => $location->id,
                    'recorded_at' => $location->recorded_at->toIso8601String(),
                    'latitude' => $location->latitude,
                    'longitude' => $location->longitude,
                ]
            ], 201);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], $e->getCode() ?: 500);
        }
    }

    /**
     * Record multiple location points in batch
     * Useful for offline tracking - send accumulated points when connection is restored
     * 
     * POST /api/rider/locations/batch
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function recordBatchLocations(Request $request): JsonResponse
    {
        try {
            $rider = $this->riderService->getRiderByUserId(Auth::id());

            if (!$rider) {
                return response()->json([
                    'success' => false,
                    'message' => 'Rider profile not found.'
                ], 404);
            }

            // Validate batch data
            $validator = Validator::make($request->all(), [
                'locations' => 'required|array|min:1|max:500', // Limit to 500 points per batch
                'locations.*.latitude' => 'required|numeric|between:-90,90',
                'locations.*.longitude' => 'required|numeric|between:-180,180',
                'locations.*.accuracy' => 'nullable|numeric|min:0',
                'locations.*.altitude' => 'nullable|numeric',
                'locations.*.speed' => 'nullable|numeric|min:0',
                'locations.*.heading' => 'nullable|numeric|between:0,360',
                'locations.*.recorded_at' => 'required|date',
                'locations.*.metadata' => 'nullable|array',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed.',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Record batch locations
            $count = $this->trackingService->recordBatchLocations($rider->id, $request->locations);

            return response()->json([
                'success' => true,
                'message' => "{$count} location points recorded successfully.",
                'data' => [
                    'recorded_count' => $count,
                    'timestamp' => now()->toIso8601String(),
                ]
            ], 201);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], $e->getCode() ?: 500);
        }
    }

    /**
     * Get rider's current/latest location
     * 
     * GET /api/rider/location/current
     * 
     * @return JsonResponse
     */
    public function getCurrentLocation(): JsonResponse
    {
        try {
            $rider = $this->riderService->getRiderByUserId(Auth::id());

            if (!$rider) {
                return response()->json([
                    'success' => false,
                    'message' => 'Rider profile not found.'
                ], 404);
            }

            $location = $this->trackingService->getCurrentLocation($rider->id);

            if (!$location) {
                return response()->json([
                    'success' => true,
                    'message' => 'No location data found.',
                    'data' => null
                ], 200);
            }

            return response()->json([
                'success' => true,
                'message' => 'Current location retrieved successfully.',
                'data' => [
                    'id' => $location->id,
                    'latitude' => (float) $location->latitude,
                    'longitude' => (float) $location->longitude,
                    'accuracy' => $location->accuracy ? (float) $location->accuracy : null,
                    'speed' => $location->speed ? (float) $location->speed : null,
                    'heading' => $location->heading ? (float) $location->heading : null,
                    'address' => $location->address,
                    'recorded_at' => $location->recorded_at->toIso8601String(),
                    'time_ago' => $location->recorded_at->diffForHumans(),
                ]
            ], 200);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get rider's route for today
     * 
     * GET /api/rider/routes/today
     * 
     * @return JsonResponse
     */
    public function getTodayRoute(): JsonResponse
    {
        try {
            $rider = $this->riderService->getRiderByUserId(Auth::id());

            if (!$rider) {
                return response()->json([
                    'success' => false,
                    'message' => 'Rider profile not found.'
                ], 404);
            }

            $routeData = $this->trackingService->getRiderRoute($rider->id, today());

            if (!$routeData) {
                return response()->json([
                    'success' => true,
                    'message' => 'No route data found for today.',
                    'data' => null
                ], 200);
            }

            return response()->json([
                'success' => true,
                'message' => 'Today\'s route retrieved successfully.',
                'data' => [
                    'route' => [
                        'id' => $routeData['route']->id,
                        'date' => $routeData['route']->route_date->format('Y-m-d'),
                        'started_at' => $routeData['route']->started_at->toIso8601String(),
                        'ended_at' => $routeData['route']->ended_at?->toIso8601String(),
                        'status' => $routeData['route']->status,
                    ],
                    'summary' => $routeData['summary'],
                    'locations' => $routeData['locations']->map(function ($location) {
                        return [
                            'latitude' => (float) $location->latitude,
                            'longitude' => (float) $location->longitude,
                            'recorded_at' => $location->recorded_at->toIso8601String(),
                            'speed' => $location->speed ? (float) $location->speed : null,
                        ];
                    }),
                    'polyline' => $routeData['route']->route_polyline,
                ]
            ], 200);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get rider's route history
     * 
     * GET /api/rider/routes/history
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function getRouteHistory(Request $request): JsonResponse
    {
        try {
            $rider = $this->riderService->getRiderByUserId(Auth::id());

            if (!$rider) {
                return response()->json([
                    'success' => false,
                    'message' => 'Rider profile not found.'
                ], 404);
            }

            // Validate query parameters
            $validator = Validator::make($request->all(), [
                'date_from' => 'nullable|date',
                'date_to' => 'nullable|date|after_or_equal:date_from',
                'per_page' => 'nullable|integer|min:1|max:100',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed.',
                    'errors' => $validator->errors()
                ], 422);
            }

            $query = \App\Models\RiderRoute::where('rider_id', $rider->id)
                ->with(['checkIn.campaignAssignment.campaign']);

            // Apply date filters
            if ($request->date_from) {
                $query->whereDate('route_date', '>=', $request->date_from);
            }

            if ($request->date_to) {
                $query->whereDate('route_date', '<=', $request->date_to);
            }

            $routes = $query->orderBy('route_date', 'desc')
                ->paginate($request->per_page ?? 15);

            return response()->json([
                'success' => true,
                'message' => 'Route history retrieved successfully.',
                'data' => $routes->map(function ($route) {
                    return [
                        'id' => $route->id,
                        'date' => $route->route_date->format('Y-m-d'),
                        'distance' => (float) $route->total_distance,
                        'duration' => $route->total_duration,
                        'avg_speed' => $route->avg_speed ? (float) $route->avg_speed : null,
                        'location_points' => $route->location_points_count,
                        'status' => $route->status,
                        'campaign' => $route->checkIn?->campaignAssignment?->campaign ? [
                            'id' => $route->checkIn->campaignAssignment->campaign->id,
                            'name' => $route->checkIn->campaignAssignment->campaign->name,
                        ] : null,
                    ];
                }),
                'pagination' => [
                    'current_page' => $routes->currentPage(),
                    'per_page' => $routes->perPage(),
                    'total' => $routes->total(),
                    'last_page' => $routes->lastPage(),
                ]
            ], 200);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get specific route details by ID
     * 
     * GET /api/rider/routes/{routeId}
     * 
     * @param int $routeId
     * @return JsonResponse
     */
    public function getRouteDetails(int $routeId): JsonResponse
    {
        try {
            $rider = $this->riderService->getRiderByUserId(Auth::id());

            if (!$rider) {
                return response()->json([
                    'success' => false,
                    'message' => 'Rider profile not found.'
                ], 404);
            }

            $route = \App\Models\RiderRoute::where('id', $routeId)
                ->where('rider_id', $rider->id)
                ->with(['checkIn.campaignAssignment.campaign', 'locations'])
                ->first();

            if (!$route) {
                return response()->json([
                    'success' => false,
                    'message' => 'Route not found.'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'message' => 'Route details retrieved successfully.',
                'data' => [
                    'route' => [
                        'id' => $route->id,
                        'date' => $route->route_date->format('Y-m-d'),
                        'started_at' => $route->started_at->toIso8601String(),
                        'ended_at' => $route->ended_at?->toIso8601String(),
                        'distance' => (float) $route->total_distance,
                        'duration' => $route->total_duration,
                        'avg_speed' => $route->avg_speed ? (float) $route->avg_speed : null,
                        'max_speed' => $route->max_speed ? (float) $route->max_speed : null,
                        'location_points' => $route->location_points_count,
                        'coverage_areas' => $route->coverage_areas,
                        'status' => $route->status,
                    ],
                    'campaign' => $route->checkIn?->campaignAssignment?->campaign ? [
                        'id' => $route->checkIn->campaignAssignment->campaign->id,
                        'name' => $route->checkIn->campaignAssignment->campaign->name,
                    ] : null,
                    'locations' => $route->locations->map(function ($location) {
                        return [
                            'latitude' => (float) $location->latitude,
                            'longitude' => (float) $location->longitude,
                            'recorded_at' => $location->recorded_at->toIso8601String(),
                            'speed' => $location->speed ? (float) $location->speed : null,
                            'address' => $location->address,
                        ];
                    }),
                    'polyline' => $route->route_polyline,
                ]
            ], 200);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get rider's tracking statistics
     * 
     * GET /api/rider/tracking/stats
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function getTrackingStats(Request $request): JsonResponse
    {
        try {
            $rider = $this->riderService->getRiderByUserId(Auth::id());

            if (!$rider) {
                return response()->json([
                    'success' => false,
                    'message' => 'Rider profile not found.'
                ], 404);
            }

            // Validate period parameter
            $period = $request->input('period', 'week'); // week, month, all
            
            $query = \App\Models\RiderRoute::where('rider_id', $rider->id)
                ->where('status', 'completed');

            // Apply period filter
            switch ($period) {
                case 'week':
                    $query->where('route_date', '>=', now()->subDays(7));
                    break;
                case 'month':
                    $query->where('route_date', '>=', now()->subDays(30));
                    break;
                // 'all' - no filter
            }

            $routes = $query->get();

            $stats = [
                'total_routes' => $routes->count(),
                'total_distance' => round($routes->sum('total_distance'), 2),
                'total_duration' => $routes->sum('total_duration'),
                'avg_distance_per_day' => $routes->count() > 0 
                    ? round($routes->sum('total_distance') / $routes->count(), 2) 
                    : 0,
                'avg_speed' => $routes->count() > 0 
                    ? round($routes->avg('avg_speed'), 2) 
                    : 0,
                'max_speed_recorded' => $routes->max('max_speed') 
                    ? round($routes->max('max_speed'), 2) 
                    : 0,
                'unique_coverage_areas' => $routes->pluck('coverage_areas')
                    ->flatten()
                    ->unique()
                    ->count(),
                'period' => $period,
            ];

            return response()->json([
                'success' => true,
                'message' => 'Tracking statistics retrieved successfully.',
                'data' => $stats
            ], 200);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Pause tracking (for breaks, stops, etc.)
     * 
     * POST /api/rider/tracking/pause
     * 
     * @return JsonResponse
     */
    public function pauseTracking(): JsonResponse
    {
        try {
            $rider = $this->riderService->getRiderByUserId(Auth::id());

            if (!$rider) {
                return response()->json([
                    'success' => false,
                    'message' => 'Rider profile not found.'
                ], 404);
            }

            // Find today's active route
            $route = \App\Models\RiderRoute::where('rider_id', $rider->id)
                ->whereDate('route_date', today())
                ->where('status', 'active')
                ->first();

            if (!$route) {
                return response()->json([
                    'success' => false,
                    'message' => 'No active route found to pause.'
                ], 404);
            }

            $route->update(['status' => 'paused']);

            return response()->json([
                'success' => true,
                'message' => 'Tracking paused successfully.',
                'data' => [
                    'route_id' => $route->id,
                    'status' => $route->status,
                    'paused_at' => now()->toIso8601String(),
                ]
            ], 200);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Resume tracking after pause
     * 
     * POST /api/rider/tracking/resume
     * 
     * @return JsonResponse
     */
    public function resumeTracking(): JsonResponse
    {
        try {
            $rider = $this->riderService->getRiderByUserId(Auth::id());

            if (!$rider) {
                return response()->json([
                    'success' => false,
                    'message' => 'Rider profile not found.'
                ], 404);
            }

            // Find today's paused route
            $route = \App\Models\RiderRoute::where('rider_id', $rider->id)
                ->whereDate('route_date', today())
                ->where('status', 'paused')
                ->first();

            if (!$route) {
                return response()->json([
                    'success' => false,
                    'message' => 'No paused route found to resume.'
                ], 404);
            }

            $route->update(['status' => 'active']);

            return response()->json([
                'success' => true,
                'message' => 'Tracking resumed successfully.',
                'data' => [
                    'route_id' => $route->id,
                    'status' => $route->status,
                    'resumed_at' => now()->toIso8601String(),
                ]
            ], 200);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }
}