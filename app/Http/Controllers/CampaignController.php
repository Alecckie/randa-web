<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCampaignRequest;
use App\Http\Requests\UpdateCampaignRequest;
use App\Models\Campaign;
use App\Models\CampaignStatusHistory;
use App\Services\CampaignAssignmentService;
use App\Services\CampaignService;
use App\Services\CoverageAreasService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class CampaignController extends Controller
{
    protected $campaignService, $coverageAreasService, $assignmentService;

    public function __construct(CampaignService $campaignService, CoverageAreasService $coverageAreasService, CampaignAssignmentService $assignmentService)
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

        // total_paid_amount is a computed accessor (not eager-loaded); payment_status
        // is a real column now and already included automatically.
        $campaigns->getCollection()->each(
            fn($campaign) => $campaign->append(['total_paid_amount'])
        );

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
            $campaign = $this->campaignService->createCampaign($request->validated());

            return redirect()
                ->route('campaigns.show', $campaign)
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

        $user = Auth::user();
        $isAdmin = $user && $user->role === 'admin';

        $paymentAnalysis = $isAdmin ? $this->buildPaymentAnalysis($campaign) : null;

        return Inertia::render('Campaigns/Show', [
            'campaign' => $campaign,
            'availableRiders' => $availableRiders,
            'availableHelmets' => $availableHelmets,
            'assignmentStats' => $assignmentStats,
            'paymentAnalysis' => $paymentAnalysis,
            'isAdmin' => $isAdmin,
        ]);
    }

    /**
     * Build payment analysis data for a campaign.
     * Includes total revenue, per-rider payouts, company profit, and daily progressive breakdown.
     */
    private function buildPaymentAnalysis(Campaign $campaign): array
    {
        $totalRevenue = round((float) $campaign->payments()
            ->where('status', 'completed')
            ->sum('amount'), 2);

        // Fetch all ended check-ins for this campaign's assignments
        $checkIns = DB::table('rider_check_ins')
            ->join('campaign_assignments', 'rider_check_ins.campaign_assignment_id', '=', 'campaign_assignments.id')
            ->join('riders', 'rider_check_ins.rider_id', '=', 'riders.id')
            ->join('users', 'riders.user_id', '=', 'users.id')
            ->where('campaign_assignments.campaign_id', $campaign->id)
            ->where('rider_check_ins.status', 'ended')
            ->select(
                'rider_check_ins.rider_id',
                'users.name as rider_name',
                'rider_check_ins.check_in_date',
                DB::raw('CAST(rider_check_ins.daily_earning AS DECIMAL(10,2)) as daily_earning')
            )
            ->get();

        $totalRiderPayouts = round((float) $checkIns->sum('daily_earning'), 2);
        $companyProfit = round($totalRevenue - $totalRiderPayouts, 2);

        // Per-rider breakdown
        $perRider = $checkIns->groupBy('rider_id')->map(function ($riderCheckIns) {
            $first = $riderCheckIns->first();
            return [
                'rider_id'      => $first->rider_id,
                'rider_name'    => $first->rider_name,
                'total_earning' => round((float) $riderCheckIns->sum('daily_earning'), 2),
                'days_worked'   => $riderCheckIns->count(),
            ];
        })->sortByDesc('total_earning')->values()->toArray();

        // Progressive daily breakdown — cumulative rider costs vs profit
        $cumulativeCost = 0.0;
        $dailyBreakdown = $checkIns
            ->groupBy('check_in_date')
            ->sortKeys()
            ->map(function ($dayCheckIns, $date) use (&$cumulativeCost, $totalRevenue) {
                $dayCost = round((float) $dayCheckIns->sum('daily_earning'), 2);
                $cumulativeCost = round($cumulativeCost + $dayCost, 2);
                return [
                    'date'                   => $date,
                    'daily_rider_cost'       => $dayCost,
                    'riders_active'          => $dayCheckIns->count(),
                    'cumulative_rider_cost'  => $cumulativeCost,
                    'cumulative_profit'      => round($totalRevenue - $cumulativeCost, 2),
                ];
            })->values()->toArray();

        return [
            'total_revenue'       => $totalRevenue,
            'total_rider_payouts' => $totalRiderPayouts,
            'company_profit'      => $companyProfit,
            'per_rider'           => $perRider,
            'daily_breakdown'     => $dailyBreakdown,
        ];
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Campaign $campaign)
    {
        $advertisers = $this->campaignService->getApprovedAdvertisers();
        $coverageAreas = $this->coverageAreasService->forSelect();

        $campaign->load(['advertiser.user', 'coverageAreas', 'riderDemographics']);

        return Inertia::render('Campaigns/Edit', [
            'campaign' => $campaign,
            'advertisers' => $advertisers,
            'coverageareas' => $coverageAreas,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateCampaignRequest $request, Campaign $campaign)
    {
        try {
            $this->campaignService->updateCampaign(
                $campaign,
                $request->validated(),
                $request->file('design_file')
            );

            return redirect()
                ->route('campaigns.show', $campaign->id)
                ->with('success', 'Campaign updated successfully.');
        } catch (\Exception $e) {
            return back()
                ->withInput()
                ->with('error', 'Failed to update campaign: ' . $e->getMessage());
        }
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

    /**
     * Get authenticated user with role validation
     */
    private function getAuthenticatedUser()
    {
        $user = Auth::user();

        // if (!$user || $user->role !== 'advertiser' || $user->role !== 'admin') {
        //     abort(403, 'Access denied. Advertiser/Admin role required.');
        // }

        return $user;
    }
}
