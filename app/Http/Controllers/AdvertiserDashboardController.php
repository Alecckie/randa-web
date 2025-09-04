<?php

namespace App\Http\Controllers;

use App\Models\Advertiser;
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
     * Display the advertiser dashboard
     */
    public function index(): Response
    {
        $user = $this->getAuthenticatedUser();
        $advertiser = $this->advertiserService->getAdvertiserByUserId($user->id);

        return Inertia::render('front-end/Advertisers/Dashboard', [
            'user' => $this->formatUserData($user),
            'advertiser' => $advertiser ? $this->formatAdvertiserData($advertiser) : null
        ]);
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

        $advertiser = $this->advertiserService->createAdvertiserProfile($validated);

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
        $validated['status'] = 'pending'; // Reset to pending when updated

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
            'contact_person' => ['required', 'string', 'max:255', 'min:2'],
        ], [
            'company_name.required' => 'Company name is required',
            'company_name.min' => 'Company name must be at least 2 characters',
            'address.required' => 'Company address is required',
            'address.min' => 'Address must be at least 10 characters',
            'contact_person.required' => 'Contact person name is required',
            'contact_person.min' => 'Contact person name must be at least 2 characters',
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
            'contact_person' => $advertiser->contact_person,
            'status' => $advertiser->status,
            'created_at' => $advertiser->created_at->format('Y-m-d H:i:s'),
            'updated_at' => $advertiser->updated_at->format('Y-m-d H:i:s')
        ];
    }
}
