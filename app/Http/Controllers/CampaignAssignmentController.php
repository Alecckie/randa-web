<?php

namespace App\Http\Controllers;

use App\Http\Requests\AssignRiderRequest;
use App\Models\Campaign;
use App\Models\CampaignAssignment;
use App\Models\RiderCheckIn;
use App\Services\CampaignAssignmentService;
use App\Services\CampaignService;
use App\Services\NotificationService;
use App\Services\Shift\RiderPayoutService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CampaignAssignmentController extends Controller
{

    protected $assignmentService, $campaignService, $notificationService;

    public function __construct(CampaignAssignmentService $assignmentService, CampaignService $campaignService, NotificationService $notificationService)
    {
        $this->assignmentService = $assignmentService;
        $this->campaignService = $campaignService;
        $this->notificationService = $notificationService;
    }


    /**
     * Assign a rider to the campaign
     */
    public function assignRider(AssignRiderRequest $request, Campaign $campaign)
    {
        try {
            $validated = $request->validated();

            $assignment = $this->assignmentService->assignRider(
                $campaign,
                $validated['rider_id'],
                $validated['helmet_id']
            );

            $this->notificationService->notifyRiderAssigned($assignment);

            return redirect()
                ->route('campaigns.show', $campaign->id)
                ->with('success', 'Rider assigned successfully to campaign.');
        } catch (\Exception $e) {
            return back()->withErrors(['assignment' => $e->getMessage()]);
        }
    }

    /**
     * Remove a rider assignment from campaign
     */
    public function removeAssignment(Campaign $campaign, $assignmentId)
    {
        try {
            $assignment = $campaign->assignments()->findOrFail($assignmentId);

            $this->assignmentService->removeAssignment($assignment);

            return redirect()
                ->route('campaigns.show', $campaign->id)
                ->with('success', 'Rider assignment removed successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', 'Failed to remove assignment. Please try again.');
        }
    }

    /**
     * Mark assignment as completed
     */
    public function completeAssignment(Campaign $campaign, $assignmentId)
    {
        try {
            $assignment = $campaign->assignments()->findOrFail($assignmentId);

            $this->assignmentService->completeAssignment($assignment);

            return redirect()
                ->route('campaigns.show', $campaign->id)
                ->with('success', 'Assignment marked as completed.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', 'Failed to complete assignment. Please try again.');
        }
    }

    /**
     * A rider's activity, earnings, and check-ins scoped to this one
     * campaign assignment only — "view this rider's activity for this
     * campaign" from the Assigned Riders actions menu on Campaigns/Show.
     */
    public function assignmentActivity(Campaign $campaign, $assignmentId, RiderPayoutService $payoutService)
    {
        $assignment = $campaign->assignments()->with(['rider.user', 'helmet'])->findOrFail($assignmentId);

        $checkIns = RiderCheckIn::where('campaign_assignment_id', $assignment->id)
            ->orderByDesc('check_in_date')
            ->get();

        $timeline = collect();

        $timeline->push([
            'type' => 'campaign_assigned',
            'title' => 'Assigned to Campaign',
            'description' => 'Helmet ' . ($assignment->helmet->helmet_code ?? 'N/A'),
            'timestamp' => $assignment->assigned_at,
        ]);

        foreach ($checkIns as $checkIn) {
            $timeline->push([
                'type' => 'shift_started',
                'title' => 'Started Shift',
                'description' => $checkIn->check_in_date->format('M j, Y'),
                'timestamp' => $checkIn->check_in_time,
            ]);

            if ($checkIn->status === RiderCheckIn::STATUS_ENDED && $checkIn->check_out_time) {
                $isAutoClosed = $checkIn->end_reason === RiderCheckIn::END_REASON_AUTO_CLOSED;

                $timeline->push([
                    'type' => $isAutoClosed ? 'shift_auto_closed' : 'shift_ended',
                    'title' => $isAutoClosed ? 'Shift Auto-Closed' : 'Ended Shift',
                    'description' => sprintf(
                        '%.2fh worked, KSh %.2f earned',
                        (float) $checkIn->worked_hours,
                        (float) $checkIn->daily_earning
                    ),
                    'timestamp' => $checkIn->check_out_time,
                ]);
            }
        }

        if ($assignment->completed_at) {
            $timeline->push([
                'type' => 'campaign_assignment_completed',
                'title' => 'Completed Campaign Assignment',
                'description' => $campaign->name,
                'timestamp' => $assignment->completed_at,
            ]);
        }

        $timeline = $timeline
            ->sortByDesc('timestamp')
            ->values()
            ->map(fn (array $event) => [
                ...$event,
                'timestamp' => $event['timestamp']->toIso8601String(),
                'time_human' => $event['timestamp']->diffForHumans(),
            ])
            ->all();

        return Inertia::render('Campaigns/RiderAssignmentActivity', [
            'campaign' => [
                'id' => $campaign->id,
                'name' => $campaign->name,
                'start_date' => $campaign->start_date,
                'end_date' => $campaign->end_date,
                'status' => $campaign->status,
            ],
            'assignment' => [
                'id' => $assignment->id,
                'status' => $assignment->status,
                'assigned_at' => $assignment->assigned_at,
                'completed_at' => $assignment->completed_at,
                'helmet_code' => $assignment->helmet->helmet_code ?? null,
            ],
            'rider' => [
                'id' => $assignment->rider->id,
                'name' => $assignment->rider->user->name,
                'email' => $assignment->rider->user->email,
                'phone' => $assignment->rider->user->phone,
                'daily_rate' => $assignment->rider->daily_rate,
            ],
            'earnings' => $payoutService->summaryForAssignment($assignment->id),
            'checkIns' => $checkIns->map(fn (RiderCheckIn $c) => [
                'id' => $c->id,
                'date' => $c->check_in_date->toDateString(),
                'check_in_time' => $c->check_in_time?->format('h:i A'),
                'check_out_time' => $c->check_out_time?->format('h:i A'),
                'status' => $c->status,
                'end_reason' => $c->end_reason,
                'worked_hours' => (float) $c->worked_hours,
                'daily_earning' => (float) $c->daily_earning,
            ])->values(),
            'activityTimeline' => $timeline,
        ]);
    }

    /**
     * Update campaign status
     */
    public function updateStatus(Request $request, Campaign $campaign)
    {
        $request->validate([
            'status' => 'required|in:draft,submitted,active,paused,completed,cancelled',
        ]);

        try {
            $this->campaignService->updateCampaignStatus($campaign, $request->status);

            return redirect()
                ->route('campaigns.show', $campaign->id)
                ->with('success', 'Campaign status updated successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }

    /**
     * Auto-assign riders to campaign
     */
    public function autoAssignRiders(Request $request, Campaign $campaign)
    {
        $request->validate([
            'count' => 'required|integer|min:1|max:' . $campaign->helmet_count,
        ]);

        try {
            $result = $this->assignmentService->autoAssignRiders(
                $campaign,
                $request->count
            );

            foreach ($result['assignments'] as $assignment) {
                $this->notificationService->notifyRiderAssigned($assignment);
            }

            $message = "Successfully assigned " . count($result['assignments']) . " riders.";

            if (!empty($result['errors'])) {
                $message .= " Some assignments failed: " . implode(', ', $result['errors']);
            }

            return redirect()
                ->route('campaigns.show', $campaign->id)
                ->with('success', $message);
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }

    /**
     * Revoke all active helmet assignments for a completed campaign,
     * returning each helmet to 'available' so it can be reassigned.
     */
    public function revokeAllHelmets(Campaign $campaign)
    {
        if ($campaign->status !== 'completed') {
            return back()->with('error', 'Helmets can only be revoked after a campaign is completed.');
        }

        $active = $campaign->assignments()->where('status', 'active')->get();

        if ($active->isEmpty()) {
            return back()->with('error', 'No active helmet assignments to revoke.');
        }

        $count = 0;
        foreach ($active as $assignment) {
            $this->assignmentService->completeAssignment($assignment);
            $count++;
        }

        return back()->with('success', "{$count} helmet(s) revoked and returned to the available pool.");
    }

    /**
     * Get assignment statistics for a campaign
     */
    public function assignmentStats(Campaign $campaign)
    {
        $stats = $this->assignmentService->getAssignmentStats($campaign);

        return response()->json($stats);
    }
}
