<?php

namespace App\Http\Controllers\frontend;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCampaignRequest;
use App\Models\Advertiser;
use App\Models\Campaign;
use App\Services\CampaignService;
use App\Services\CoverageAreasService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
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
            ]
        ];

        $campaigns = $this->campaignService->getCampaigns($filters);
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
            $this->campaignService->createCampaign($request->validated());

            return redirect()
                ->route('my-campaigns.index')
                ->with('success', 'Campaign created successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->withInput()
                ->with('error', 'Failed to create campaign. Please try again.');
        }
    }

    public function show($campaign)
    {
        $user = $this->getAuthenticatedUser();
        $advertiser = Advertiser::where('user_id', $user->id)->first();

        // Verify that the campaign belongs to this advertiser
        // if ($campaign->advertiser_id !== $advertiser->id) {
        //     abort(403, 'You do not have permission to view this campaign.');
        // }

        $campaign = Campaign::find($campaign);

        // Load the campaign with all necessary relationships
        $campaign->load([
            'advertiser.user',
            'coverageAreas.county',
            'coverageAreas.subCounty',
            'coverageAreas.ward',
            'riderDemographics',
            'currentCost',
            'payments' => function ($query) {
                $query->orderBy('created_at', 'desc');
            }
        ]);

        // Calculate duration if not already set
        if (!isset($campaign->duration_days)) {
            $campaign->duration_days = $campaign->current_cost?->duration_days ?? 0;
        }

        // Format coverage areas
        $campaign->coverage_areas = $campaign->coverageAreas->map(function ($area) {
            return [
                'id' => $area->id,
                'name' => $area->name,
                'full_name' => $area->full_name ?? $area->name,
            ];
        });

        // Format rider demographics
        $campaign->rider_demographics = $campaign->riderDemographics->map(function ($demographic) {
            return [
                'id' => $demographic->id,
                'age_group' => $demographic->age_group,
                'gender' => $demographic->gender,
                'rider_type' => $demographic->rider_type,
            ];
        });

        // Format current cost
        if ($campaign->currentCost) {
            $campaign->current_cost = [
                'id' => $campaign->currentCost->id,
                'helmet_count' => $campaign->currentCost->helmet_count,
                'duration_days' => $campaign->currentCost->duration_days,
                'helmet_daily_rate' => $campaign->currentCost->helmet_daily_rate,
                'base_cost' => $campaign->currentCost->base_cost,
                'includes_design' => $campaign->currentCost->includes_design,
                'design_cost' => $campaign->currentCost->design_cost,
                'subtotal' => $campaign->currentCost->subtotal,
                'vat_rate' => $campaign->currentCost->vat_rate,
                'vat_amount' => $campaign->currentCost->vat_amount,
                'total_cost' => $campaign->currentCost->total_cost,
                'status' => $campaign->currentCost->status,
            ];
        }

        // Format payments
        $campaign->payments = $campaign->payments->map(function ($payment) {
            return [
                'id' => $payment->id,
                'amount' => $payment->amount,
                'payment_method' => $payment->payment_method,
                'mpesa_receipt_number' => $payment->getMpesaReceipt(),
                'status' => $payment->status,
                'created_at' => $payment->created_at->toIso8601String(),
                'completed_at' => $payment->completed_at?->toIso8601String(),
            ];
        });

        // Calculate payment status
        $totalCost = $campaign->currentCost?->total_cost ?? 0;
        $totalPaid = $campaign->payments->where('status', 'completed')->sum('amount');

        $campaign->total_paid_amount = $totalPaid;
        
        if ($totalPaid >= $totalCost) {
            $campaign->payment_status = 'fully_paid';
        } elseif ($totalPaid > 0) {
            $campaign->payment_status = 'partially_paid';
        } else {
            $campaign->payment_status = 'unpaid';
        }

        return Inertia::render('front-end/Campaigns/Show', [
            'campaign' => $campaign,
            'advertiser' => $advertiser,
        ]);
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
}
