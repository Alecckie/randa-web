<?php

namespace App\Http\Controllers;

use App\Models\Campaign;
use App\Models\CampaignAssignment;
use App\Models\CampaignStatusHistory;
use App\Models\Helmet;
use App\Models\Payment;
use App\Models\Rider;
use App\Models\RiderCheckIn;
use App\Models\RiderPauseEvent;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index()
    {
        $user = auth()->user();

        // Redirect riders and advertisers to their own dashboards
        if ($user->role === 'rider') {
            return redirect()->route('rider.rider-dash.index');
        }
        if ($user->role === 'advertiser') {
            return redirect()->route('advert-dash.index');
        }
        
        // Get real data from database
        $activeCampaigns = Campaign::where('status', 'active')->count();
        $totalRiders     = Rider::count();
        $totalHelmets    = Helmet::count();
        $totalPayments   = (float) Payment::where('status', 'completed')->sum('amount');
        
        // Quick links data
        $ridersAwaitingApproval = Rider::where('status', 'pending')->count();
        $campaignsAwaitingApproval = Campaign::where('status', 'submitted')->count();
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
                    'user' => $assignment->rider->user->name . ' (' . ($assignment->helmet->helmet_code ?? 'deleted helmet') . ')',
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

        // Campaign status changes (last 7 days) — from the dedicated history
        // table, not just the "closed" special case above.
        $campaignStatusChanges = CampaignStatusHistory::with('campaign')
            ->where('created_at', '>=', now()->subDays(7))
            ->latest()
            ->take(5)
            ->get()
            ->map(function ($history) {
                return [
                    'id' => 'status_change_' . $history->id,
                    'action' => 'Campaign status changed',
                    'user' => ($history->campaign->name ?? 'Deleted campaign')
                        . ': ' . ucfirst($history->old_status) . ' → ' . ucfirst($history->new_status),
                    'time' => $history->created_at->diffForHumans(),
                    'type' => 'campaign_status_change',
                    'created_at' => $history->created_at,
                ];
            });

        // Riders going live (checking in / resuming) — last 7 days
        $ridersLive = RiderCheckIn::with('rider.user')
            ->whereIn('status', [RiderCheckIn::STATUS_STARTED, RiderCheckIn::STATUS_RESUMED])
            ->where('check_in_time', '>=', now()->subDays(7))
            ->latest('check_in_time')
            ->take(5)
            ->get()
            ->map(function ($checkIn) {
                return [
                    'id' => 'rider_live_' . $checkIn->id,
                    'action' => 'Rider went live',
                    'user' => $checkIn->rider->user->name ?? 'Unknown rider',
                    'time' => $checkIn->check_in_time->diffForHumans(),
                    'type' => 'rider_live',
                    'created_at' => $checkIn->check_in_time,
                ];
            });

        // Riders pausing their shift — last 7 days
        $ridersPaused = RiderPauseEvent::with('rider.user')
            ->where('paused_at', '>=', now()->subDays(7))
            ->latest('paused_at')
            ->take(5)
            ->get()
            ->map(function ($pause) {
                return [
                    'id' => 'rider_paused_' . $pause->id,
                    'action' => 'Rider paused shift',
                    'user' => $pause->rider->user->name ?? 'Unknown rider',
                    'time' => $pause->paused_at->diffForHumans(),
                    'type' => 'rider_paused',
                    'created_at' => $pause->paused_at,
                ];
            });

        // Riders ending/leaving their shift — last 7 days
        $ridersLeaving = RiderCheckIn::with('rider.user')
            ->where('status', RiderCheckIn::STATUS_ENDED)
            ->whereNotNull('check_out_time')
            ->where('check_out_time', '>=', now()->subDays(7))
            ->latest('check_out_time')
            ->take(5)
            ->get()
            ->map(function ($checkIn) {
                return [
                    'id' => 'rider_leaving_' . $checkIn->id,
                    'action' => $checkIn->end_reason === RiderCheckIn::END_REASON_AUTO_CLOSED
                        ? 'Rider shift auto-closed'
                        : 'Rider ended shift',
                    'user' => $checkIn->rider->user->name ?? 'Unknown rider',
                    'time' => $checkIn->check_out_time->diffForHumans(),
                    'type' => 'rider_leaving',
                    'created_at' => $checkIn->check_out_time,
                ];
            });

        // Merge and sort all activities
        $recentActivities = $newRiders
            ->concat($newCampaigns)
            ->concat($newHelmets)
            ->concat($helmetAssignments)
            ->concat($closedCampaigns)
            ->concat($campaignStatusChanges)
            ->concat($ridersLive)
            ->concat($ridersPaused)
            ->concat($ridersLeaving)
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
                'totalPayments'    => $totalPayments,
            ]
        ]);
    }
}