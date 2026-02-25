<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Services\RiderTrackingService;
use App\Models\Campaign;
use App\Models\Rider;
use App\Models\RiderRoute;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Admin Tracking Controller (Web / Inertia)
 *
 * Thin controller: fetches data from RiderTrackingService,
 * shapes it for the Inertia page props, and renders the view.
 */
class TrackingController extends Controller
{
    public function __construct(
        private RiderTrackingService $trackingService
    ) {
        // $this->middleware(['auth', 'role:admin']);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // GET /admin/tracking
    // ──────────────────────────────────────────────────────────────────────────

    public function index(): Response
    {
        // getDashboardStats() now lives in the service — no duplication with the API controller
        $stats = $this->trackingService->getDashboardStats();

        $campaigns = Campaign::where('status', 'active')
            ->select('id', 'name')
            ->get()
            ->map(fn($c) => ['value' => (string) $c->id, 'label' => $c->name]);

        $riders = Rider::with('user')
            ->where('status', 'approved')
            ->get()
            ->map(fn($r) => ['value' => (string) $r->id, 'label' => $r->user->name]);

        // getLiveTrackingData() returns raw GPS models; enrich them with the
        // shared enrichLocation() helper so the Inertia page gets the same
        // shape as the API endpoint.
        $rawData = $this->trackingService->getLiveTrackingData();
        $initialData = [
            'active_riders' => $rawData['active_riders'],
            'last_updated'  => $rawData['last_updated'],
            'locations'     => $rawData['locations']->map(
                fn($point) => $this->trackingService->enrichLocation($point)
            )->values(),
        ];

        return Inertia::render('Tracking/Index', [
            'stats'       => $stats,
            'campaigns'   => $campaigns,
            'riders'      => $riders,
            'initialData' => $initialData,
        ]);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // GET /admin/tracking/rider/{riderId}
    // ──────────────────────────────────────────────────────────────────────────

    public function showRider(int $riderId): Response
    {
        $rider = Rider::with(['user', 'currentAssignment.campaign'])->findOrFail($riderId);

        $routes = RiderRoute::where('rider_id', $riderId)
            ->whereDate('route_date', '>=', now()->subDays(30))
            ->orderByDesc('route_date')
            ->get();

        $todayStats = $this->trackingService->getRiderStats($riderId, today());

        return Inertia::render('Admin/Tracking/RiderDetail', [
            'rider' => [
                'id'               => $rider->id,
                'name'             => $rider->user->name,
                'email'            => $rider->user->email,
                'phone'            => $rider->user->phone,
                'status'           => $rider->status,
                'current_campaign' => $rider->currentAssignment ? [
                    'id'   => $rider->currentAssignment->campaign_id,
                    'name' => $rider->currentAssignment->campaign->name,
                ] : null,
            ],
            'routes'     => $routes,
            'todayStats' => $todayStats,
        ]);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // GET /admin/tracking/campaign/{campaignId}
    // ──────────────────────────────────────────────────────────────────────────

    public function showCampaign(int $campaignId): Response
    {
        $campaign = Campaign::with(['assignments.rider.user'])->findOrFail($campaignId);

        $activeRiders = $campaign->assignments()
            ->where('status', 'active')
            ->with('rider.user')
            ->get()
            ->map(fn($a) => ['id' => $a->rider->id, 'name' => $a->rider->user->name]);

        $todayRoutes = RiderRoute::whereHas('campaignAssignment', fn($q) =>
            $q->where('campaign_id', $campaignId)
        )
            ->whereDate('route_date', today())
            ->get();

        $stats = [
            'active_riders'  => $activeRiders->count(),
            'total_distance' => $todayRoutes->sum('total_distance'),
            'total_duration' => $todayRoutes->sum('total_duration'),
            'avg_speed'      => $todayRoutes->avg('avg_speed'),
        ];

        return Inertia::render('Admin/Tracking/CampaignDetail', [
            'campaign' => [
                'id'          => $campaign->id,
                'name'        => $campaign->name,
                'description' => $campaign->description,
                'status'      => $campaign->status,
                'start_date'  => $campaign->start_date->format('Y-m-d'),
                'end_date'    => $campaign->end_date->format('Y-m-d'),
            ],
            'activeRiders' => $activeRiders,
            'stats'        => $stats,
        ]);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // GET /admin/tracking/route/{routeId}
    // ──────────────────────────────────────────────────────────────────────────

    public function showRoute(int $routeId): Response
    {
        $route = RiderRoute::with([
            'rider.user',
            'checkIn',
            'campaignAssignment.campaign',
        ])->findOrFail($routeId);

        return Inertia::render('Admin/Tracking/RouteDetail', [
            'route' => [
                'id'                   => $route->id,
                'date'                 => $route->route_date->format('Y-m-d'),
                'started_at'           => $route->started_at->format('H:i:s'),
                'ended_at'             => $route->ended_at?->format('H:i:s'),
                'total_distance'       => $route->total_distance,
                'total_duration'       => $route->total_duration,
                'avg_speed'            => $route->avg_speed,
                'max_speed'            => $route->max_speed,
                'location_points_count' => $route->location_points_count,
                'tracking_status'      => $route->tracking_status,
                'total_pause_duration' => $route->total_pause_duration,
                'pause_history'        => $route->pause_history,
            ],
            'rider' => [
                'id'    => $route->rider->id,
                'name'  => $route->rider->user->name,
                'email' => $route->rider->user->email,
                'phone' => $route->rider->user->phone,
            ],
            'campaign' => $route->campaignAssignment ? [
                'id'   => $route->campaignAssignment->campaign->id,
                'name' => $route->campaignAssignment->campaign->name,
            ] : null,
        ]);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // GET /admin/tracking/heatmap
    // ──────────────────────────────────────────────────────────────────────────

    public function heatmap(Request $request): Response
    {
        $campaigns = Campaign::where('status', 'active')
            ->select('id', 'name')
            ->get()
            ->map(fn($c) => ['value' => (string) $c->id, 'label' => $c->name]);

        return Inertia::render('Admin/Tracking/Heatmap', [
            'campaigns' => $campaigns,
        ]);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // GET /admin/tracking/analytics
    // ──────────────────────────────────────────────────────────────────────────

    public function analytics(): Response
    {
        $weeklyStats = collect(range(6, 0))->map(fn($i) => [
            'date'     => now()->subDays($i)->format('Y-m-d'),
            'distance' => RiderRoute::whereDate('route_date', now()->subDays($i))->sum('total_distance'),
            'riders'   => RiderRoute::whereDate('route_date', now()->subDays($i))->distinct('rider_id')->count(),
        ])->values();

        $topRiders = RiderRoute::with('rider.user')
            ->whereDate('route_date', '>=', now()->subDays(30))
            ->select('rider_id')
            ->selectRaw('SUM(total_distance) as total_distance')
            ->selectRaw('COUNT(*) as routes_count')
            ->groupBy('rider_id')
            ->orderByDesc('total_distance')
            ->limit(10)
            ->get()
            ->map(fn($r) => [
                'rider_id'       => $r->rider_id,
                'rider_name'     => $r->rider->user->name,
                'total_distance' => $r->total_distance,
                'routes_count'   => $r->routes_count,
            ]);

        return Inertia::render('Admin/Tracking/Analytics', [
            'weeklyStats' => $weeklyStats,
            'topRiders'   => $topRiders,
        ]);
    }
}