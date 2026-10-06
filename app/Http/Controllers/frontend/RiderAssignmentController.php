<?php

namespace App\Http\Controllers\frontend;

use App\Http\Controllers\Controller;
use App\Models\CampaignAssignment;
use App\Services\CampaignAssignmentService;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class RiderAssignmentController extends Controller
{
    public function __construct(
        private CampaignAssignmentService $assignmentService,
        private NotificationService $notificationService,
    ) {}

    public function accept($assignmentId)
    {
        $assignment = $this->ownedPendingAssignment($assignmentId);

        try {
            $assignment = $this->assignmentService->acceptAssignment($assignment);
            $this->notificationService->notifyAdminAssignmentAccepted($assignment);

            return back()->with('success', 'Assignment accepted. You are now onboarded to the campaign.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    public function reject(Request $request, $assignmentId)
    {
        $request->validate([
            'reason' => 'nullable|string|max:500',
        ]);

        $assignment = $this->ownedPendingAssignment($assignmentId);

        try {
            $assignment = $this->assignmentService->rejectAssignment($assignment, $request->input('reason'));
            $this->notificationService->notifyAdminAssignmentRejected($assignment);

            return back()->with('success', 'Assignment rejected.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    private function ownedPendingAssignment($assignmentId): CampaignAssignment
    {
        $rider = Auth::user()->rider;

        abort_if(!$rider, 403);

        return CampaignAssignment::where('id', $assignmentId)
            ->where('rider_id', $rider->id)
            ->firstOrFail();
    }
}
