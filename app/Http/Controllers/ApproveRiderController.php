<?php

namespace App\Http\Controllers;

use App\Models\Rider;
use App\Services\RiderService;
use Illuminate\Http\Request;

class ApproveRiderController extends Controller
{
    /**
     * Handle the incoming request.
     */
    public function __invoke(Rider $rider, RiderService $riderService)
    {
        try {
            if ($rider->status !== 'pending') {
                return back()->with('error', 'Only pending applications can be approved.');
            }

            $riderService->approveRider($rider);

            // NotificationService::sendRiderApprovalNotification($approvedRider);

            return back()->with('success', 'Rider application approved successfully.');
        } catch (\Exception $e) {
            return back()->with('error', 'Failed to approve rider application: ' . $e->getMessage());
        }
    }
}
