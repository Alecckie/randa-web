<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\StoreAdvertiserRequest;
use App\Models\Advertiser;
use App\Services\AdvertiserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class AdvertiserDashboardController extends BaseApiController
{
    public function __construct(
        private AdvertiserService $advertiserService
    ) {}

    /**
     * Display the advertiser dashboard data
     */
    public function index(): JsonResponse
    {
        try {
            $user = $this->getAuthenticatedUser();
            $advertiser = $this->advertiserService->getAdvertiserByUserId($user->id);

            $data = [
                'user' => $this->formatUserData($user),
                'advertiser' => $advertiser ? $this->formatAdvertiserData($advertiser) : null
            ];

            return $this->sendResponse($data, 'Dashboard data retrieved successfully');
        } catch (\Exception $e) {
            return $this->sendError($e->getMessage(), [], 500);
        }
    }

    /**
     * Store a new advertiser profile
     */
    public function store(StoreAdvertiserRequest $request): JsonResponse
    {
        try {
            $data = $request->validated();
            
            $advertiser = $this->advertiserService->createAdvertiserProfile($data);

            return $this->sendResponse(
                $this->formatAdvertiserData($advertiser),
                'Profile Successfully Completed.',
                201
            );
        } catch (\Exception $e) {
            return $this->sendError(
                'Failed to create profile. Please try again.',
                ['error' => $e->getMessage()],
                500
            );
        }
    }

    /**
     * Update an existing advertiser profile
     */
    public function update(Request $request, string $id): JsonResponse
    {
        try {
            $user = $this->getAuthenticatedUser();
            $advertiser = $this->findUserAdvertiserProfile($user->id, $id);

            // Only allow updates for rejected or pending profiles
            if ($advertiser->status === 'approved') {
                return $this->sendError(
                    'Cannot update an approved profile. Please contact support for changes.',
                    ['profile' => ['Cannot update an approved profile.']],
                    422
                );
            }

            $validated = $this->validateAdvertiserData($request);

            $updatedAdvertiser = $this->advertiserService->updateAdvertiserProfile($advertiser, $validated);

            return $this->sendResponse(
                $this->formatAdvertiserData($updatedAdvertiser),
                'Advertiser profile updated successfully. Your application is under review.'
            );
        } catch (ValidationException $e) {
            return $this->sendError('Validation Error', $e->errors(), 422);
        } catch (\Exception $e) {
            return $this->sendError($e->getMessage(), [], 500);
        }
    }

    /**
     * Display the specified advertiser profile
     */
    public function show(string $id): JsonResponse
    {
        try {
            $user = $this->getAuthenticatedUser();
            $advertiser = $this->findUserAdvertiserProfile($user->id, $id);

            $data = [
                'user' => $this->formatUserData($user),
                'advertiser' => $this->formatAdvertiserData($advertiser)
            ];

            return $this->sendResponse($data, 'Advertiser profile retrieved successfully');
        } catch (\Exception $e) {
            return $this->sendError($e->getMessage(), [], 500);
        }
    }

    /**
     * Remove the advertiser profile
     */
    public function destroy(string $id): JsonResponse
    {
        try {
            $user = $this->getAuthenticatedUser();
            $advertiser = $this->findUserAdvertiserProfile($user->id, $id);

            // Don't allow deletion of approved profiles with active campaigns
            if ($advertiser->status === 'approved' && $advertiser->campaigns()->exists()) {
                return $this->sendError(
                    'Cannot delete profile with active campaigns. Please contact support.',
                    ['profile' => ['Cannot delete profile with active campaigns.']],
                    422
                );
            }

            $advertiser->delete();

            return $this->sendResponse(
                null,
                'Advertiser profile deleted successfully.'
            );
        } catch (\Exception $e) {
            return $this->sendError($e->getMessage(), [], 500);
        }
    }

    /**
     * Get authenticated user with role validation
     */
    private function getAuthenticatedUser()
    {
        $user = Auth::user();

        if (!$user || $user->role !== 'advertiser') {
            throw new \Exception('Access denied. Advertiser role required.');
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
            throw new \Exception('Advertiser profile not found or access denied.');
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
     * Format user data for API response
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
     * Format advertiser data for API response
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