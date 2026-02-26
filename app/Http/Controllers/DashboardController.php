<?php

namespace App\Http\Controllers;

use App\Models\Campaign;
use App\Models\CampaignAssignment;
use App\Models\Helmet;
use App\Models\Rider;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        $user = auth()->user();
        
        // Get real data from database
        $activeCampaigns = Campaign::where('status', 'active')->count();
        $totalRiders = Rider::count(); // Count actual rider records, not users with rider role
        $totalHelmets = Helmet::count();
        
        // Quick links data
        $ridersAwaitingApproval = Rider::where('status', 'pending')->count();
        $campaignsAwaitingApproval = Campaign::where('status', 'pending')->count();
        $ridersAwaitingDisbursement = Rider::whereHas('assignments', function($query) {
            $query->where('status', 'completed')
                  ->whereNull('disbursed_at');
        })->count();

        // Recent activities from database
        $recentActivities = collect();
        
        // New riders registered (last 7 days)
        $newRiders = User::where('role', 'rider')
            ->where('created_at', '>=', now()->subDays(7))
            ->latest()
            ->take(5)
            ->get()
            ->map(function($rider) {
                return [
                    'id' => 'rider_' . $rider->id,
                    'action' => 'New rider registered',
                    'user' => $rider->name,
                    'time' => $rider->created_at->diffForHumans(),
                    'type' => 'rider',
                    'created_at' => $rider->created_at
                ];
            });
        
        // New campaigns (last 7 days)
        $newCampaigns = Campaign::where('created_at', '>=', now()->subDays(7))
            ->latest()
            ->take(5)
            ->get()
            ->map(function($campaign) {
                return [
                    'id' => 'campaign_' . $campaign->id,
                    'action' => 'New campaign created',
                    'user' => $campaign->name,
                    'time' => $campaign->created_at->diffForHumans(),
                    'type' => 'campaign',
                    'created_at' => $campaign->created_at
                ];
            });
        
        // New helmets (last 7 days)
        $newHelmets = Helmet::where('created_at', '>=', now()->subDays(7))
            ->latest()
            ->take(5)
            ->get()
            ->map(function($helmet) {
                return [
                    'id' => 'helmet_' . $helmet->id,
                    'action' => 'New helmet added',
                    'user' => $helmet->helmet_code,
                    'time' => $helmet->created_at->diffForHumans(),
                    'type' => 'helmet',
                    'created_at' => $helmet->created_at
                ];
            });
        
        // Helmet assignments (last 7 days)
        $helmetAssignments = CampaignAssignment::with(['helmet', 'rider.user'])
            ->where('created_at', '>=', now()->subDays(7))
            ->latest()
            ->take(5)
            ->get()
            ->map(function($assignment) {
                return [
                    'id' => 'assignment_' . $assignment->id,
                    'action' => 'Helmet assigned to rider',
                    'user' => $assignment->rider->user->name . ' (' . $assignment->helmet->helmet_code . ')',
                    'time' => $assignment->created_at->diffForHumans(),
                    'type' => 'assignment',
                    'created_at' => $assignment->created_at
                ];
            });
        
        // Closed campaigns (last 7 days)
        $closedCampaigns = Campaign::where('status', 'completed')
            ->where('updated_at', '>=', now()->subDays(7))
            ->latest('updated_at')
            ->take(5)
            ->get()
            ->map(function($campaign) {
                return [
                    'id' => 'closed_' . $campaign->id,
                    'action' => 'Campaign closed',
                    'user' => $campaign->name,
                    'time' => $campaign->updated_at->diffForHumans(),
                    'type' => 'campaign_closed',
                    'created_at' => $campaign->updated_at
                ];
            });
        
        // Merge and sort all activities
        $recentActivities = $newRiders
            ->concat($newCampaigns)
            ->concat($newHelmets)
            ->concat($helmetAssignments)
            ->concat($closedCampaigns)
            ->sortByDesc('created_at')
            ->take(15)
            ->values();

        return Inertia::render('Dashboard', [
            'dashboardData' => [
                'activeCampaigns' => $activeCampaigns,
                'totalRiders' => $totalRiders,
                'totalHelmets' => $totalHelmets,
                'ridersAwaitingApproval' => $ridersAwaitingApproval,
                'campaignsAwaitingApproval' => $campaignsAwaitingApproval,
                'ridersAwaitingDisbursement' => $ridersAwaitingDisbursement,
                'recentActivities' => $recentActivities,
            ]
        ]);
    }
}