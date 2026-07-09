<?php

namespace App\Http\Controllers;

use App\Models\Rider;
use App\Services\NotificationService;
use App\Services\RiderService;

class ApproveRiderController extends Controller
{
    public function __invoke(Rider $rider, RiderService $riderService, NotificationService $notificationService)
    {
        try {
            if ($rider->status !== 'pending') {
                return back()->with('error', 'Only pending applications can be approved.');
            }

            $riderService->approveRider($rider);
            $notificationService->notifyRiderApproved($rider);

            return back()->with('success', 'Rider application approved successfully.');
        } catch (\Exception $e) {
            return back()->with('error', 'Failed to approve rider application: ' . $e->getMessage());
        }
    }
}
