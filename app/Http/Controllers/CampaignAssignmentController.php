<?php

namespace App\Http\Controllers;

use App\Http\Requests\AssignRiderRequest;
use App\Models\Campaign;
use App\Models\CampaignAssignment;
use App\Services\CampaignAssignmentService;
use App\Services\CampaignService;
use Illuminate\Http\Request;

class CampaignAssignmentController extends Controller
{

    protected $assignmentService,$campaignService;

    public function __construct(CampaignAssignmentService $assignmentService,CampaignService $campaignService)
    {
        $this->assignmentService = $assignmentService;
        $this->campaignService = $campaignService;
    }


    /**
     * Assign a rider to the campaign
     */
    public function assignRider(AssignRiderRequest $request, Campaign $campaign)
    {
        // try {
            $validated = $request->validated();
            
            $this->assignmentService->assignRider(
                $campaign,
                $validated['rider_id'],
                $validated['helmet_id']
            );

            return redirect()
                ->route('campaigns.show', $campaign->id)
                ->with('success', 'Rider assigned successfully to campaign.');
                
        // } catch (\Exception $e) {
        //     return redirect()
        //         ->back()
        //         ->with('error', $e->getMessage());
        // }
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
     * Update campaign status
     */
    public function updateStatus(Request $request, Campaign $campaign)
    {
        $request->validate([
            'status' => 'required|in:draft,pending_payment,paid,active,paused,completed,cancelled',
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

            $message = "Successfully assigned {$result['assignments']->count()} riders.";
            
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
     * Get assignment statistics for a campaign
     */
    public function assignmentStats(Campaign $campaign)
    {
        $stats = $this->assignmentService->getAssignmentStats($campaign);

        return response()->json($stats);
    }
}
