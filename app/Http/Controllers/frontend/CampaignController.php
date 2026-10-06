<?php

namespace App\Http\Controllers\frontend;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCampaignRequest;
use App\Http\Requests\UpdateCampaignRequest;
use App\Models\Advertiser;
use App\Models\Campaign;
use App\Models\CampaignStatusHistory;
use App\Services\CampaignService;
use App\Services\CoverageAreasService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class CampaignController extends Controller
{
    protected $campaignService, $coverageAreasService;

    public function __construct(CampaignService $campaignService, CoverageAreasService $coverageAreasService)
    {
        $this->campaignService = $campaignService;
        $this->coverageAreasService = $coverageAreasService;
    }

    public function index(Request $request)
    {
        $filters = [
            'search' => $request->input('search'),
            'status' => $request->input('status'),
            'advertiser_id' => $request->input('advertiser_id'),
            'date_range' => [
                'start' => $request->input('start_date'),
                'end' => $request->input('end_date'),
            ],
        ];

        // Archiving only declutters the advertiser's active list — the
        // campaign is never deleted, so it stays fully visible to admins
        // and in rider audit queries either way. Applied separately from
        // $filters so the search form doesn't treat it as a user-set filter.
        $campaigns = $this->campaignService->getCampaigns([...$filters, 'exclude_archived' => true]);
        $stats = $this->campaignService->getCampaignStats();
        $advertisers = $this->campaignService->getApprovedAdvertisers();

        return Inertia::render('front-end/Campaigns/Index', [
            'campaigns' => $campaigns,
            'stats' => $stats,
            'advertisers' => $advertisers,
            'filters' => $filters,
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        $advertisers = $this->campaignService->getApprovedAdvertisers();
        $coverageAreas = $this->coverageAreasService->forSelect();
        $user = $this->getAuthenticatedUser();
        $advertiser = Advertiser::where('user_id',$user->id)->first();

        return Inertia::render('front-end/Campaigns/Create', [
            'advertiser' => $advertiser,
            'advertisers' => $advertisers,
            'coverageareas' => $coverageAreas,
        ]);
    }

    public function store(StoreCampaignRequest $request)
    {
             try {
            $campaign = $this->campaignService->createCampaign(
                $request->validated(),
                $request->file('design_file')
            );

            return redirect()
                ->route('my-campaigns.show', $campaign)
                ->with('success', 'Your campaign has been saved! Complete payment below to get it started.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->withInput()
                ->with('error', 'Failed to create campaign. Please try again.');
        }
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Campaign $campaign)
    {
        $user = $this->getAuthenticatedUser();

        abort_unless($this->campaignService->canEditCampaign($campaign, $user), 403, 'This campaign can no longer be edited.');

        $coverageAreas = $this->coverageAreasService->forSelect();
        $campaign->load(['advertiser.user', 'coverageAreas', 'riderDemographics']);

        return Inertia::render('front-end/Campaigns/Edit', [
            'campaign' => $campaign,
            'coverageareas' => $coverageAreas,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateCampaignRequest $request, Campaign $campaign)
    {
        $user = $this->getAuthenticatedUser();

        abort_unless($this->campaignService->canEditCampaign($campaign, $user), 403, 'This campaign can no longer be edited.');

        try {
            $this->campaignService->updateCampaign(
                $campaign,
                $request->validated(),
                $request->file('design_file')
            );

            return redirect()
                ->route('my-campaigns.show', $campaign->id)
                ->with('success', 'Campaign updated successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->withInput()
                ->with('error', 'Failed to update campaign: ' . $e->getMessage());
        }
    }

    public function show(Campaign $campaign)
    {
        $user = $this->getAuthenticatedUser();
        $advertiser = Advertiser::where('user_id', $user->id)->first();

        abort_unless($campaign->advertiser_id === ($advertiser->id ?? null), 403, 'You do not have access to this campaign.');

        // Load the campaign with all necessary relationships
        $campaign->load([
            'advertiser.user',
            'coverageAreas.county',
            'coverageAreas.subCounty',
            'coverageAreas.ward',
            'riderDemographics',
            'currentCost',
            'assignments',
            'payments' => function ($query) {
                $query->orderBy('created_at', 'desc');
            }
        ]);

        // Format coverage areas
        $coverageAreas = $campaign->coverageAreas->map(function ($area) {
            return [
                'id' => $area->id,
                'name' => $area->name,
                'full_name' => $area->full_name ?? $area->name,
            ];
        })->values();

        // Format rider demographics
        $riderDemographics = $campaign->riderDemographics->map(function ($demographic) {
            return [
                'id' => $demographic->id,
                'age_group' => $demographic->age_group,
                'gender' => $demographic->gender,
                'rider_type' => $demographic->rider_type,
            ];
        })->values();

        // Format current cost
        $currentCost = $campaign->currentCost ? [
            'id' => $campaign->currentCost->id,
            'helmet_count' => $campaign->currentCost->helmet_count,
            'duration_days' => $campaign->currentCost->duration_days,
            'daily_rate' => $campaign->currentCost->helmet_daily_rate,
            'base_cost' => $campaign->currentCost->base_cost,
            'includes_design' => $campaign->currentCost->includes_design,
            'design_cost' => $campaign->currentCost->design_cost,
            'subtotal' => $campaign->currentCost->subtotal,
            'vat_rate' => $campaign->currentCost->vat_rate,
            'vat_amount' => $campaign->currentCost->vat_amount,
            'total_cost' => $campaign->currentCost->total_cost,
            'status' => $campaign->currentCost->status,
        ] : null;

        // Format payments
        $payments = $campaign->payments->map(function ($payment) {
            return [
                'id' => $payment->id,
                'amount' => $payment->amount,
                'payment_method' => $payment->payment_method,
                'mpesa_receipt_number' => $payment->getMpesaReceipt(),
                'status' => $payment->status,
                'status_message' => $payment->status_message,
                'created_at' => $payment->created_at->toIso8601String(),
                'completed_at' => $payment->completed_at?->toIso8601String(),
            ];
        })->values();

        // total_paid_amount is a live sum, not a column. payment_status IS a
        // real persisted column (kept in sync by the payment flows —
        // recordManualPayment, approveManualPayment, rejectManualPayment,
        // and STK success), so it flows through via $campaign->toArray()
        // below without needing to be recomputed here.
        $totalPaid = (float) $campaign->payments->where('status', 'completed')->sum('amount');

        // Eloquent's toArray() re-serializes loaded relations under their
        // snake_cased key (e.g. currentCost -> current_cost) and that would
        // silently clobber the formatted versions above if we assigned them
        // back onto the model. Build a plain array instead so our formatted
        // values are what's actually sent to the frontend.
        $campaignData = array_merge($campaign->toArray(), [
            'coverage_areas' => $coverageAreas,
            'rider_demographics' => $riderDemographics,
            'current_cost' => $currentCost,
            'payments' => $payments,
            'total_paid_amount' => $totalPaid,
            'helmets_returned_count' => $campaign->assignments->where('status', 'completed')->count(),
        ]);

        return Inertia::render('front-end/Campaigns/Show', [
            'campaign' => $campaignData,
            'advertiser' => $advertiser,
        ]);
    }

    /**
     * Remove the specified resource from storage. Only draft campaigns can
     * be deleted — once submitted, a campaign may already have a payment
     * awaiting verification, and once it's run, riders/admins need its
     * history intact. deleteCampaign() enforces this too; the check here
     * just gives a specific error instead of a generic failure.
     */
    public function destroy(Campaign $campaign)
    {
        $user = $this->getAuthenticatedUser();
        $advertiser = Advertiser::where('user_id', $user->id)->first();

        abort_unless($campaign->advertiser_id === ($advertiser->id ?? null), 403, 'You do not have access to this campaign.');

        try {
            $this->campaignService->deleteCampaign($campaign);

            return redirect()
                ->route('my-campaigns.index')
                ->with('success', 'Campaign deleted successfully.');
        } catch (\InvalidArgumentException $e) {
            return redirect()->back()->with('error', $e->getMessage());
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', 'Failed to delete campaign. Please try again.');
        }
    }

    /**
     * Archive a successfully completed campaign — hides it from the
     * advertiser's active campaign list without deleting anything, so
     * rider check-ins/payouts tied to it remain fully auditable.
     */
    public function archive(Campaign $campaign)
    {
        $user = $this->getAuthenticatedUser();
        $advertiser = Advertiser::where('user_id', $user->id)->first();

        abort_unless($campaign->advertiser_id === ($advertiser->id ?? null), 403, 'You do not have access to this campaign.');

        try {
            $this->campaignService->archiveCampaign($campaign);

            return redirect()
                ->route('my-campaigns.index')
                ->with('success', 'Campaign archived successfully.');
        } catch (\InvalidArgumentException $e) {
            return redirect()->back()->with('error', $e->getMessage());
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', 'Failed to archive campaign. Please try again.');
        }
    }

    /**
     * Get authenticated user with role validation
     */
    private function getAuthenticatedUser()
    {
        $user = Auth::user();

        if (!$user || $user->role !== 'advertiser') {
            abort(403, 'Access denied. Advertiser role required.');
        }

        return $user;
    }

    /**
 * Update campaign status with history tracking
 */
public function updateStatus(Request $request, Campaign $campaign)
{
    $user = $this->getAuthenticatedUser();

    // Only admins can update campaign status
    if ($user->role !== 'admin') {
        return redirect()
            ->back()
            ->with('error', 'You do not have permission to update campaign status.');
    }

    $validated = $request->validate([
        'status' => ['required', 'string', 'in:draft,submitted,active,paused,completed,cancelled'],
        'notes' => ['nullable', 'string', 'max:1000'],
    ]);

    try {
        $oldStatus = $campaign->status;
        
        // Use the service method to update status with validation
        $this->campaignService->updateCampaignStatus(
            $campaign,
            $validated['status']
        );

        // Create status history record
         CampaignStatusHistory::create([
            'campaign_id' => $campaign->id,
            'user_id' => $user->id,
            'old_status' => $oldStatus,
            'new_status' => $validated['status'],
            'notes' => $validated['notes'] ?? null,
        ]);

        return redirect()
            ->back()
            ->with('success', 'Campaign status updated successfully.');

    } catch (\InvalidArgumentException $e) {
        return redirect()
            ->back()
            ->with('error', $e->getMessage());
    } catch (\Exception $e) {
        Log::error('Failed to update campaign status', [
            'campaign_id' => $campaign->id,
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString(),
        ]);

        return redirect()
            ->back()
            ->with('error', 'Failed to update campaign status. Please try again.');
    }
}

}
