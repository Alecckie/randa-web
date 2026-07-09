<?php

namespace App\Http\Controllers;

use App\Models\CampaignAssignment;
use App\Models\Rider;
use App\Models\RiderCheckIn;
use App\Models\RiderRoute;
use App\Services\RiderService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class RiderDashboardController extends Controller
{
    public function __construct(
        private RiderService $riderService
    ) {}

    /**
     * Display the rider dashboard
     */
    public function index(): Response
    {
        $user  = $this->getAuthenticatedUser();
        $rider = $this->riderService->getRiderByUserId($user->id);

        $props = [
            'user'  => $this->formatUserData($user),
            'rider' => $rider ? $this->formatRiderData($rider) : null,
            'checkInWindow' => $this->buildCheckInWindow(),
        ];

        if ($rider) {
            $props['stats']          = $this->buildRiderStats($rider);
            $props['currentCampaign']= $this->buildCurrentCampaign($rider);
            $props['todayProgress']  = $this->buildTodayProgress($rider);
        }

        return Inertia::render('front-end/Riders/Dashboard', $props);
    }

    /**
     * Whether a rider is currently allowed to check in (config-backed
     * allowed hours — see config/rider_shift.php), so the frontend can
     * disable the scan/check-in buttons instead of letting the rider hit a
     * rejection from CheckInService::checkIn() after the fact.
     */
    private function buildCheckInWindow(): array
    {
        $now = Carbon::now();
        $earliestHour = RiderCheckIn::earliestCheckInHour();
        $latestHour = RiderCheckIn::latestCheckInHour();

        $opensAt = Carbon::today()->setHour($earliestHour);
        $closesAt = Carbon::today()->setHour($latestHour);
        $isOpen = $now->hour >= $earliestHour && $now->hour < $latestHour;

        return [
            'is_open' => $isOpen,
            'opens_at' => $opensAt->format('h:i A'),
            'closes_at' => $closesAt->format('h:i A'),
            'message' => $isOpen
                ? null
                : "Check-ins are only allowed between {$opensAt->format('h:i A')} and {$closesAt->format('h:i A')}.",
        ];
    }

    private function buildRiderStats(Rider $rider): array
    {
        $assignmentIds = CampaignAssignment::where('rider_id', $rider->id)->pluck('id');

        $checkInStats = RiderCheckIn::whereIn('campaign_assignment_id', $assignmentIds)
            ->selectRaw("
                COUNT(*) as total_checkins,
                SUM(CASE WHEN status = 'ended' THEN 1 ELSE 0 END) as days_worked,
                SUM(CASE WHEN status = 'ended' THEN COALESCE(daily_earning, 0) ELSE 0 END) as total_earnings
            ")
            ->first();

        $checkInIds    = RiderCheckIn::whereIn('campaign_assignment_id', $assignmentIds)->pluck('id');
        $totalDistance = (float) RiderRoute::whereIn('check_in_id', $checkInIds)->sum('total_distance');

        $daysWorked     = (int) ($checkInStats->days_worked ?? 0);
        $totalEarnings  = (float) ($checkInStats->total_earnings ?? 0);
        $totalCheckins  = (int) ($checkInStats->total_checkins ?? 0);
        $qrScans        = $totalCheckins * 2;

        return [
            ['name' => 'Days Worked',       'value' => (string) $daysWorked,                                           'change' => '', 'trend' => 'neutral', 'icon' => 'calendar'],
            ['name' => 'Total Earnings',    'value' => 'KSh ' . number_format($totalEarnings, 2),                      'change' => '', 'trend' => 'neutral', 'icon' => 'wallet'],
            ['name' => 'Distance Covered',  'value' => number_format($totalDistance, 1) . ' km',                       'change' => '', 'trend' => 'neutral', 'icon' => 'map'],
            ['name' => 'QR Scans',          'value' => (string) $qrScans,                                              'change' => '', 'trend' => 'neutral', 'icon' => 'smartphone'],
        ];
    }

    private function buildCurrentCampaign(Rider $rider): ?array
    {
        $assignment = CampaignAssignment::where('rider_id', $rider->id)
            ->where('status', 'active')
            ->with('campaign:id,name,end_date,start_date', 'helmet:id,helmet_code')
            ->latest('assigned_at')
            ->first();

        if (!$assignment || !$assignment->campaign) {
            return null;
        }

        $campaign  = $assignment->campaign;
        $today     = Carbon::today();
        $endDate   = $campaign->end_date;
        $startDate = $campaign->start_date;

        $totalDays     = ($startDate && $endDate) ? (int) $startDate->diffInDays($endDate) + 1 : 0;
        $currentDay    = ($startDate && $today->gte($startDate)) ? (int) $startDate->diffInDays($today) + 1 : 0;
        $daysRemaining = $endDate ? max(0, (int) $today->diffInDays($endDate, false)) : 0;

        return [
            'id'             => $campaign->id,
            'name'           => $campaign->name,
            'helmet_code'    => $assignment->helmet?->helmet_code ?? '—',
            'total_days'     => $totalDays,
            'current_day'    => $currentDay,
            'days_remaining' => $daysRemaining,
            'end_date'       => $endDate?->format('Y-m-d'),
        ];
    }


    private function buildTodayProgress(Rider $rider): array
    {
        $assignmentIds = CampaignAssignment::where('rider_id', $rider->id)->pluck('id');

        $todayCheckIn = RiderCheckIn::whereIn('campaign_assignment_id', $assignmentIds)
            ->whereDate('check_in_date', Carbon::today())
            ->latest()
            ->first();

        $todayDistance = 0.0;
        if ($todayCheckIn) {
            $todayRoute    = RiderRoute::where('check_in_id', $todayCheckIn->id)->first();
            $todayDistance = $todayRoute ? (float) $todayRoute->total_distance : 0.0;
        }

        return [
            'worked_hours'  => $todayCheckIn?->total_hours ?? 0,
            'distance_km'   => round($todayDistance, 2),
            'daily_earning' => $todayCheckIn ? 'KSh ' . number_format((float) $todayCheckIn->daily_earning, 2) : 'KSh 0.00',
            'status'        => $todayCheckIn?->status ?? null,
        ];
    }

    /**
     * Store a new rider profile
     */
    public function store(Request $request)
    {
        $user = $this->getAuthenticatedUser();
        
        // Check if user already has a rider profile
        if ($this->riderService->getRiderByUserId($user->id)) {
            throw ValidationException::withMessages([
                'profile' => 'Rider profile already exists for this user.'
            ]);
        }

        $validated = $this->validateRiderData($request);
        
        // Add user_id and default values
        $validated['user_id'] = $user->id;
        $validated['wallet_balance'] = 0.00;
        $validated['status'] = 'pending';
        $validated['daily_rate'] = $validated['daily_rate'] ?? 70.00;

        $rider = $this->riderService->createRider($validated);

        return redirect()->route('rider.rider-dash.index')->with('success', 
            'Rider profile created successfully. Your application is under review.');
    }

    /**
     * Update an existing rider profile
     */
    public function update(Request $request, string $id)
    {
        $user = $this->getAuthenticatedUser();
        $rider = $this->findUserRiderProfile($user->id, $id);

        // Only allow updates for rejected or pending profiles
        if ($rider->status === 'approved') {
            throw ValidationException::withMessages([
                'profile' => 'Cannot update an approved profile. Please contact support for changes.'
            ]);
        }

        $validated = $this->validateRiderData($request, true);
        $validated['status'] = 'pending'; // Reset to pending when updated

        $this->riderService->updateRiderProfile($rider, $validated);

        return redirect()->route('rider-dash.index')->with('success', 
            'Rider profile updated successfully. Your application is under review.');
    }

    /**
     * Display the specified rider profile
     */
    public function show(string $id): Response
    {
        $user = $this->getAuthenticatedUser();
        $rider = $this->findUserRiderProfile($user->id, $id);

        return Inertia::render('front-end/Riders/Profile', [
            'user' => $this->formatUserData($user),
            'rider' => $this->formatRiderData($rider)
        ]);
    }

    /**
     * Remove the rider profile
     */
    public function destroy(string $id)
    {
        $user = $this->getAuthenticatedUser();
        $rider = $this->findUserRiderProfile($user->id, $id);

        // Don't allow deletion of approved profiles with active assignments
        if ($rider->status === 'approved' && $rider->campaignAssignments()->where('status', 'active')->exists()) {
            throw ValidationException::withMessages([
                'profile' => 'Cannot delete profile with active assignments. Please contact support.'
            ]);
        }

        $this->riderService->deleteRiderProfile($rider);

        return redirect()->route('rider-dash.index')->with('success', 
            'Rider profile deleted successfully.');
    }

    /**
     * Get authenticated user with role validation
     */
    private function getAuthenticatedUser()
    {
        $user = Auth::user();
        
        if (!$user || $user->role !== 'rider') {
            abort(403, 'Access denied. Rider role required.');
        }

        return $user;
    }

    /**
     * Find and authorize user's rider profile
     */
    private function findUserRiderProfile(int $userId, string $riderId): Rider
    {
        $rider = Rider::where('id', $riderId)
            ->where('user_id', $userId)
            ->first();

        if (!$rider) {
            abort(404, 'Rider profile not found or access denied.');
        }

        return $rider;
    }

    /**
     * Validate rider profile data
     */
    private function validateRiderData(Request $request, bool $isUpdate = false): array
    {
        $rules = [
            'national_id' => ['required', 'string', 'min:7', 'max:20'],
            'mpesa_number' => ['required', 'string', 'regex:/^254[0-9]{9}$/'],
            'next_of_kin_name' => ['required', 'string', 'max:255', 'min:2'],
            'next_of_kin_phone' => ['required', 'string', 'regex:/^254[0-9]{9}$/'],
            'signed_agreement' => ['required', 'string', 'min:10', 'max:1000'],
            'daily_rate' => ['nullable', 'numeric', 'min:0', 'max:10000'],
        ];

        $fileRules = [
            'national_id_front_photo' => ['required', 'file', 'mimes:jpeg,png,jpg', 'max:5120'], // 5MB
            'national_id_back_photo' => ['required', 'file', 'mimes:jpeg,png,jpg', 'max:5120'], // 5MB
            'passport_photo' => ['required', 'file', 'mimes:jpeg,png,jpg', 'max:2048'], // 2MB
            'good_conduct_certificate' => ['required', 'file', 'mimes:pdf,jpeg,png,jpg', 'max:10240'], // 10MB
            'motorbike_license' => ['required', 'file', 'mimes:pdf,jpeg,png,jpg', 'max:5120'], // 5MB
            'motorbike_registration' => ['required', 'file', 'mimes:pdf,jpeg,png,jpg', 'max:5120'], // 5MB
        ];

        // For updates, make file uploads optional
        if ($isUpdate) {
            foreach ($fileRules as $field => $rule) {
                $fileRules[$field] = array_merge(['nullable'], array_slice($rule, 1));
            }
        }

        return $request->validate(array_merge($rules, $fileRules), [
            'national_id.required' => 'National ID is required',
            'national_id.min' => 'National ID must be at least 7 characters',
            'mpesa_number.required' => 'M-Pesa number is required',
            'mpesa_number.regex' => 'M-Pesa number must be in format 254XXXXXXXXX',
            'next_of_kin_phone.regex' => 'Phone number must be in format 254XXXXXXXXX',
            'signed_agreement.required' => 'Agreement signature is required',
            'signed_agreement.min' => 'Agreement must be at least 10 characters',
            '*.mimes' => 'Invalid file format',
            '*.max' => 'File size is too large',
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
     * Format rider data for frontend
     */
    private function formatRiderData(Rider $rider): array
    {
        return [
            'id' => $rider->id,
            'national_id' => $rider->national_id,
            'status' => $rider->status,
            'daily_rate' => (float) $rider->daily_rate,
            'wallet_balance' => (float) $rider->wallet_balance,
            'mpesa_number' => $rider->mpesa_number,
            'next_of_kin_name' => $rider->next_of_kin_name,
            'next_of_kin_phone' => $rider->next_of_kin_phone,
            'created_at' => $rider->created_at->format('Y-m-d H:i:s'),
            'updated_at' => $rider->updated_at->format('Y-m-d H:i:s')
        ];
    }
}