<?php

namespace App\Http\Controllers\Api;

use App\Services\LocationService;
use App\Services\RiderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class RiderProfileController extends BaseApiController
{
    public function __construct(
        private RiderService $riderService,
        private LocationService $locationService
    ) {}

    /**
     * Display the rider profile data
     */
    public function index(): JsonResponse
    {
        try {
            $user = Auth::user();

            $rider = $this->riderService->getRiderByUserId($user->id);

            $counties = $this->locationService->getAllCounties();

            $data = [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'role' => $user->role,
                ],
                'rider' => $rider ? [
                    'id' => $rider->id,
                    'national_id' => $rider->national_id,
                    'mpesa_number' => $rider->mpesa_number,
                    'next_of_kin_name' => $rider->next_of_kin_name,
                    'next_of_kin_phone' => $rider->next_of_kin_phone,
                    'status' => $rider->status,
                    'daily_rate' => $rider->daily_rate,
                    'has_location' => $rider->hasCurrentLocation(),
                    'has_documents' => $this->riderService->hasDocuments($rider),
                    'has_contact_info' => $this->riderService->hasContactInfo($rider),
                    'has_agreement' => !empty($rider->signed_agreement),
                    // 'profile_completion' => $rider->getProfileCompletionPercentage(),
                    // 'next_step' => $rider->getNextIncompleteStep(),
                    'current_location' => $rider->currentLocation ? [
                        'county_id' => $rider->currentLocation->county_id,
                        'sub_county_id' => $rider->currentLocation->sub_county_id,
                        'ward_id' => $rider->currentLocation->ward_id,
                        'stage_name' => $rider->currentLocation->stage_name,
                        'notes' => $rider->currentLocation->notes,
                    ] : null,
                    'documents' => [
                        'national_id_front_photo' => $rider->national_id_front_photo ? Storage::url($rider->national_id_front_photo) : null,
                        'national_id_back_photo' => $rider->national_id_back_photo ? Storage::url($rider->national_id_back_photo) : null,
                        'passport_photo' => $rider->passport_photo ? Storage::url($rider->passport_photo) : null,
                        'good_conduct_certificate' => $rider->good_conduct_certificate ? Storage::url($rider->good_conduct_certificate) : null,
                        'motorbike_license' => $rider->motorbike_license ? Storage::url($rider->motorbike_license) : null,
                        'motorbike_registration' => $rider->motorbike_registration ? Storage::url($rider->motorbike_registration) : null,
                    ],
                ] : null,
                'counties' => $counties,
            ];

            return $this->sendResponse($data, 'Rider profile data retrieved successfully');
        } catch (\Exception $e) {
            return $this->sendError($e->getMessage(), [], 500);
        }
    }

    /**
     * Step 1: Store/Update Location Details
     */
    public function storeLocation(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'location.county_id' => 'required|exists:counties,id',
                'location.sub_county_id' => 'required|exists:sub_counties,id',
                'location.ward_id' => 'required|exists:wards,id',
                'location.stage_name' => 'required|string|max:255',
                'location.latitude' => 'nullable|numeric|between:-90,90',
                'location.longitude' => 'nullable|numeric|between:-180,180',
                'location.notes' => 'nullable|string|max:1000',
            ]);

            $user = Auth::user();
            $rider = $this->riderService->getRiderByUserId($user->id);

            if ($rider) {
                // Update existing location
                $this->riderService->changeRiderLocation(
                    $rider,
                    $validated['location'],
                    'Profile update - Location step (API)'
                );
                
                $rider->refresh();
                $message = 'Location details updated successfully!';
            } else {
                // Create initial rider record with location
                $rider = $this->riderService->createRiderWithLocation($user->id, $validated['location']);
                $message = 'Location details saved successfully!';
            }

            return $this->sendResponse([
                'rider' => $this->formatBasicRiderData($rider),
                'step_completed' => 'location',
                'next_step' => $rider->getNextIncompleteStep(),
                'profile_completion' => $rider->getProfileCompletionPercentage(),
            ], $message);

        } catch (ValidationException $e) {
            return $this->sendError('Validation Error', $e->errors(), 422);
        } catch (\Exception $e) {
            return $this->sendError(
                'Failed to save location: ' . $e->getMessage(),
                [],
                500
            );
        }
    }

    /**
     * Step 2: Store/Update Documents
     */
    public function storeDocuments(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            $rider = $this->riderService->getRiderByUserId($user->id);

            if (!$rider) {
                return $this->sendError(
                    'Please complete location details first.',
                    ['location' => ['Location step must be completed first']],
                    400
                );
            }

            // Determine if documents are required based on whether they already exist
            $validated = $request->validate([
                'national_id' => 'required|string|max:20|unique:riders,national_id,' . $rider->id,
                'national_id_front_photo' => $rider->national_id_front_photo 
                    ? 'nullable|file|mimes:jpeg,png,jpg|max:5120' 
                    : 'required|file|mimes:jpeg,png,jpg|max:5120',
                'national_id_back_photo' => $rider->national_id_back_photo 
                    ? 'nullable|file|mimes:jpeg,png,jpg|max:5120' 
                    : 'required|file|mimes:jpeg,png,jpg|max:5120',
                'passport_photo' => $rider->passport_photo 
                    ? 'nullable|file|mimes:jpeg,png,jpg|max:2048' 
                    : 'required|file|mimes:jpeg,png,jpg|max:2048',
                'good_conduct_certificate' => $rider->good_conduct_certificate 
                    ? 'nullable|file|mimes:pdf,jpeg,png,jpg|max:10240' 
                    : 'required|file|mimes:pdf,jpeg,png,jpg|max:10240',
                'motorbike_license' => $rider->motorbike_license 
                    ? 'nullable|file|mimes:pdf,jpeg,png,jpg|max:5120' 
                    : 'required|file|mimes:pdf,jpeg,png,jpg|max:5120',
                'motorbike_registration' => $rider->motorbike_registration 
                    ? 'nullable|file|mimes:pdf,jpeg,png,jpg|max:5120' 
                    : 'required|file|mimes:pdf,jpeg,png,jpg|max:5120',
            ]);

            $this->riderService->updateRiderDocuments($rider, $validated);
            $rider->refresh();

            return $this->sendResponse([
                'rider' => $this->formatBasicRiderData($rider),
                'step_completed' => 'documents',
                'next_step' => $rider->getNextIncompleteStep(),
                'profile_completion' => $rider->getProfileCompletionPercentage(),
            ], 'Documents uploaded successfully!');

        } catch (ValidationException $e) {
            return $this->sendError('Validation Error', $e->errors(), 422);
        } catch (\Exception $e) {
            return $this->sendError(
                'Failed to upload documents: ' . $e->getMessage(),
                [],
                500
            );
        }
    }

    /**
     * Step 3: Store/Update Contact & Payment Information
     */
    public function storeContactInfo(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            $rider = $this->riderService->getRiderByUserId($user->id);

            if (!$rider) {
                return $this->sendError(
                    'Please complete location details first.',
                    ['location' => ['Location step must be completed first']],
                    400
                );
            }

            $validated = $request->validate([
                'mpesa_number' => 'required|string|regex:/^254[0-9]{9}$/',
                'next_of_kin_name' => 'required|string|max:255',
                'next_of_kin_phone' => 'required|string|regex:/^254[0-9]{9}$/',
            ]);

            $this->riderService->updateRiderContactInfo($rider, $validated);
            $rider->refresh();

            return $this->sendResponse([
                'rider' => $this->formatBasicRiderData($rider),
                'step_completed' => 'contact',
                'next_step' => $rider->getNextIncompleteStep(),
                'profile_completion' => $rider->getProfileCompletionPercentage(),
            ], 'Contact and payment information saved successfully!');

        } catch (ValidationException $e) {
            return $this->sendError('Validation Error', $e->errors(), 422);
        } catch (\Exception $e) {
            return $this->sendError(
                'Failed to save contact information: ' . $e->getMessage(),
                [],
                500
            );
        }
    }

    /**
     * Step 4: Store/Update Agreement
     */
    public function storeAgreement(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            $rider = $this->riderService->getRiderByUserId($user->id);

            if (!$rider) {
                return $this->sendError(
                    'Please complete location details first.',
                    ['location' => ['Location step must be completed first']],
                    400
                );
            }

            $validated = $request->validate([
                'signed_agreement' => 'required|string|min:10',
            ]);

            $this->riderService->updateRiderAgreement($rider, $validated);
            $rider->refresh();

            // Check if profile is complete and update status to pending if complete
            if ($rider->isProfileComplete()) {
                $rider->update(['status' => 'pending']);
                $message = 'Agreement signed successfully! Your profile is now complete and under review.';
            } else {
                $message = 'Agreement signed successfully!';
            }

            return $this->sendResponse([
                'rider' => $this->formatBasicRiderData($rider),
                'step_completed' => 'agreement',
                'next_step' => $rider->getNextIncompleteStep(),
                'profile_completion' => $rider->getProfileCompletionPercentage(),
                'is_complete' => $rider->isProfileComplete(),
            ], $message);

        } catch (ValidationException $e) {
            return $this->sendError('Validation Error', $e->errors(), 422);
        } catch (\Exception $e) {
            return $this->sendError(
                'Failed to save agreement: ' . $e->getMessage(),
                [],
                500
            );
        }
    }

    /**
     * Store or update rider profile (Legacy - all at once)
     * Kept for backward compatibility with existing apps
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'national_id' => 'required|string|max:20',
                'national_id_front_photo' => 'required_without:id|file|mimes:jpeg,png,jpg|max:5120',
                'national_id_back_photo' => 'required_without:id|file|mimes:jpeg,png,jpg|max:5120',
                'passport_photo' => 'required_without:id|file|mimes:jpeg,png,jpg|max:2048',
                'good_conduct_certificate' => 'required_without:id|file|mimes:pdf,jpeg,png,jpg|max:10240',
                'motorbike_license' => 'required_without:id|file|mimes:pdf,jpeg,png,jpg|max:5120',
                'motorbike_registration' => 'required_without:id|file|mimes:pdf,jpeg,png,jpg|max:5120',
                'mpesa_number' => 'required|string|regex:/^254[0-9]{9}$/',
                'next_of_kin_name' => 'required|string|max:255',
                'next_of_kin_phone' => 'required|string|regex:/^254[0-9]{9}$/',
                'signed_agreement' => 'required|string|min:10',
                'daily_rate' => 'nullable|numeric|min:0',
                'location.county_id' => 'required|exists:counties,id',
                'location.sub_county_id' => 'required|exists:sub_counties,id',
                'location.ward_id' => 'required|exists:wards,id',
                'location.stage_name' => 'required|string|max:255',
                'location.latitude' => 'nullable|numeric|between:-90,90',
                'location.longitude' => 'nullable|numeric|between:-180,180',
                'location.notes' => 'nullable|string|max:1000',
            ]);

            // Add user_id to the data
            $validated['user_id'] = Auth::id();

            // Check if rider profile exists
            $existingRider = $this->riderService->getRiderByUserId(Auth::id());

            if ($existingRider) {
                // Update existing profile
                $rider = $this->riderService->updateRiderProfile($existingRider, $validated);

                // Update location if changed
                if (isset($validated['location'])) {
                    $this->riderService->changeRiderLocation(
                        $rider,
                        $validated['location'],
                        'Profile update (API - Legacy)'
                    );
                }

                return $this->sendResponse(
                    $this->formatBasicRiderData($rider),
                    'Profile updated successfully! Your changes are under review.'
                );
            } else {
                // Create new rider profile
                $rider = $this->riderService->createRider($validated);

                return $this->sendResponse(
                    $this->formatBasicRiderData($rider),
                    'Profile submitted successfully! Your application is under review.',
                    201
                );
            }
        } catch (ValidationException $e) {
            return $this->sendError('Validation Error', $e->errors(), 422);
        } catch (\Exception $e) {
            return $this->sendError(
                'Failed to save profile: ' . $e->getMessage(),
                [],
                500
            );
        }
    }

    /**
     * Display the full rider profile (view only)
     */
    public function show(): JsonResponse
    {
        try {
            $user = Auth::user();

            // Get rider profile with all relationships
            $rider = $this->riderService->getRiderByUserId($user->id);

            if (!$rider) {
                return $this->sendError(
                    'Please complete your profile first.',
                    ['profile' => ['Rider profile not found']],
                    404
                );
            }

            // Load full rider details
            $rider = $this->riderService->loadRiderDetailsForShow($rider);

            // Format rider data for API response
            $riderData = $this->formatFullRiderData($rider);

            return $this->sendResponse($riderData, 'Rider profile retrieved successfully');
        } catch (\Exception $e) {
            return $this->sendError($e->getMessage(), [], 500);
        }
    }

    /**
     * Format basic rider data for API response
     */
    private function formatBasicRiderData($rider): array
    {
        return [
            'id' => $rider->id,
            'national_id' => $rider->national_id,
            'mpesa_number' => $rider->mpesa_number,
            'next_of_kin_name' => $rider->next_of_kin_name,
            'next_of_kin_phone' => $rider->next_of_kin_phone,
            'status' => $rider->status,
            'daily_rate' => $rider->daily_rate,
            'has_location' => $rider->hasCurrentLocation(),
            'has_documents' => $this->riderService->hasDocuments($rider),
            'has_contact_info' => $this->riderService->hasContactInfo($rider),
            'has_agreement' => !empty($rider->signed_agreement),
        ];
    }

    /**
     * Format full rider data for API response
     */
    private function formatFullRiderData($rider): array
    {
        return [
            'id' => $rider->id,
            'national_id' => $rider->national_id,
            'mpesa_number' => $rider->mpesa_number,
            'next_of_kin_name' => $rider->next_of_kin_name,
            'next_of_kin_phone' => $rider->next_of_kin_phone,
            'status' => $rider->status,
            'daily_rate' => $rider->daily_rate,
            'wallet_balance' => $rider->wallet_balance,
            'location_changes_count' => $rider->location_changes_count,
            'location_last_updated' => $rider?->location_last_updated?->format('Y-m-d H:i:s') ?? null,
            'created_at' => $rider?->created_at?->format('Y-m-d H:i:s') ?? null,
            'is_profile_complete' => $rider->isProfileComplete(),
            'can_work' => $rider->canWork(),
            'profile_completion' => $rider->getProfileCompletionPercentage(),
            'next_step' => $rider->getNextIncompleteStep(),
            
            // User information
            'user' => [
                'id' => $rider->user->id,
                'first_name' => $rider->user->first_name,
                'last_name' => $rider->user->last_name,
                'name' => $rider->user->name,
                'full_name' => $rider->user->full_name,
                'email' => $rider->user->email,
                'phone' => $rider->user->phone,
                'is_active' => $rider->user->is_active,
                'created_at' => $rider?->user?->created_at?->format('Y-m-d H:i:s') ?? null,
            ],

            // Document URLs
            'documents' => [
                'national_id_front_photo' => $rider->national_id_front_photo ? Storage::url($rider->national_id_front_photo) : null,
                'national_id_back_photo' => $rider->national_id_back_photo ? Storage::url($rider->national_id_back_photo) : null,
                'passport_photo' => $rider->passport_photo ? Storage::url($rider->passport_photo) : null,
                'good_conduct_certificate' => $rider->good_conduct_certificate ? Storage::url($rider->good_conduct_certificate) : null,
                'motorbike_license' => $rider->motorbike_license ? Storage::url($rider->motorbike_license) : null,
                'motorbike_registration' => $rider->motorbike_registration ? Storage::url($rider->motorbike_registration) : null,
            ],

            // Current location
            'current_location' => $rider->currentLocation ? [
                'id' => $rider->currentLocation->id,
                'stage_name' => $rider->currentLocation->stage_name,
                'latitude' => $rider->currentLocation->latitude,
                'longitude' => $rider->currentLocation->longitude,
                'effective_from' => $rider->currentLocation->effective_from,
                'status' => $rider->currentLocation->status,
                'county' => [
                    'id' => $rider->currentLocation->county->id,
                    'name' => $rider->currentLocation->county->name,
                ],
                'subcounty' => [
                    'id' => $rider->currentLocation->subcounty->id,
                    'name' => $rider->currentLocation->subcounty->name,
                ],
                'ward' => [
                    'id' => $rider->currentLocation->ward->id,
                    'name' => $rider->currentLocation->ward->name,
                ],
                'full_address' => $rider->location_display_name,
            ] : null,

            // Current assignment
            'current_assignment' => $rider->currentAssignment ? [
                'id' => $rider->currentAssignment->id,
                'assigned_at' => $rider?->currentAssignment->assigned_at?->format('Y-m-d H:i:s') ?? null,
                'status' => $rider->currentAssignment->status,
                'campaign' => [
                    'id' => $rider->currentAssignment->campaign->id,
                    'name' => $rider->currentAssignment->campaign->name,
                ],
            ] : null,

            // Rejection reasons (if any)
            'rejection_reasons' => $rider->rejectionReasons->map(function ($reason) {
                return [
                    'id' => $reason->id,
                    'reason' => $reason->reason,
                    'rejected_at' => $reason?->created_at?->format('Y-m-d H:i:s') ?? null,
                    'rejected_by' => $reason->rejectedBy ? [
                        'id' => $reason->rejectedBy->id,
                        'name' => $reason->rejectedBy->name,
                    ] : null,
                ];
            })->toArray(),
        ];
    }
}