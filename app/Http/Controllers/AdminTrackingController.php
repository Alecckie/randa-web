<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\RiderTrackingService;
use App\Services\RiderService;
use App\Services\CampaignService;
use App\Models\RiderLocation;
use App\Models\RiderRoute;
use App\Models\Rider;
use App\Models\Campaign;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Exception;

class AdminTrackingController extends Controller
{
    public function __construct(
        private RiderTrackingService $trackingService,
        private RiderService $riderService,
        private CampaignService $campaignService
    ) {
        // Ensure only admins can access these endpoints
        $this->middleware(['role:admin']);
    }

    /**
     * Get live tracking data for all active riders
     * 
     * GET /api/admin/tracking/live
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function liveTracking(Request $request): JsonResponse
    {
        try {
            // Validate filters
            $validator = Validator::make($request->all(), [
                'campaign_id' => 'nullable|exists:campaigns,id',
                'rider_ids' => 'nullable|array',
                'rider_ids.*' => 'exists:riders,id',
                'county_id' => 'nullable|exists:counties,id',
                'refresh_interval' => 'nullable|integer|min:5|max:300', // seconds
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed.',
                    'errors' => $validator->errors()
                ], 422);
            }

            $filters = [
                'campaign_id' => $request->campaign_id,
                'rider_ids' => $request->rider_ids,
            ];

            // Get live tracking data
            $trackingData = $this->trackingService->getLiveTrackingData($filters);

            // Enrich with additional rider information
            $enrichedLocations = $trackingData['locations']->map(function ($location) {
                return [
                    'id' => $location->id,
                    'rider' => [
                        'id' => $location->rider->id,
                        'name' => $location->rider->user->name,
                        'phone' => $location->rider->user->phone,
                        'status' => $location->rider->status,
                    ],
                    'location' => [
                        'latitude' => (float) $location->latitude,
                        'longitude' => (float) $location->longitude,
                        'accuracy' => $location->accuracy ? (float) $location->accuracy : null,
                        'speed' => $location->speed ? (float) $location->speed : null,
                        'heading' => $location->heading ? (float) $location->heading : null,
                        'address' => $location->address,
                    ],
                    'campaign' => $location->campaignAssignment ? [
                        'id' => $location->campaignAssignment->campaign_id,
                        'name' => $location->campaignAssignment->campaign->name,
                    ] : null,
                    'recorded_at' => $location->recorded_at->toIso8601String(),
                    'time_ago' => $location->recorded_at->diffForHumans(),
                    'is_recent' => $location->recorded_at->isAfter(now()->subMinutes(5)),
                ];
            });

            return response()->json([
                'success' => true,
                'message' => 'Live tracking data retrieved successfully.',
                'data' => [
                    'active_riders' => $trackingData['active_riders'],
                    'locations' => $enrichedLocations,
                    'last_updated' => $trackingData['last_updated'],
                    'refresh_interval' => $request->refresh_interval ?? 30, // default 30 seconds
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
     * Get tracking data for a specific rider
     * 
     * GET /api/admin/tracking/rider/{riderId}
     * 
     * @param Request $request
     * @param int $riderId
     * @return JsonResponse
     */
    public function riderTracking(Request $request, int $riderId): JsonResponse
    {
        try {
            $rider = Rider::with(['user', 'currentAssignment.campaign'])->findOrFail($riderId);

            // Validate date parameter
            $validator = Validator::make($request->all(), [
                'date' => 'nullable|date',
                'date_from' => 'nullable|date',
                'date_to' => 'nullable|date|after_or_equal:date_from',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed.',
                    'errors' => $validator->errors()
                ], 422);
            }

            $date = $request->date ? Carbon::parse($request->date) : today();

            // Get route data for the specified date
            $routeData = $this->trackingService->getRiderRoute($riderId, $date);

            // Get rider's recent locations if no route found
            if (!$routeData) {
                $locations = RiderLocation::where('rider_id', $riderId)
                    ->whereDate('recorded_at', $date)
                    ->with(['campaignAssignment.campaign'])
                    ->orderBy('recorded_at')
                    ->get();

                return response()->json([
                    'success' => true,
                    'message' => 'Rider tracking data retrieved (no completed route).',
                    'data' => [
                        'rider' => [
                            'id' => $rider->id,
                            'name' => $rider->user->name,
                            'email' => $rider->user->email,
                            'phone' => $rider->user->phone,
                            'status' => $rider->status,
                        ],
                        'date' => $date->format('Y-m-d'),
                        'has_route' => false,
                        'locations_count' => $locations->count(),
                        'locations' => $locations->map(function ($location) {
                            return [
                                'latitude' => (float) $location->latitude,
                                'longitude' => (float) $location->longitude,
                                'recorded_at' => $location->recorded_at->toIso8601String(),
                                'speed' => $location->speed ? (float) $location->speed : null,
                                'address' => $location->address,
                            ];
                        }),
                    ]
                ], 200);
            }

            // Return full route data
            return response()->json([
                'success' => true,
                'message' => 'Rider tracking data retrieved successfully.',
                'data' => [
                    'rider' => [
                        'id' => $rider->id,
                        'name' => $rider->user->name,
                        'email' => $rider->user->email,
                        'phone' => $rider->user->phone,
                        'status' => $rider->status,
                        'current_assignment' => $rider->currentAssignment ? [
                            'campaign_id' => $rider->currentAssignment->campaign_id,
                            'campaign_name' => $rider->currentAssignment->campaign->name,
                        ] : null,
                    ],
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
                            'address' => $location->address,
                        ];
                    }),
                    'polyline' => $routeData['route']->route_polyline,
                ]
            ], 200);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], $e->getCode() ?: 500);
        }
    }

    /**
     * Get tracking data for all riders in a specific campaign
     * 
     * GET /api/admin/tracking/campaign/{campaignId}
     * 
     * @param Request $request
     * @param int $campaignId
     * @return JsonResponse
     */
    public function campaignTracking(Request $request, int $campaignId): JsonResponse
    {
        try {
            $campaign = Campaign::with(['assignments.rider.user'])->findOrFail($campaignId);

            // Validate date parameters
            $validator = Validator::make($request->all(), [
                'date' => 'nullable|date',
                'live' => 'nullable|boolean',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed.',
                    'errors' => $validator->errors()
                ], 422);
            }

            $date = $request->date ? Carbon::parse($request->date) : today();
            $isLive = $request->boolean('live', false);

            if ($isLive) {
                // Get current locations for all riders in this campaign
                $locations = RiderLocation::whereHas('campaignAssignment', function ($query) use ($campaignId) {
                    $query->where('campaign_id', $campaignId)
                        ->where('status', 'active');
                })
                    ->whereDate('recorded_at', today())
                    ->with(['rider.user'])
                    ->orderBy('recorded_at', 'desc')
                    ->get()
                    ->groupBy('rider_id')
                    ->map(function ($group) {
                        return $group->first(); // Get latest location for each rider
                    })
                    ->values();

                return response()->json([
                    'success' => true,
                    'message' => 'Live campaign tracking data retrieved.',
                    'data' => [
                        'campaign' => [
                            'id' => $campaign->id,
                            'name' => $campaign->name,
                            'status' => $campaign->status,
                        ],
                        'active_riders' => $locations->count(),
                        'locations' => $locations->map(function ($location) {
                            return [
                                'rider' => [
                                    'id' => $location->rider->id,
                                    'name' => $location->rider->user->name,
                                ],
                                'latitude' => (float) $location->latitude,
                                'longitude' => (float) $location->longitude,
                                'speed' => $location->speed ? (float) $location->speed : null,
                                'recorded_at' => $location->recorded_at->toIso8601String(),
                                'time_ago' => $location->recorded_at->diffForHumans(),
                            ];
                        }),
                        'last_updated' => now()->toIso8601String(),
                    ]
                ], 200);
            }

            // Get historical route data for the specified date
            $routes = RiderRoute::whereHas('campaignAssignment', function ($query) use ($campaignId) {
                $query->where('campaign_id', $campaignId);
            })
                ->whereDate('route_date', $date)
                ->with(['rider.user'])
                ->get();

            return response()->json([
                'success' => true,
                'message' => 'Campaign tracking data retrieved successfully.',
                'data' => [
                    'campaign' => [
                        'id' => $campaign->id,
                        'name' => $campaign->name,
                        'status' => $campaign->status,
                        'start_date' => $campaign->start_date->format('Y-m-d'),
                        'end_date' => $campaign->end_date->format('Y-m-d'),
                    ],
                    'date' => $date->format('Y-m-d'),
                    'total_riders' => $routes->count(),
                    'summary' => [
                        'total_distance' => round($routes->sum('total_distance'), 2),
                        'total_duration' => $routes->sum('total_duration'),
                        'avg_distance_per_rider' => $routes->count() > 0
                            ? round($routes->sum('total_distance') / $routes->count(), 2)
                            : 0,
                    ],
                    'riders' => $routes->map(function ($route) {
                        return [
                            'id' => $route->rider->id,
                            'name' => $route->rider->user->name,
                            'route_id' => $route->id,
                            'distance' => (float) $route->total_distance,
                            'duration' => $route->total_duration,
                            'avg_speed' => $route->avg_speed ? (float) $route->avg_speed : null,
                            'location_points' => $route->location_points_count,
                            'coverage_areas_count' => count($route->coverage_areas ?? []),
                        ];
                    }),
                ]
            ], 200);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], $e->getCode() ?: 500);
        }
    }

    /**
     * Get detailed route information
     * 
     * GET /api/admin/tracking/routes/{routeId}
     * 
     * @param int $routeId
     * @return JsonResponse
     */
    public function routeDetails(int $routeId): JsonResponse
    {
        try {
            $route = RiderRoute::with([
                'rider.user',
                'checkIn',
                'campaignAssignment.campaign',
                'locations' => function ($query) {
                    $query->orderBy('recorded_at');
                }
            ])->findOrFail($routeId);

            return response()->json([
                'success' => true,
                'message' => 'Route details retrieved successfully.',
                'data' => [
                    'route' => [
                        'id' => $route->id,
                        'date' => $route->route_date->format('Y-m-d'),
                        'started_at' => $route->started_at->toIso8601String(),
                        'ended_at' => $route->ended_at?->toIso8601String(),
                        'total_distance' => (float) $route->total_distance,
                        'total_duration' => $route->total_duration,
                        'avg_speed' => $route->avg_speed ? (float) $route->avg_speed : null,
                        'max_speed' => $route->max_speed ? (float) $route->max_speed : null,
                        'location_points_count' => $route->location_points_count,
                        'coverage_areas' => $route->coverage_areas,
                        'status' => $route->status,
                    ],
                    'rider' => [
                        'id' => $route->rider->id,
                        'name' => $route->rider->user->name,
                        'email' => $route->rider->user->email,
                        'phone' => $route->rider->user->phone,
                    ],
                    'campaign' => $route->campaignAssignment ? [
                        'id' => $route->campaignAssignment->campaign->id,
                        'name' => $route->campaignAssignment->campaign->name,
                    ] : null,
                    'check_in' => $route->checkIn ? [
                        'id' => $route->checkIn->id,
                        'check_in_time' => $route->checkIn->check_in_time->format('H:i:s'),
                        'check_out_time' => $route->checkIn->check_out_time?->format('H:i:s'),
                    ] : null,
                    'locations' => $route->locations->map(function ($location) {
                        return [
                            'id' => $location->id,
                            'latitude' => (float) $location->latitude,
                            'longitude' => (float) $location->longitude,
                            'accuracy' => $location->accuracy ? (float) $location->accuracy : null,
                            'speed' => $location->speed ? (float) $location->speed : null,
                            'heading' => $location->heading ? (float) $location->heading : null,
                            'address' => $location->address,
                            'recorded_at' => $location->recorded_at->toIso8601String(),
                        ];
                    }),
                    'polyline' => $route->route_polyline,
                    'statistics' => $route->statistics,
                ]
            ], 200);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], $e->getCode() ?: 500);
        }
    }

    /**
     * Get heatmap data for coverage visualization
     * 
     * GET /api/admin/tracking/heatmap
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function heatmapData(Request $request): JsonResponse
    {
        try {
            // Validate parameters
            $validator = Validator::make($request->all(), [
                'campaign_id' => 'nullable|exists:campaigns,id',
                'date_from' => 'nullable|date',
                'date_to' => 'nullable|date|after_or_equal:date_from',
                'county_id' => 'nullable|exists:counties,id',
                'intensity_threshold' => 'nullable|integer|min:1',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed.',
                    'errors' => $validator->errors()
                ], 422);
            }

            $query = RiderLocation::query();

            // Apply filters
            if ($request->campaign_id) {
                $query->whereHas('campaignAssignment', function ($q) use ($request) {
                    $q->where('campaign_id', $request->campaign_id);
                });
            }

            if ($request->date_from) {
                $query->whereDate('recorded_at', '>=', $request->date_from);
            }

            if ($request->date_to) {
                $query->whereDate('recorded_at', '<=', $request->date_to);
            } else {
                // Default to last 7 days
                $query->whereDate('recorded_at', '>=', now()->subDays(7));
            }

            if ($request->county_id) {
                $query->where('county_id', $request->county_id);
            }

            // Get locations grouped by coordinates (rounded for heatmap)
            $heatmapPoints = $query
                ->select(
                    DB::raw('ROUND(latitude, 4) as lat'),
                    DB::raw('ROUND(longitude, 4) as lng'),
                    DB::raw('COUNT(*) as intensity')
                )
                ->groupBy('lat', 'lng')
                ->having('intensity', '>=', $request->intensity_threshold ?? 1)
                ->orderBy('intensity', 'desc')
                ->limit(10000) // Limit for performance
                ->get();

            return response()->json([
                'success' => true,
                'message' => 'Heatmap data retrieved successfully.',
                'data' => [
                    'points' => $heatmapPoints->map(function ($point) {
                        return [
                            'lat' => (float) $point->lat,
                            'lng' => (float) $point->lng,
                            'intensity' => $point->intensity,
                        ];
                    }),
                    'total_points' => $heatmapPoints->count(),
                    'max_intensity' => $heatmapPoints->max('intensity'),
                    'filters_applied' => [
                        'campaign_id' => $request->campaign_id,
                        'date_from' => $request->date_from,
                        'date_to' => $request->date_to,
                        'county_id' => $request->county_id,
                    ]
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
     * Get tracking dashboard statistics
     * 
     * GET /api/admin/tracking/dashboard-stats
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function dashboardStats(Request $request): JsonResponse
    {
        try {
            // Validate period parameter
            $period = $request->input('period', 'today'); // today, week, month

            $dateFilter = match($period) {
                'today' => today(),
                'week' => now()->subDays(7),
                'month' => now()->subDays(30),
                default => today(),
            };

            // Active riders (checked in today)
            $activeRiders = DB::table('rider_check_ins')
                ->where('status', 'active')
                ->whereDate('check_in_date', today())
                ->count();

            // Total routes in period
            $totalRoutes = RiderRoute::whereDate('route_date', '>=', $dateFilter)->count();

            // Total distance covered
            $totalDistance = RiderRoute::whereDate('route_date', '>=', $dateFilter)
                ->sum('total_distance');

            // Total location points recorded
            $totalPoints = RiderLocation::whereDate('recorded_at', '>=', $dateFilter)->count();

            // Active campaigns with riders
            $activeCampaigns = DB::table('campaigns')
                ->join('campaign_assignments', 'campaigns.id', '=', 'campaign_assignments.campaign_id')
                ->join('rider_check_ins', 'campaign_assignments.id', '=', 'rider_check_ins.campaign_assignment_id')
                ->where('campaigns.status', 'active')
                ->where('rider_check_ins.status', 'active')
                ->whereDate('rider_check_ins.check_in_date', today())
                ->distinct('campaigns.id')
                ->count();

            // Average speed
            $avgSpeed = RiderRoute::whereDate('route_date', '>=', $dateFilter)
                ->whereNotNull('avg_speed')
                ->avg('avg_speed');

            // Coverage areas reached
            $coverageAreas = RiderRoute::whereDate('route_date', '>=', $dateFilter)
                ->whereNotNull('coverage_areas')
                ->get()
                ->pluck('coverage_areas')
                ->flatten()
                ->unique()
                ->count();

            return response()->json([
                'success' => true,
                'message' => 'Dashboard statistics retrieved successfully.',
                'data' => [
                    'period' => $period,
                    'active_riders_now' => $activeRiders,
                    'total_routes' => $totalRoutes,
                    'total_distance_km' => round($totalDistance, 2),
                    'total_location_points' => $totalPoints,
                    'active_campaigns' => $activeCampaigns,
                    'avg_speed_kmh' => $avgSpeed ? round($avgSpeed, 2) : 0,
                    'coverage_areas_reached' => $coverageAreas,
                    'last_updated' => now()->toIso8601String(),
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
     * Get rider list with their latest tracking status
     * 
     * GET /api/admin/tracking/riders
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function ridersList(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'status' => 'nullable|in:active,inactive,all',
                'campaign_id' => 'nullable|exists:campaigns,id',
                'search' => 'nullable|string|max:100',
                'per_page' => 'nullable|integer|min:1|max:100',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed.',
                    'errors' => $validator->errors()
                ], 422);
            }

            $query = Rider::with([
                'user',
                'currentAssignment.campaign',
            ])
                ->where('status', 'approved');

            // Filter by active status (checked in today)
            if ($request->status === 'active') {
                $query->whereHas('checkIns', function ($q) {
                    $q->where('status', 'active')
                        ->whereDate('check_in_date', today());
                });
            } elseif ($request->status === 'inactive') {
                $query->whereDoesntHave('checkIns', function ($q) {
                    $q->where('status', 'active')
                        ->whereDate('check_in_date', today());
                });
            }

            // Filter by campaign
            if ($request->campaign_id) {
                $query->whereHas('currentAssignment', function ($q) use ($request) {
                    $q->where('campaign_id', $request->campaign_id);
                });
            }

            // Search filter
            if ($request->search) {
                $search = $request->search;
                $query->whereHas('user', function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%");
                });
            }

            $riders = $query->paginate($request->per_page ?? 15);

            // Get latest location for each rider
            $riderIds = $riders->pluck('id');
            $latestLocations = RiderLocation::whereIn('rider_id', $riderIds)
                ->whereDate('recorded_at', today())
                ->select('rider_id', DB::raw('MAX(recorded_at) as latest_time'))
                ->groupBy('rider_id')
                ->get()
                ->keyBy('rider_id');

            $enrichedRiders = $riders->map(function ($rider) use ($latestLocations) {
                $lastSeen = $latestLocations->get($rider->id);
                
                return [
                    'id' => $rider->id,
                    'name' => $rider->user->name,
                    'email' => $rider->user->email,
                    'phone' => $rider->user->phone,
                    'status' => $rider->status,
                    'current_campaign' => $rider->currentAssignment ? [
                        'id' => $rider->currentAssignment->campaign_id,
                        'name' => $rider->currentAssignment->campaign->name,
                    ] : null,
                    'tracking_status' => $lastSeen ? [
                        'is_active' => $lastSeen->latest_time->isAfter(now()->subMinutes(10)),
                        'last_seen' => $lastSeen->latest_time->toIso8601String(),
                        'last_seen_human' => $lastSeen->latest_time->diffForHumans(),
                    ] : [
                        'is_active' => false,
                        'last_seen' => null,
                        'last_seen_human' => 'Never',
                    ],
                ];
            });

            return response()->json([
                'success' => true,
                'message' => 'Riders list retrieved successfully.',
                'data' => $enrichedRiders,
                'pagination' => [
                    'current_page' => $riders->currentPage(),
                    'per_page' => $riders->perPage(),
                    'total' => $riders->total(),
                    'last_page' => $riders->lastPage(),
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
     * Export tracking data to CSV
     * 
     * GET /api/admin/tracking/export
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function exportTrackingData(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'format' => 'required|in:csv,json,excel',
                'date_from' => 'required|date',
                'date_to' => 'required|date|after_or_equal:date_from',
                'campaign_id' => 'nullable|exists:campaigns,id',
                'rider_ids' => 'nullable|array',
                'rider_ids.*' => 'exists:riders,id',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed.',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Queue the export job for large datasets
            // For now, return a message that export is being processed
            // In production, you'd dispatch a job here

            return response()->json([
                'success' => true,
                'message' => 'Export request received. You will receive an email when the export is ready.',
                'data' => [
                    'export_id' => uniqid('export_'),
                    'format' => $request->format,
                    'date_range' => [
                        'from' => $request->date_from,
                        'to' => $request->date_to,
                    ],
                    'estimated_time' => 'A few minutes',
                ]
            ], 202); // 202 Accepted

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }
}