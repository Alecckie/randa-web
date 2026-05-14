<?php

namespace App\Http\Controllers;

use App\Models\Advertiser;
use App\Models\Campaign;
use App\Models\CampaignAssignment;
use App\Models\RiderCheckIn;
use App\Models\RiderRoute;
use App\Models\SelfiePrompt;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class CampaignAnalyticsController extends Controller
{
    /** Advertiser: analytics index page */
    public function advertiserIndex(): Response
    {
        $user = Auth::user();
        $advertiser = Advertiser::where('user_id', $user->id)->first();

        $campaigns = $advertiser
            ? Campaign::where('advertiser_id', $advertiser->id)
                ->whereIn('status', ['active', 'paused', 'completed'])
                ->orderByDesc('start_date')
                ->select('id', 'name', 'status', 'start_date', 'end_date', 'helmet_count')
                ->get()
                ->map(fn ($c) => [
                    'id'          => $c->id,
                    'name'        => $c->name,
                    'status'      => $c->status,
                    'start_date'  => $c->start_date?->format('Y-m-d'),
                    'end_date'    => $c->end_date?->format('Y-m-d'),
                    'helmet_count'=> $c->helmet_count,
                ])
            : [];

        return Inertia::render('front-end/Advertisers/Analytics', [
            'campaigns' => $campaigns,
        ]);
    }

    /** Advertiser: analytics JSON for a specific campaign */
    public function advertiserAnalytics(int $campaignId): JsonResponse
    {
        $user = Auth::user();
        $advertiser = Advertiser::where('user_id', $user->id)->first();

        if (!$advertiser) {
            return response()->json(['message' => 'Advertiser not found'], 404);
        }

        $campaign = Campaign::where('id', $campaignId)
            ->where('advertiser_id', $advertiser->id)
            ->first();

        if (!$campaign) {
            return response()->json(['message' => 'Campaign not found'], 404);
        }

        return response()->json(['success' => true, 'data' => $this->buildAnalytics($campaign)]);
    }

    /** Admin: analytics index page with campaign selector */
    public function adminIndex(): Response
    {
        $campaigns = Campaign::with('advertiser:id,company_name')
            ->whereIn('status', ['active', 'paused', 'completed'])
            ->orderByDesc('start_date')
            ->select('id', 'name', 'status', 'start_date', 'end_date', 'helmet_count', 'advertiser_id')
            ->get()
            ->map(fn ($c) => [
                'id'          => $c->id,
                'name'        => $c->name,
                'advertiser'  => $c->advertiser?->company_name ?? 'Unknown',
                'status'      => $c->status,
                'start_date'  => $c->start_date?->format('Y-m-d'),
                'end_date'    => $c->end_date?->format('Y-m-d'),
                'helmet_count'=> $c->helmet_count,
            ]);

        return Inertia::render('Admin/Campaigns/Analytics', [
            'campaigns' => $campaigns,
        ]);
    }

    /** Admin: analytics JSON for any campaign */
    public function adminAnalytics(int $campaignId): JsonResponse
    {
        $campaign = Campaign::find($campaignId);

        if (!$campaign) {
            return response()->json(['message' => 'Campaign not found'], 404);
        }

        return response()->json(['success' => true, 'data' => $this->buildAnalytics($campaign)]);
    }

    /** Core analytics computation */
    private function buildAnalytics(Campaign $campaign): array
    {
        $today      = Carbon::today();
        $startDate  = $campaign->start_date;
        $endDate    = $campaign->end_date;

        $totalDays = ($startDate && $endDate)
            ? (int) ($startDate->diffInDays($endDate) + 1)
            : 0;

        if ($startDate && $today->gte($startDate)) {
            $currentDay = min($totalDays, (int) $startDate->diffInDays($today) + 1);
        } elseif ($startDate && $today->lt($startDate)) {
            $currentDay = 0;
        } else {
            $currentDay = $totalDays;
        }

        $daysRemaining = $endDate ? max(0, (int) $today->diffInDays($endDate, false)) : 0;

        // Active assignment IDs
        $assignmentIds = CampaignAssignment::where('campaign_id', $campaign->id)
            ->where('status', 'active')
            ->pluck('id');

        $assignedRiders = $assignmentIds->count();

        // Check-in aggregate
        $checkInStats = RiderCheckIn::whereIn('campaign_assignment_id', $assignmentIds)
            ->selectRaw("
                COUNT(*) as total_checkins,
                SUM(CASE WHEN status = 'ended' THEN 1 ELSE 0 END) as qualified_days,
                SUM(
                    CASE WHEN status = 'ended' AND check_in_time IS NOT NULL AND check_out_time IS NOT NULL
                    THEN TIMESTAMPDIFF(MINUTE, check_in_time, check_out_time) / 60.0
                    ELSE 0 END
                ) as total_active_hours,
                SUM(COALESCE(daily_earning, 0)) as total_earnings
            ")
            ->first();

        // Today stats
        $todayStats = RiderCheckIn::whereIn('campaign_assignment_id', $assignmentIds)
            ->whereDate('check_in_date', $today)
            ->selectRaw("
                COUNT(*) as today_checkins,
                SUM(CASE WHEN status != 'ended' THEN 1 ELSE 0 END) as today_active,
                SUM(CASE WHEN status = 'ended' THEN 1 ELSE 0 END) as today_completed
            ")
            ->first();

        // Total route distance
        $checkInIds   = RiderCheckIn::whereIn('campaign_assignment_id', $assignmentIds)->pluck('id');
        $totalDistance = (float) RiderRoute::whereIn('check_in_id', $checkInIds)->sum('total_distance');

        // Daily breakdown
        $impressionsPerKm = (int) config('campaign.impressions_per_km', 500);

        $dailyBreakdown = RiderCheckIn::whereIn('rider_check_ins.campaign_assignment_id', $assignmentIds)
            ->leftJoin('rider_routes', 'rider_routes.check_in_id', '=', 'rider_check_ins.id')
            ->selectRaw("
                DATE(rider_check_ins.check_in_date) as date,
                COUNT(*) as riders_checked_in,
                SUM(CASE WHEN rider_check_ins.status = 'ended' THEN 1 ELSE 0 END) as riders_completed,
                COALESCE(SUM(rider_routes.total_distance), 0) as distance_km,
                SUM(
                    CASE WHEN rider_check_ins.status = 'ended'
                         AND rider_check_ins.check_in_time IS NOT NULL
                         AND rider_check_ins.check_out_time IS NOT NULL
                    THEN TIMESTAMPDIFF(MINUTE, rider_check_ins.check_in_time, rider_check_ins.check_out_time) / 60.0
                    ELSE 0 END
                ) as active_hours
            ")
            ->groupByRaw("DATE(rider_check_ins.check_in_date)")
            ->orderByRaw("DATE(rider_check_ins.check_in_date) ASC")
            ->get()
            ->map(fn ($row) => [
                'date'             => $row->date,
                'riders_checked_in'=> (int) $row->riders_checked_in,
                'riders_completed' => (int) $row->riders_completed,
                'distance_km'      => round((float) $row->distance_km, 2),
                'active_hours'     => round((float) $row->active_hours, 1),
                'impressions'      => (int) ((float) $row->distance_km * $impressionsPerKm),
            ]);

        // Per-rider performance
        $riderPerformance = CampaignAssignment::where('campaign_id', $campaign->id)
            ->where('status', 'active')
            ->with('rider.user:id,name')
            ->get()
            ->map(function ($assignment) {
                $riderCheckInIds = RiderCheckIn::where('campaign_assignment_id', $assignment->id)->pluck('id');

                $stats = RiderCheckIn::where('campaign_assignment_id', $assignment->id)
                    ->selectRaw("
                        SUM(CASE WHEN status = 'ended' THEN 1 ELSE 0 END) as qualified_days,
                        SUM(
                            CASE WHEN status = 'ended' AND check_in_time IS NOT NULL AND check_out_time IS NOT NULL
                            THEN TIMESTAMPDIFF(MINUTE, check_in_time, check_out_time) / 60.0
                            ELSE 0 END
                        ) as total_hours,
                        SUM(COALESCE(daily_earning, 0)) as total_earnings
                    ")
                    ->first();

                $distance = (float) RiderRoute::whereIn('check_in_id', $riderCheckInIds)->sum('total_distance');

                return [
                    'rider_id'           => $assignment->rider_id,
                    'name'               => $assignment->rider?->user?->name ?? 'Unknown',
                    'qualified_days'     => (int) ($stats->qualified_days ?? 0),
                    'total_active_hours' => round((float) ($stats->total_hours ?? 0), 1),
                    'total_distance_km'  => round($distance, 2),
                    'total_earnings'     => round((float) ($stats->total_earnings ?? 0), 2),
                ];
            });

        $totalActiveHours     = (float) ($checkInStats->total_active_hours ?? 0);
        $estimatedImpressions = (int) ($totalDistance * $impressionsPerKm);
        $qualifiedDays        = (int) ($checkInStats->qualified_days ?? 0);
        $possibleRiderDays    = $assignedRiders * $totalDays;

        // Count real QR prompt submissions for riders in this campaign
        $riderIds    = CampaignAssignment::where('campaign_id', $campaign->id)
            ->where('status', 'active')
            ->pluck('rider_id');

        $totalQrScans = SelfiePrompt::whereIn('rider_id', $riderIds)
            ->whereIn('status', ['completed', 'accepted'])
            ->when($startDate, fn ($q) => $q->where('prompt_sent_at', '>=', $startDate->startOfDay()))
            ->when($endDate,   fn ($q) => $q->where('prompt_sent_at', '<=', $endDate->endOfDay()))
            ->count();

        return [
            'campaign' => [
                'id'             => $campaign->id,
                'name'           => $campaign->name,
                'status'         => $campaign->status,
                'start_date'     => $startDate?->format('Y-m-d'),
                'end_date'       => $endDate?->format('Y-m-d'),
                'total_days'     => $totalDays,
                'current_day'    => $currentDay,
                'days_remaining' => $daysRemaining,
                'helmet_count'   => $campaign->helmet_count,
            ],
            'summary' => [
                'assigned_riders'      => $assignedRiders,
                'total_checkins'       => (int) ($checkInStats->total_checkins ?? 0),
                'qualified_days'       => $qualifiedDays,
                'possible_rider_days'  => $possibleRiderDays,
                'utilization_rate'     => $possibleRiderDays > 0
                    ? round(($qualifiedDays / $possibleRiderDays) * 100, 1)
                    : 0.0,
                'total_active_hours'   => round($totalActiveHours, 1),
                'total_distance_km'    => round($totalDistance, 2),
                'estimated_impressions'=> $estimatedImpressions,
                'impressions_per_km'   => $impressionsPerKm,
                'total_qr_scans'       => $totalQrScans,
                'total_earnings_paid'  => round((float) ($checkInStats->total_earnings ?? 0), 2),
            ],
            'today' => [
                'riders_checked_in' => (int) ($todayStats->today_checkins ?? 0),
                'riders_active'     => (int) ($todayStats->today_active ?? 0),
                'riders_completed'  => (int) ($todayStats->today_completed ?? 0),
            ],
            'daily_breakdown' => $dailyBreakdown,
            'rider_performance' => $riderPerformance,
        ];
    }
}
