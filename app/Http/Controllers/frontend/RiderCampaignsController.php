<?php

namespace App\Http\Controllers\frontend;

use App\Http\Controllers\Controller;
use App\Services\LocationService;
use App\Services\RiderService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class RiderCampaignsController extends Controller
{

    public function __construct(
        private RiderService $riderService,
        private LocationService $locationService
    )
    {
        
    }
    /**
     * Handle the incoming request.
     */
    public function __invoke(Request $request)
    {
        //
          $user = Auth::user();

    // Get rider profile
    $rider = $this->riderService->getRiderByUserId($user->id);

    if (!$rider) {
        return redirect()
            ->route('rider.profile')
            ->with('error', 'Please complete your profile first.');
    }

    // Get filters from request
    $filters = [
        'status' => $request->input('status'),
        'campaign_status' => $request->input('campaign_status'),
        'search' => $request->input('search'),
        'date_from' => $request->input('date_from'),
        'date_to' => $request->input('date_to'),
        'per_page' => $request->input('per_page', 15),
    ];

    // Get paginated campaigns for this rider
    $campaigns = $this->riderService->getCampaignsForRider($rider, $filters);

    // Get campaign statistics for this rider
    $stats = $this->riderService->getRiderCampaignStats($rider);

    // Format campaigns data for frontend
    $formattedCampaigns = $campaigns->through(function ($campaign) {
        $assignment = $campaign->assignments->first();
        
        return [
            'id' => $campaign->id,
            'name' => $campaign->name,
            'start_date' => $campaign->start_date->format('Y-m-d'),
            'end_date' => $campaign->end_date->format('Y-m-d'),
            'status' => $campaign->status,
            'duration_days' => $campaign->duration_days,
            'is_active' => $campaign->is_active,
            'assignment' => $assignment ? [
                'id' => $assignment->id,
                'tracking_tag' => $assignment->tracking_tag,
                'assigned_at' => $assignment->assigned_at->format('Y-m-d H:i:s'),
                'completed_at' => $assignment->completed_at?->format('Y-m-d H:i:s'),
                'status' => $assignment->status,
                'days_worked' => $assignment->assigned_at && $assignment->completed_at
                    ? $assignment->assigned_at->diffInDays($assignment->completed_at) + 1
                    : ($assignment->status === 'active' 
                        ? $assignment->assigned_at->diffInDays(now()) + 1 
                        : 0),
            ] : null,
        ];
    });

    return Inertia::render('front-end/Riders/Campaigns', [
        'campaigns' => $formattedCampaigns,
        'stats' => $stats,
        'filters' => $filters,
        'rider' => [
            'id' => $rider->id,
            'status' => $rider->status,
            'wallet_balance' => $rider->wallet_balance,
        ],
    ]);
    }
}
