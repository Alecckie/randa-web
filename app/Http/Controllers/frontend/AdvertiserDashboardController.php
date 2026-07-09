<?php

namespace App\Http\Controllers\frontend;

use App\Http\Controllers\Controller;
use App\Models\Advertiser;
use App\Models\Campaign;
use App\Models\CampaignAssignment;
use App\Models\Payment;
use App\Models\RiderCheckIn;
use App\Models\RiderRoute;
use App\Services\AdvertiserService;
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

            $assignmentIds = CampaignAssignment::whereIn('campaign_id', $allCampaignIds)->pluck('id');
            $checkInIds    = RiderCheckIn::whereIn('campaign_assignment_id', $assignmentIds)->pluck('id');

            $totalDistance    = (float) RiderRoute::whereIn('check_in_id', $checkInIds)->sum('total_distance');
            $totalImpressions = (int) ($totalDistance * 500);
            $totalQrScans     = RiderCheckIn::whereIn('campaign_assignment_id', $assignmentIds)->count() * 2;

            $recentCampaigns = Campaign::where('advertiser_id', $advertiser->id)
                ->whereIn('status', ['active', 'paused', 'completed'])
                ->orderByDesc('start_date')
                ->take(5)
                ->get()
                ->map(fn ($c) => [
                    'id'          => $c->id,
                    'name'        => $c->name,
                    'status'      => ucfirst($c->status),
                    'impressions' => '—',
                    'scans'       => 0,
                    'budget'      => '—',
                ]);

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
                 'change' => 'est. 500/km', 'trend' => 'up', 'icon' => 'eye'],
                ['name' => 'QR Code Scans',     'value' => number_format($totalQrScans),
                 'change' => 'check-in + out', 'trend' => 'up', 'icon' => 'smartphone'],
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
     * Update an existing advertiser profile
     */
    public function update(Request $request, string $id)
    {
        $user = $this->getAuthenticatedUser();
        $advertiser = $this->findUserAdvertiserProfile($user->id, $id);

        // Only allow updates for rejected or pending profiles
        if ($advertiser->status === 'approved') {
            throw ValidationException::withMessages([
                'profile' => 'Cannot update an approved profile. Please contact support for changes.'
            ]);
        }

        $validated = $this->validateAdvertiserData($request);
        // $validated['status'] = 'pending'; 

        $this->advertiserService->updateAdvertiserProfile($advertiser, $validated);

        return redirect()->route('advert-dash.index')->with(
            'success',
            'Advertiser profile updated successfully. Your application is under review.'
        );
    }

    /**
     * Display the specified advertiser profile
     */
    public function show(string $id): Response
    {
        $user = $this->getAuthenticatedUser();
        $advertiser = $this->findUserAdvertiserProfile($user->id, $id);

        return Inertia::render('front-end/Advertisers/Profile', [
            'user' => $this->formatUserData($user),
            'advertiser' => $this->formatAdvertiserData($advertiser)
        ]);
    }

    /**
     * Remove the advertiser profile
     */
    public function destroy(string $id)
    {
        $user = $this->getAuthenticatedUser();
        $advertiser = $this->findUserAdvertiserProfile($user->id, $id);

        // Don't allow deletion of approved profiles with active campaigns
        if ($advertiser->status === 'approved' && $advertiser->campaigns()->exists()) {
            throw ValidationException::withMessages([
                'profile' => 'Cannot delete profile with active campaigns. Please contact support.'
            ]);
        }

        $advertiser->delete();

        return redirect()->route('advert-dash.index')->with(
            'success',
            'Advertiser profile deleted successfully.'
        );
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
     * Find and authorize user's advertiser profile
     */
    private function findUserAdvertiserProfile(int $userId, string $advertiserId): Advertiser
    {
        $advertiser = Advertiser::where('id', $advertiserId)
            ->where('user_id', $userId)
            ->first();

        if (!$advertiser) {
            abort(404, 'Advertiser profile not found or access denied.');
        }

        return $advertiser;
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
