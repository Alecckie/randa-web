<?php

namespace App\Http\Controllers;

use App\Models\Rider;
use App\Services\NotificationService;
use App\Services\RiderService;
use Illuminate\Http\Request;

class RejectRiderController extends Controller
{
    public function __invoke(Request $request, Rider $rider, RiderService $riderService, NotificationService $notificationService)
    {
        $request->validate([
            'reason' => 'required|string|min:10|max:1000',
        ]);

        try {
            if ($rider->status !== 'pending') {
                return back()->with('error', 'Only pending applications can be rejected.');
            }

            $riderService->rejectRider($rider, $request->reason, auth()->id());
            $notificationService->notifyRiderRejected($rider, $request->reason);

            return back()->with('success', 'Rider application rejected successfully.');
        } catch (\Exception $e) {
            return back()->with('error', 'Failed to reject rider application: ' . $e->getMessage());
        }
    }
}
