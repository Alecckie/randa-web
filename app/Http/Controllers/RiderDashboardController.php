<?php

namespace App\Http\Controllers;

use App\Models\Rider;
use App\Services\RiderService;
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
        $user = $this->getAuthenticatedUser();
        $rider = $this->riderService->getRiderByUserId($user->id);

        return Inertia::render('front-end/Riders/Dashboard', [
            'user' => $this->formatUserData($user),
            'rider' => $rider ? $this->formatRiderData($rider) : null
        ]);
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