<?php

namespace App\Http\Controllers\Api;

use App\Models\CampaignAssignment;
use App\Models\RiderCheckIn;
use App\Services\RiderService;
use App\Services\Shift\RiderPayoutService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class RiderCampaignsController extends BaseApiController
{
    public function __construct(
        private RiderService $riderService,
        private RiderPayoutService $payoutService,
    ) {}

    /**
     * GET /api/v1/rider/campaigns
     *
     * This rider's campaign assignments — current and past — each with a
     * lightweight earnings summary (days worked, total earned). Pass
     * ?status=completed for past campaigns only. For the full day-by-day
     * breakdown of one campaign, call show().
     */
    public function index(Request $request): JsonResponse
    {
        $rider = $this->riderService->getRiderByUserId(Auth::id());

        if (!$rider) {
            return $this->sendError('Rider profile not found.', [], 404);
        }

        $query = CampaignAssignment::where('rider_id', $rider->id)
            ->with(['campaign:id,name,status,start_date,end_date', 'helmet:id,helmet_code'])
            ->orderByDesc('assigned_at');

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        $assignments = $query->paginate($request->integer('per_page', 15));

        // One grouped query for every assignment on this page, instead of
        // calling RiderPayoutService per row (which would be 2 queries per
        // assignment) — the list view only needs the totals, not the
        // per-day breakdown, so it stays cheap regardless of page size.
        $assignmentIds = collect($assignments->items())->pluck('id');

        $earnings = RiderCheckIn::whereIn('campaign_assignment_id', $assignmentIds)
            ->where('status', RiderCheckIn::STATUS_ENDED)
            ->selectRaw('
                campaign_assignment_id,
                COUNT(*) AS days_worked,
                COALESCE(SUM(daily_earning), 0) AS total_earning
            ')
            ->groupBy('campaign_assignment_id')
            ->get()
            ->keyBy('campaign_assignment_id');

        $assignments->getCollection()->transform(function (CampaignAssignment $assignment) use ($earnings) {
            $summary = $earnings->get($assignment->id);

            return [
                'assignment_id' => $assignment->id,
                'status'        => $assignment->status,
                'assigned_at'   => $assignment->assigned_at,
                'responded_at'  => $assignment->responded_at,
                'completed_at'  => $assignment->completed_at,
                'campaign'      => $this->formatCampaign($assignment),
                'helmet'        => $this->formatHelmet($assignment),
                'days_worked'   => (int) ($summary->days_worked ?? 0),
                'total_earning' => round((float) ($summary->total_earning ?? 0), 2),
            ];
        });

        return $this->sendResponse($assignments, 'Campaigns retrieved.');
    }

    /**
     * GET /api/v1/rider/campaigns/{assignment}
     *
     * Full day-by-day earnings breakdown for one specific campaign
     * assignment — "trip details" for a single past (or current) campaign.
     * {assignment} is the campaign_assignments.id from index() above, not
     * a campaign id — a rider can have more than one assignment against the
     * same campaign over time (e.g. rejected once, re-offered later).
     */
    public function show(CampaignAssignment $assignment): JsonResponse
    {
        $rider = $this->riderService->getRiderByUserId(Auth::id());

        if (!$rider) {
            return $this->sendError('Rider profile not found.', [], 404);
        }

        if ($assignment->rider_id !== $rider->id) {
            return $this->sendError('You are not authorized to access this campaign.', [], 403);
        }

        $assignment->load(['campaign', 'helmet']);

        return $this->sendResponse([
            'assignment' => [
                'assignment_id' => $assignment->id,
                'status'        => $assignment->status,
                'assigned_at'   => $assignment->assigned_at,
                'responded_at'  => $assignment->responded_at,
                'completed_at'  => $assignment->completed_at,
            ],
            'campaign' => $this->formatCampaign($assignment),
            'helmet'   => $this->formatHelmet($assignment),
            'summary'  => $this->payoutService->summaryForAssignment($assignment->id),
        ], 'Campaign details retrieved.');
    }

    private function formatCampaign(CampaignAssignment $assignment): ?array
    {
        if (!$assignment->campaign) {
            return null;
        }

        return [
            'id'         => $assignment->campaign->id,
            'name'       => $assignment->campaign->name,
            'status'     => $assignment->campaign->status,
            'start_date' => $assignment->campaign->start_date?->toDateString(),
            'end_date'   => $assignment->campaign->end_date?->toDateString(),
        ];
    }

    private function formatHelmet(CampaignAssignment $assignment): ?array
    {
        if (!$assignment->helmet) {
            return null;
        }

        return [
            'id'          => $assignment->helmet->id,
            'helmet_code' => $assignment->helmet->helmet_code,
        ];
    }
}
