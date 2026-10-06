<?php

namespace App\Http\Controllers\Api;

use App\Models\CampaignAssignment;
use App\Services\CampaignAssignmentService;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class RiderAssignmentController extends BaseApiController
{
    public function __construct(
        private CampaignAssignmentService $assignmentService,
        private NotificationService $notificationService,
    ) {}

    /**
     * GET /api/v1/rider/assignments/pending
     */
    public function pending(): JsonResponse
    {
        $rider = Auth::user()->rider;

        if (!$rider) {
            return $this->sendError('Rider profile not found.', [], 404);
        }

        $assignments = CampaignAssignment::where('rider_id', $rider->id)
            ->where('status', 'pending')
            ->with(['campaign', 'helmet'])
            ->get()
            ->map(fn (CampaignAssignment $a) => $this->formatAssignment($a));

        return $this->sendResponse(['assignments' => $assignments], 'Pending assignments retrieved.');
    }

    /**
     * PATCH /api/v1/rider/assignments/{assignment}/accept
     */
    public function accept(CampaignAssignment $assignment): JsonResponse
    {
        $this->authorizeAssignmentOwnership($assignment);

        try {
            $assignment = $this->assignmentService->acceptAssignment($assignment);
            $this->notificationService->notifyAdminAssignmentAccepted($assignment);

            return $this->sendResponse(
                ['assignment' => $this->formatAssignment($assignment)],
                'Assignment accepted. You are now onboarded to the campaign.'
            );
        } catch (\Exception $e) {
            return $this->sendError($e->getMessage(), [], 422);
        }
    }

    /**
     * PATCH /api/v1/rider/assignments/{assignment}/reject
     */
    public function reject(Request $request, CampaignAssignment $assignment): JsonResponse
    {
        $this->authorizeAssignmentOwnership($assignment);

        $request->validate([
            'reason' => 'nullable|string|max:500',
        ]);

        try {
            $assignment = $this->assignmentService->rejectAssignment($assignment, $request->input('reason'));
            $this->notificationService->notifyAdminAssignmentRejected($assignment);

            return $this->sendResponse(
                ['assignment' => $this->formatAssignment($assignment)],
                'Assignment rejected.'
            );
        } catch (\Exception $e) {
            return $this->sendError($e->getMessage(), [], 422);
        }
    }

    private function authorizeAssignmentOwnership(CampaignAssignment $assignment): void
    {
        $rider = Auth::user()->rider;

        if (!$rider || $assignment->rider_id !== $rider->id) {
            abort(403, 'You are not authorized to access this assignment.');
        }
    }

    private function formatAssignment(CampaignAssignment $assignment): array
    {
        return [
            'id' => $assignment->id,
            'campaign_id' => $assignment->campaign_id,
            'campaign_name' => $assignment->campaign->name ?? null,
            'helmet_code' => $assignment->helmet->helmet_code ?? null,
            'status' => $assignment->status,
            'assigned_at' => $assignment->assigned_at,
            'responded_at' => $assignment->responded_at,
            'rejection_reason' => $assignment->rejection_reason,
        ];
    }
}
