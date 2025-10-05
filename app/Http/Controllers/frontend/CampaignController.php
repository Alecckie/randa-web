<?php

namespace App\Http\Controllers\frontend;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCampaignRequest;
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

        return Inertia::render('front-end/Campaigns/Create', [
            
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
