<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Services\RiderTrackingService;
use App\Services\RiderService;
use App\Services\CampaignService;
use App\Models\RiderGpsPoint;
use App\Models\RiderRoute;
use App\Models\Rider;
use App\Models\Campaign;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Exception;

/**
 * Admin Tracking Controller (API)
 *
 * Thin controller: validates input, delegates to RiderTrackingService,
 * and formats JSON responses.  No business logic lives here.
 */
class AdminTrackingController extends Controller
{
    public function __construct(
        private RiderTrackingService $trackingService,
        private RiderService $riderService,
        private CampaignService $campaignService
    ) {}

    // ──────────────────────────────────────────────────────────────────────────
    // GET /api/admin/tracking/live
    // ──────────────────────────────────────────────────────────────────────────

    public function liveTracking(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'campaign_id'      => 'nullable|exists:campaigns,id',
                'rider_ids'        => 'nullable|array',
                'rider_ids.*'      => 'exists:riders,id',
                'county_id'        => 'nullable|exists:counties,id',
                'refresh_interval' => 'nullable|integer|min:5|max:300',
            ]);

            if ($validator->fails()) {
                return $this->validationError($validator);
            }

            $trackingData = $this->trackingService->getLiveTrackingData([
                'campaign_id' => $request->campaign_id,
                'rider_ids'   => $request->rider_ids,
            ]);

            // dd($trackingData);

            // Enrich via the shared service helper — no duplication
            $enrichedLocations = $trackingData['locations']->map(
                fn($point) => $this->trackingService->enrichLocation($point)
            );

            return response()->json([
                'success' => true,
                'message' => 'Live tracking data retrieved successfully.',
                'data'    => [
                    'active_riders'    => $trackingData['active_riders'],
                    'locations'        => $enrichedLocations,
                    'last_updated'     => $trackingData['last_updated'],
                    'refresh_interval' => $request->refresh_interval ?? 30,
                ],
            ]);

        } catch (Exception $e) {
            return $this->serverError($e);
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // GET /api/admin/tracking/rider/{riderId}
    // ──────────────────────────────────────────────────────────────────────────

    public function riderTracking(Request $request, int $riderId): JsonResponse
    {
        try {
            $rider = Rider::with(['user', 'currentAssignment.campaign'])->findOrFail($riderId);

            $validator = Validator::make($request->all(), [
                'date' => 'nullable|date',
            ]);

            if ($validator->fails()) {
                return $this->validationError($validator);
            }

            $date = $request->date ? Carbon::parse($request->date) : today();

            $gpsPoints = RiderGpsPoint::where('rider_id', $riderId)
                ->whereDate('recorded_at', $date)
                ->with(['campaignAssignment.campaign'])
                ->orderBy('recorded_at')
                ->get();

            $route = RiderRoute::where('rider_id', $riderId)
                ->whereDate('route_date', $date)
                ->first();

            return response()->json([
                'success' => true,
                'message' => 'Rider tracking data retrieved successfully.',
                'data'    => [
                    'rider'     => $this->formatRider($rider),
                    'route'     => $route ? $this->formatRoute($route) : null,
                    'summary'   => $route ? [
                        'distance'            => (float) $route->total_distance,
                        'duration'            => $route->total_duration,
                        'avg_speed'           => $route->avg_speed ? (float) $route->avg_speed : null,
                        // rider_routes.coverage_areas was dropped (see
                        // 2026_02_26_143937_drop_rider_routes_columns.php)
                        // with no replacement data source.
                        'coverage_areas_count' => 0,
                    ] : null,
                    'locations' => $gpsPoints->map(fn($p) => $this->formatGpsPoint($p)),
                    'polyline'  => $route?->route_polyline,
                ],
            ]);

        } catch (Exception $e) {
            return $this->serverError($e);
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // GET /api/admin/tracking/campaign/{campaignId}
    // ──────────────────────────────────────────────────────────────────────────

    public function campaignTracking(Request $request, int $campaignId): JsonResponse
    {
        try {
            $campaign = Campaign::with(['assignments.rider.user'])->findOrFail($campaignId);

            $validator = Validator::make($request->all(), [
                'date' => 'nullable|date',
                'live' => 'nullable|boolean',
            ]);

            if ($validator->fails()) {
                return $this->validationError($validator);
            }

            $date   = $request->date ? Carbon::parse($request->date) : today();
            $isLive = $request->boolean('live', false);

            if ($isLive) {
                $gpsPoints = RiderGpsPoint::whereHas('campaignAssignment', fn($q) =>
                    $q->where('campaign_id', $campaignId)->where('status', 'active')
                )
                    ->whereDate('recorded_at', today())
                    ->with(['rider.user'])
                    ->orderByDesc('recorded_at')
                    ->get()
                    ->groupBy('rider_id')
                    ->map(fn($group) => $group->first())
                    ->values();

                return response()->json([
                    'success' => true,
                    'message' => 'Live campaign tracking data retrieved.',
                    'data'    => [
                        'campaign'      => $this->formatCampaign($campaign),
                        'active_riders' => $gpsPoints->count(),
                        'locations'     => $gpsPoints->map(fn($p) => [
                            'rider'       => ['id' => $p->rider->id, 'name' => $p->rider->user->name],
                            'latitude'    => (float) $p->latitude,
                            'longitude'   => (float) $p->longitude,
                            'speed'       => $p->speed ? (float) $p->speed : null,
                            'recorded_at' => $p->recorded_at->toIso8601String(),
                            'time_ago'    => $p->recorded_at->diffForHumans(),
                        ]),
                        'last_updated'  => now()->toIso8601String(),
                    ],
                ]);
            }

            $routes = RiderRoute::whereHas('campaignAssignment', fn($q) =>
                $q->where('campaign_id', $campaignId)
            )
                ->whereDate('route_date', $date)
                ->with(['rider.user'])
                ->get();

            return response()->json([
                'success' => true,
                'message' => 'Campaign tracking data retrieved successfully.',
                'data'    => [
                    'campaign'     => $this->formatCampaign($campaign),
                    'date'         => $date->format('Y-m-d'),
                    'total_riders' => $routes->count(),
                    'summary'      => [
                        'total_distance'        => round($routes->sum('total_distance'), 2),
                        'total_duration'        => $routes->sum('total_duration'),
                        'avg_distance_per_rider' => $routes->count() > 0
                            ? round($routes->sum('total_distance') / $routes->count(), 2)
                            : 0,
                    ],
                    'riders' => $routes->map(fn($route) => [
                        'id'              => $route->rider->id,
                        'name'            => $route->rider->user->name,
                        'route_id'        => $route->id,
                        'distance'        => (float) $route->total_distance,
                        'duration'        => $route->total_duration,
                        'avg_speed'       => $route->avg_speed ? (float) $route->avg_speed : null,
                        'location_points' => $route->location_points_count,
                    ]),
                ],
            ]);

        } catch (Exception $e) {
            return $this->serverError($e);
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // GET /api/admin/tracking/routes/{routeId}
    // ──────────────────────────────────────────────────────────────────────────

    public function routeDetails(int $routeId): JsonResponse
    {
        try {
            $route = RiderRoute::with([
                'rider.user',
                'checkIn',
                'campaignAssignment.campaign',
            ])->findOrFail($routeId);

            $gpsPoints = RiderGpsPoint::where('check_in_id', $route->check_in_id)
                ->whereDate('recorded_at', $route->route_date)
                ->orderBy('recorded_at')
                ->get();

            return response()->json([
                'success' => true,
                'message' => 'Route details retrieved successfully.',
                'data'    => [
                    'route'         => [
                        ...$this->formatRoute($route),
                        'started_at'           => $route->started_at->toIso8601String(),
                        'ended_at'             => $route->ended_at?->toIso8601String(),
                        'total_pause_duration' => $route->total_pause_duration,
                    ],
                    'rider'         => $this->formatRider($route->rider),
                    'campaign'      => $route->campaignAssignment ? [
                        'id'   => $route->campaignAssignment->campaign->id,
                        'name' => $route->campaignAssignment->campaign->name,
                    ] : null,
                    'locations'     => $gpsPoints->map(fn($p) => $this->formatGpsPoint($p, detailed: true)),
                    'polyline'      => $route->route_polyline,
                    'pause_history' => $route->pauseEvents()
                        ->get(['paused_at', 'resumed_at', 'duration_minutes', 'reason'])
                        ->toArray(),
                ],
            ]);

        } catch (Exception $e) {
            return $this->serverError($e);
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // GET /advertiser/tracking/heatmap
    // Scoped to the authenticated advertiser's own campaigns only.
    // ──────────────────────────────────────────────────────────────────────────

    public function advertiserHeatmap(Request $request): JsonResponse
    {
        try {
            $advertiser = $request->user()->advertiser;

            if (!$advertiser) {
                return response()->json([
                    'success' => false,
                    'message' => 'Advertiser profile not found.',
                ], 404);
            }

            $validator = Validator::make($request->all(), [
                'campaign_id' => 'nullable|exists:campaigns,id',
                'date_from'   => 'nullable|date',
                'date_to'     => 'nullable|date|after_or_equal:date_from',
            ]);

            if ($validator->fails()) {
                return $this->validationError($validator);
            }

            // All campaigns owned by this advertiser
            $ownedIds = Campaign::where('advertiser_id', $advertiser->id)->pluck('id');

            // If a specific campaign is requested, verify ownership
            if ($request->campaign_id) {
                if (!$ownedIds->contains((int) $request->campaign_id)) {
                    return response()->json(['success' => false, 'message' => 'Campaign not found.'], 404);
                }
                $activeCampaignIds = [(int) $request->campaign_id];
            } else {
                $activeCampaignIds = $ownedIds->toArray();
            }

            if (empty($activeCampaignIds)) {
                return response()->json([
                    'success' => true,
                    'message' => 'No campaigns found.',
                    'data'    => ['points' => [], 'total_points' => 0, 'max_intensity' => 0, 'live_riders_count' => 0, 'campaign_ids' => []],
                ]);
            }

            // Advertisers never receive rider identity, position, or trail data —
            // only the anonymized density blob and a live-rider count, as proof
            // of movement. Riders aren't advertisers' employees; they don't know
            // them and have no legitimate reason to see who or where they are.
            $heatmap = $this->buildHeatmapData(
                $activeCampaignIds,
                $request->date_from,
                $request->date_to,
                riderIds: null,
                includeRoutes: false
            );

            return response()->json([
                'success' => true,
                'message' => 'Heatmap data retrieved successfully.',
                'data'    => [
                    'points'            => $heatmap['points'],
                    'total_points'      => $heatmap['total_points'],
                    'max_intensity'     => $heatmap['max_intensity'],
                    'live_riders_count' => $heatmap['live_riders_count'],
                    'campaign_ids'      => $activeCampaignIds,
                ],
            ]);

        } catch (Exception $e) {
            return $this->serverError($e);
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // GET /api/admin/tracking/heatmap
    // ──────────────────────────────────────────────────────────────────────────

    public function heatmapData(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'campaign_id'         => 'nullable|exists:campaigns,id',
                'date_from'           => 'nullable|date',
                'date_to'             => 'nullable|date|after_or_equal:date_from',
                'county_id'           => 'nullable|exists:counties,id',
                'intensity_threshold' => 'nullable|integer|min:1',
                'rider_ids'           => 'nullable|array',
                'rider_ids.*'         => 'integer|exists:riders,id',
            ]);

            if ($validator->fails()) {
                return $this->validationError($validator);
            }

            $campaignIds = $request->campaign_id ? [(int) $request->campaign_id] : [];

            $data = $this->buildHeatmapData(
                $campaignIds,
                $request->date_from,
                $request->date_to,
                $request->rider_ids,
                $request->intensity_threshold ?? 1
            );

            return response()->json([
                'success' => true,
                'message' => 'Heatmap data retrieved successfully.',
                'data'    => $data,
            ]);

        } catch (Exception $e) {
            return $this->serverError($e);
        }
    }

    /**
     * Shared heat-point + rider-roster builder for both the admin and
     * advertiser heatmap endpoints — avoids duplicating the date-scoping,
     * aggregation, and roster logic across the two controller actions.
     *
     * The roster (participants) is always computed from the unfiltered,
     * campaign/date-scoped query so rider checkboxes never disappear when
     * a filter is applied; only the heat points are scoped to $riderIds.
     *
     * @param  array<int>       $campaignIds  empty = no campaign restriction
     * @param  array<int>|null  $riderIds     null/empty = all riders
     */
    private function buildHeatmapData(
        array $campaignIds,
        ?string $dateFrom,
        ?string $dateTo,
        ?array $riderIds,
        int $intensityThreshold = 1,
        bool $includeRoutes = true
    ): array {
        $query = RiderGpsPoint::query();

        if (!empty($campaignIds)) {
            $query->whereHas('campaignAssignment', fn($q) => $q->whereIn('campaign_id', $campaignIds));
        }

        if ($dateFrom) {
            $query->whereDate('recorded_at', '>=', $dateFrom);
        }

        $query->whereDate('recorded_at', '<=', $dateTo ?? now()->toDateString());

        if (!$dateFrom && !$dateTo) {
            $query->whereDate('recorded_at', '>=', now()->subDays(7));
        }

        // Full roster (with latest position) regardless of the rider filter,
        // so the checkbox list always reflects everyone who has data here.
        $participants = $this->ridersFromLatestPointQuery(clone $query);

        $pointsQuery = clone $query;

        if (!empty($riderIds)) {
            $pointsQuery->whereIn('rider_id', $riderIds);
        }

        $heatmapPoints = $pointsQuery
            ->select(
                DB::raw('ROUND(latitude, 4) as lat'),
                DB::raw('ROUND(longitude, 4) as lng'),
                DB::raw('COUNT(*) as intensity')
            )
            ->groupBy('lat', 'lng')
            ->having('intensity', '>=', $intensityThreshold)
            ->orderByDesc('intensity')
            ->limit(10000)
            ->get();

        // Route polylines only make sense for a single calendar day — across
        // a multi-day range they'd zigzag between unrelated days. The caller
        // signals "single day" by passing matching date_from/date_to. Callers
        // that never expose rider identity (e.g. advertisers) skip this
        // entirely via $includeRoutes.
        $routes = ($includeRoutes && $dateFrom && $dateTo && $dateFrom === $dateTo)
            ? $this->routesForQuery(clone $query)
            : collect();

        return [
            'points' => $heatmapPoints->map(fn($p) => [
                'lat'       => (float) $p->lat,
                'lng'       => (float) $p->lng,
                'intensity' => $p->intensity,
            ]),
            'total_points'      => $heatmapPoints->count(),
            'max_intensity'     => $heatmapPoints->max('intensity') ?? 0,
            'participants'      => $participants,
            'live_riders_count' => $participants->where('is_live', true)->count(),
            'routes'            => $routes,
        ];
    }

    /**
     * Every rider's GPS points for the (single-day) query, in chronological
     * order — the raw trail the "Maps" tab draws as a colored polyline per
     * rider. Always the full unfiltered roster, same as $participants, so
     * a route never disappears when the rider checkbox filter changes.
     */
    private function routesForQuery($query): \Illuminate\Support\Collection
    {
        return $query
            ->select('rider_id', 'latitude', 'longitude')
            ->orderBy('recorded_at')
            ->get()
            ->groupBy('rider_id')
            ->map(fn($points, $riderId) => [
                'rider_id' => (int) $riderId,
                'points'   => $points->map(fn($p) => [(float) $p->latitude, (float) $p->longitude])->values(),
            ])
            ->values();
    }

    /**
     * Every rider with a GPS point matching $query, at their latest known
     * position — the single source for both the rider checkbox roster and
     * the "Maps" tab markers. Ordered by recorded_at desc then deduped so
     * the first row kept per rider is their most recent point.
     */
    private function ridersFromLatestPointQuery($query): \Illuminate\Support\Collection
    {
        $latestByRider = $query
            ->select('rider_id', 'latitude', 'longitude', 'recorded_at')
            ->orderByDesc('recorded_at')
            ->get()
            ->unique('rider_id')
            ->values();

        if ($latestByRider->isEmpty()) {
            return collect();
        }

        $riders = Rider::whereIn('id', $latestByRider->pluck('rider_id'))
            ->with('user')
            ->get()
            ->keyBy('id');

        $liveThreshold = now()->subMinutes(10);

        return $latestByRider
            ->map(function ($point) use ($riders, $liveThreshold) {
                $rider = $riders->get($point->rider_id);

                if (!$rider) {
                    return null;
                }

                $recordedAt = Carbon::parse($point->recorded_at);

                return [
                    'id'              => $rider->id,
                    'name'            => $rider->user->name,
                    'latitude'        => (float) $point->latitude,
                    'longitude'       => (float) $point->longitude,
                    'last_seen'       => $recordedAt->toIso8601String(),
                    'last_seen_human' => $recordedAt->diffForHumans(),
                    'is_live'         => $recordedAt->gte($liveThreshold),
                ];
            })
            ->filter()
            ->values();
    }

    // ──────────────────────────────────────────────────────────────────────────
    // GET /api/admin/tracking/dashboard-stats
    // Delegates entirely to the service — zero logic here.
    // ──────────────────────────────────────────────────────────────────────────

    public function dashboardStats(Request $request): JsonResponse
    {
        try {
            $period = $request->input('period', 'today');

            $data = $this->trackingService->getDashboardStats($period);

            return response()->json([
                'success' => true,
                'message' => 'Dashboard statistics retrieved successfully.',
                'data'    => $data,
            ]);

        } catch (Exception $e) {
            return $this->serverError($e);
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // GET /api/admin/tracking/riders
    // ──────────────────────────────────────────────────────────────────────────

    public function ridersList(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'status'     => 'nullable|in:active,inactive,all',
                'campaign_id' => 'nullable|exists:campaigns,id',
                'search'     => 'nullable|string|max:100',
                'per_page'   => 'nullable|integer|min:1|max:100',
            ]);

            if ($validator->fails()) {
                return $this->validationError($validator);
            }

            $query = Rider::with(['user', 'currentAssignment.campaign'])
                ->where('status', 'approved');

            if ($request->status === 'active') {
                $query->whereHas('checkIns', fn($q) =>
                    $q->where('status', 'active')->whereDate('check_in_date', today())
                );
            }

            if ($request->campaign_id) {
                $query->whereHas('currentAssignment', fn($q) =>
                    $q->where('campaign_id', $request->campaign_id)
                );
            }

            if ($request->search) {
                $search = $request->search;
                $query->whereHas('user', fn($q) =>
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%")
                      ->orWhere('phone', 'like', "%{$search}%")
                );
            }

            $riders    = $query->paginate($request->per_page ?? 15);
            $riderIds  = $riders->pluck('id');

            $latestPoints = RiderGpsPoint::whereIn('rider_id', $riderIds)
                ->whereDate('recorded_at', today())
                ->select('rider_id', DB::raw('MAX(recorded_at) as latest_time'))
                ->groupBy('rider_id')
                ->get()
                ->keyBy('rider_id');

            $enrichedRiders = $riders->map(fn($rider) => [
                'id'               => $rider->id,
                'name'             => $rider->user->name,
                'email'            => $rider->user->email,
                'phone'            => $rider->user->phone,
                'status'           => $rider->status,
                'current_campaign' => $rider->currentAssignment ? [
                    'id'   => $rider->currentAssignment->campaign_id,
                    'name' => $rider->currentAssignment->campaign->name,
                ] : null,
                'tracking_status'  => ($lastSeen = $latestPoints->get($rider->id)) ? [
                    'is_active'       => Carbon::parse($lastSeen->latest_time)->isAfter(now()->subMinutes(10)),
                    'last_seen'       => Carbon::parse($lastSeen->latest_time)->toIso8601String(),
                    'last_seen_human' => Carbon::parse($lastSeen->latest_time)->diffForHumans(),
                ] : [
                    'is_active'       => false,
                    'last_seen'       => null,
                    'last_seen_human' => 'Never',
                ],
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Riders list retrieved successfully.',
                'data'    => $enrichedRiders,
                'pagination' => [
                    'current_page' => $riders->currentPage(),
                    'per_page'     => $riders->perPage(),
                    'total'        => $riders->total(),
                    'last_page'    => $riders->lastPage(),
                ],
            ]);

        } catch (Exception $e) {
            return $this->serverError($e);
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // POST /api/admin/tracking/export
    // ──────────────────────────────────────────────────────────────────────────

    public function exportTrackingData(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'format'      => 'required|in:csv,json,excel',
                'date_from'   => 'required|date',
                'date_to'     => 'required|date|after_or_equal:date_from',
                'campaign_id' => 'nullable|exists:campaigns,id',
                'rider_ids'   => 'nullable|array',
                'rider_ids.*' => 'exists:riders,id',
            ]);

            if ($validator->fails()) {
                return $this->validationError($validator);
            }

            // TODO: dispatch an export job here (e.g. ExportTrackingDataJob::dispatch(...))

            return response()->json([
                'success' => true,
                'message' => 'Export request received. You will receive an email when ready.',
                'data'    => [
                    'export_id'  => uniqid('export_'),
                    'format'     => $request->format,
                    'date_range' => ['from' => $request->date_from, 'to' => $request->date_to],
                ],
            ], 202);

        } catch (Exception $e) {
            return $this->serverError($e);
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // PRIVATE FORMAT HELPERS
    // Small, focused methods that convert Eloquent models to plain arrays.
    // They live here (not in the service) because they serve the API response
    // shape, which is a controller/presentation concern.
    // ──────────────────────────────────────────────────────────────────────────

    private function formatRider(Rider $rider): array
    {
        return [
            'id'     => $rider->id,
            'name'   => $rider->user->name,
            'email'  => $rider->user->email,
            'phone'  => $rider->user->phone,
            'status' => $rider->status,
        ];
    }

    private function formatRoute(RiderRoute $route): array
    {
        return [
            'id'                   => $route->id,
            'date'                 => $route->route_date->format('Y-m-d'),
            'total_distance'       => (float) $route->total_distance,
            'total_duration'       => $route->total_duration,
            'avg_speed'            => $route->avg_speed  ? (float) $route->avg_speed  : null,
            'max_speed'            => $route->max_speed  ? (float) $route->max_speed  : null,
            'location_points_count' => $route->location_points_count,
            'tracking_status'      => $route->checkIn?->isPaused() ? 'paused' : ($route->ended_at ? 'stopped' : 'active'),
        ];
    }

    private function formatGpsPoint(RiderGpsPoint $point, bool $detailed = false): array
    {
        $base = [
            'id'          => $point->id,
            'latitude'    => (float) $point->latitude,
            'longitude'   => (float) $point->longitude,
            'speed'       => $point->speed ? (float) $point->speed : null,
            'recorded_at' => $point->recorded_at->toIso8601String(),
        ];

        if ($detailed) {
            $base['accuracy'] = $point->accuracy ? (float) $point->accuracy : null;
            $base['heading']  = $point->heading  ? (float) $point->heading  : null;
        }

        return $base;
    }

    private function formatCampaign(Campaign $campaign): array
    {
        return [
            'id'     => $campaign->id,
            'name'   => $campaign->name,
            'status' => $campaign->status,
        ];
    }

    private function validationError(\Illuminate\Validation\Validator $validator): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => 'Validation failed.',
            'errors'  => $validator->errors(),
        ], 422);
    }

    private function serverError(Exception $e): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => $e->getMessage(),
        ], $e->getCode() ?: 500);
    }
}