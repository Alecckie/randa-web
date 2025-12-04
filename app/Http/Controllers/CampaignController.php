<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCampaignRequest;
use App\Models\Campaign;
use App\Services\CampaignAssignmentService;
use App\Services\CampaignService;
use App\Services\CoverageAreasService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CampaignController extends Controller
{
    protected $campaignService,$coverageAreasService,$assignmentService;

    public function __construct(CampaignService $campaignService,CoverageAreasService $coverageAreasService,CampaignAssignmentService $assignmentService)
    {
        $this->campaignService = $campaignService;
        $this->coverageAreasService = $coverageAreasService;
        $this->assignmentService = $assignmentService;
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $filters = $this->buildFilters($request);
        $user = $request->user();

        $campaigns = $this->campaignService->getCampaigns($filters, $user);
        $stats = $this->campaignService->getCampaignStats($user);
        
        // Only show advertiser filter to admins
        $advertisers = $user->role === 'admin' 
            ? $this->campaignService->getApprovedAdvertisers() 
            : [];


        return Inertia::render('Campaigns/Index', [
            'campaigns' => $campaigns,
            'stats' => $stats,
            'advertisers' => $advertisers,
            'filters' => $filters,
            'user_role' => $user->role,
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        $advertisers = $this->campaignService->getApprovedAdvertisers();
        $coverageAreas = $this->coverageAreasService->forSelect();
        

        return Inertia::render('Campaigns/Create', [
            'advertisers' => $advertisers,
            'coverageareas' => $coverageAreas,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreCampaignRequest $request)
    {
        try {
            $this->campaignService->createCampaign($request->validated());

            return redirect()
                ->route('campaigns.index')
                ->with('success', 'Campaign created successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->withInput()
                ->with('error', 'Failed to create campaign. Please try again.');
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(Campaign $campaign)
    {
          $campaign->load([
            'advertiser.user',
            'coverageAreas',
            'riderDemographics',
            'currentCost',
            'assignments.rider.user',
            'assignments.helmet',
            'payments'
        ]);

        $availableRiders = $this->assignmentService->getAvailableRiders($campaign);
        $availableHelmets = $this->assignmentService->getAvailableHelmets();

        $assignmentStats = $this->assignmentService->getAssignmentStats($campaign);
        
        return Inertia::render('Campaigns/Show', [
            'campaign' => $campaign,
            'availableRiders' => $availableRiders,
            'availableHelmets' => $availableHelmets,
            'assignmentStats' => $assignmentStats,
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Campaign $campaign)
    {
        $advertisers = $this->campaignService->getApprovedAdvertisers();
        // $coverageAreas = $this->campaignService->getAvailableCoverageAreas();

        return Inertia::render('Campaigns/Edit', [
            'campaign' => $campaign->load('advertiser.user'),
            'advertisers' => $advertisers,
            // 'coverageAreas' => $coverageAreas,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Campaign $campaign)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Campaign $campaign)
    {
        try {
            $campaign->delete();
            
            return redirect()
                ->route('campaigns.index')
                ->with('success', 'Campaign deleted successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', 'Failed to delete campaign. Please try again.');
        }
    }

     /**
     * Build filters array from request
     */
    protected function buildFilters(Request $request): array
    {
        return [
            'search' => $request->input('search'),
            'status' => $request->input('status'),
            'advertiser_id' => $request->input('advertiser_id'),
            'date_range' => [
                'start' => $request->input('start_date'),
                'end' => $request->input('end_date'),
            ],
            'payment_status' => $request->input('payment_status'),
            'coverage_area_ids' => $request->input('coverage_area_ids'),
            'sort_by' => $request->input('sort_by', 'created_at'),
            'sort_order' => $request->input('sort_order', 'desc'),
            'per_page' => $request->input('per_page', 15),
        ];
    }
}
