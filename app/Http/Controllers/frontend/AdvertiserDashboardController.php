<?php

namespace App\Http\Controllers\frontend;

use App\Http\Controllers\Controller;
use App\Models\Advertiser;
use App\Models\Campaign;
use App\Models\CampaignAssignment;
use App\Models\Payment;
use App\Models\RiderCheckIn;
use App\Models\RiderRoute;
use App\Models\SelfiePrompt;
use App\Services\AdvertiserService;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class AdvertiserDashboardController extends Controller
{
    public function __construct(
        private AdvertiserService $advertiserService
    ) {}

    /**
     * Display the advertiser heatmap page
     */
    public function heatmap(): Response
    {
        $user = $this->getAuthenticatedUser();
        $advertiser = $this->advertiserService->getAdvertiserByUserId($user->id);

        $campaigns = $advertiser
            ? Campaign::where('advertiser_id', $advertiser->id)
                ->select('id', 'name')
                ->get()
                ->map(fn($c) => ['value' => (string) $c->id, 'label' => $c->name])
                ->values()
            : collect();

        return Inertia::render('front-end/Advertisers/Heatmap', [
            'user'       => $this->formatUserData($user),
            'advertiser' => $advertiser ? $this->formatAdvertiserData($advertiser) : null,
            'campaigns'  => $campaigns,
        ]);
    }

    /**
     * Display the advertiser dashboard
     */
    public function index(): Response
    {
        $user       = $this->getAuthenticatedUser();
        $advertiser = $this->advertiserService->getAdvertiserByUserId($user->id);

        $dashboardData = ['user' => $this->formatUserData($user), 'advertiser' => $advertiser ? $this->formatAdvertiserData($advertiser) : null];

        if ($advertiser && $advertiser->status === 'approved') {
            $allCampaignIds    = Campaign::where('advertiser_id', $advertiser->id)->pluck('id');
            $activeCampaignIds = Campaign::where('advertiser_id', $advertiser->id)->where('status', 'active')->pluck('id');

            // Only active/completed assignments — a cancelled/rejected/pending
            // assignment never actually rode for this campaign and shouldn't
            // count toward the advertiser-facing performance figures below.
            $assignmentIds = CampaignAssignment::whereIn('campaign_id', $allCampaignIds)
                ->whereIn('status', ['active', 'completed'])
                ->pluck('id');
            $checkInIds    = RiderCheckIn::whereIn('campaign_assignment_id', $assignmentIds)->pluck('id');
            $riderIds      = CampaignAssignment::whereIn('campaign_id', $allCampaignIds)
                ->whereIn('status', ['active', 'completed'])
                ->pluck('rider_id');

            // Impressions are an estimate (distance covered × a configured rate,
            // the same rate CampaignAnalyticsController uses) — QR scans are a
            // real count of completed/accepted selfie-prompt verifications.
            $impressionsPerKm = (int) config('campaign.impressions_per_km', 500);
            $totalDistance    = (float) RiderRoute::whereIn('check_in_id', $checkInIds)->sum('total_distance');
            $totalImpressions = (int) ($totalDistance * $impressionsPerKm);
            $totalQrScans     = SelfiePrompt::whereIn('rider_id', $riderIds)
                ->whereIn('status', ['completed', 'accepted'])
                ->count();

            $recentCampaigns = Campaign::where('advertiser_id', $advertiser->id)
                ->whereIn('status', ['active', 'paused', 'completed'])
                ->orderByDesc('start_date')
                ->take(5)
                ->get()
                ->map(function (Campaign $c) use ($impressionsPerKm) {
                    $campaignAssignmentIds = CampaignAssignment::where('campaign_id', $c->id)
                        ->whereIn('status', ['active', 'completed'])
                        ->pluck('id');
                    $campaignCheckInIds    = RiderCheckIn::whereIn('campaign_assignment_id', $campaignAssignmentIds)->pluck('id');
                    $campaignDistance      = (float) RiderRoute::whereIn('check_in_id', $campaignCheckInIds)->sum('total_distance');
                    $campaignRiderIds      = CampaignAssignment::where('campaign_id', $c->id)
                        ->whereIn('status', ['active', 'completed'])
                        ->pluck('rider_id');
                    $campaignScans         = SelfiePrompt::whereIn('rider_id', $campaignRiderIds)
                        ->whereIn('status', ['completed', 'accepted'])
                        ->count();
                    $campaignBudget        = Payment::where('campaign_id', $c->id)
                        ->where('status', 'completed')
                        ->sum('amount');

                    return [
                        'id'          => $c->id,
                        'name'        => $c->name,
                        'status'      => ucfirst($c->status),
                        'impressions' => number_format((int) ($campaignDistance * $impressionsPerKm)),
                        'scans'       => $campaignScans,
                        'budget'      => 'KSh ' . number_format((float) $campaignBudget),
                    ];
                });

            $totalBudget = Payment::where('advertiser_id', $advertiser->id)
                ->where('status', 'completed')
                ->sum('amount');

            $recentTransactions = Payment::where('advertiser_id', $advertiser->id)
                ->whereIn('status', ['completed', 'refunded'])
                ->with('campaign:id,name')
                ->orderByDesc('completed_at')
                ->take(5)
                ->get()
                ->map(fn ($p) => [
                    'id'     => $p->id,
                    'desc'   => 'Campaign Payment' . ($p->campaign ? ' – ' . $p->campaign->name : ''),
                    'amount' => ($p->status === 'refunded' ? '+' : '-') . 'KSh ' . number_format((float) $p->amount),
                    'date'   => $p->completed_at?->diffForHumans() ?? '—',
                    'type'   => $p->status === 'refunded' ? 'refund' : 'payment',
                ]);

            $dashboardData['stats'] = [
                ['name' => 'Active Campaigns',  'value' => (string) $activeCampaignIds->count(),
                 'change' => '', 'trend' => 'neutral', 'icon' => 'target'],
                ['name' => 'Total Impressions', 'value' => $totalImpressions >= 1000 ? round($totalImpressions / 1000, 1) . 'K' : (string) $totalImpressions,
                 'change' => "est. {$impressionsPerKm}/km", 'trend' => 'up', 'icon' => 'eye'],
                ['name' => 'QR Code Scans',     'value' => number_format($totalQrScans),
                 'change' => 'verified scans', 'trend' => 'up', 'icon' => 'smartphone'],
                ['name' => 'Campaign Budget',   'value' => 'KSh ' . number_format((float) $totalBudget),
                 'change' => 'total paid', 'trend' => 'neutral', 'icon' => 'credit-card'],
            ];

            $dashboardData['campaigns']    = $recentCampaigns;
            $dashboardData['transactions'] = $recentTransactions;
        }

        return Inertia::render('front-end/Advertisers/Dashboard', $dashboardData);
    }

    /**
     * Store a new advertiser profile
     */
    public function store(Request $request)
    {
        $user = $this->getAuthenticatedUser();

        // Check if user already has an advertiser profile
        if ($this->advertiserService->getAdvertiserByUserId($user->id)) {
            throw ValidationException::withMessages([
                'profile' => 'Advertiser profile already exists for this user.'
            ]);
        }

        $validated = $this->validateAdvertiserData($request);

        // Add user_id to the data
        $validated['user_id'] = $user->id;
        $validated['status'] = 'pending';

        $this->advertiserService->createAdvertiserProfile($validated);

        return redirect()->route('advert-dash.index')->with(
            'success',
            'Advertiser profile created successfully. Your application is under review.'
        );
    }

    /**
     * Display the authenticated advertiser's own profile — company details,
     * basic account details, and password. There's exactly one profile per
     * advertiser user, so this is never parameterized by ID.
     */
    public function profile(): Response
    {
        $user = $this->getAuthenticatedUser();
        $advertiser = $this->advertiserService->getAdvertiserByUserId($user->id);

        if (!$advertiser) {
            abort(404, 'Advertiser profile not found.');
        }

        return Inertia::render('front-end/Advertisers/Profile', [
            'user'            => $this->formatUserData($user),
            'advertiser'      => $this->formatAdvertiserData($advertiser),
            'mustVerifyEmail' => $user instanceof MustVerifyEmail,
        ]);
    }

    /**
     * Update the authenticated advertiser's own company details (name,
     * business registration, address). Basic account details (name, email,
     * phone) and password go through the shared ProfileController /
     * PasswordController instead — those aren't advertiser-specific.
     */
    public function updateProfile(Request $request): RedirectResponse
    {
        $user = $this->getAuthenticatedUser();
        $advertiser = $this->advertiserService->getAdvertiserByUserId($user->id);

        if (!$advertiser) {
            abort(404, 'Advertiser profile not found.');
        }

        // Only allow updates for rejected or pending profiles
        if ($advertiser->status === 'approved') {
            throw ValidationException::withMessages([
                'profile' => 'Cannot update an approved profile. Please contact support for changes.'
            ]);
        }

        $validated = $this->validateAdvertiserData($request);

        $this->advertiserService->updateAdvertiserProfile($advertiser, $validated);

        return back()->with('success', 'Company profile updated successfully. Your application is under review.');
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
     * Validate advertiser profile data
     */
    private function validateAdvertiserData(Request $request): array
    {
        return $request->validate([
            'company_name' => ['required', 'string', 'max:255', 'min:2'],
            'business_registration' => ['nullable', 'string', 'max:100'],
            'address' => ['required', 'string', 'max:500', 'min:10'],
        ], [
            'company_name.required' => 'Company name is required',
            'company_name.min' => 'Company name must be at least 2 characters',
            'address.required' => 'Company address is required',
            'address.min' => 'Address must be at least 10 characters',
        ]);
    }

    /**
     * Format user data for frontend
     */
    private function formatUserData($user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'role' => $user->role
        ];
    }

    /**
     * Format advertiser data for frontend
     */
    private function formatAdvertiserData(Advertiser $advertiser): array
    {
        return [
            'id' => $advertiser->id,
            'company_name' => $advertiser->company_name,
            'business_registration' => $advertiser->business_registration,
            'address' => $advertiser->address,
            'status' => $advertiser->status,
            'created_at' => $advertiser->created_at->format('Y-m-d H:i:s'),
            'updated_at' => $advertiser->updated_at->format('Y-m-d H:i:s')
        ];
    }
}
