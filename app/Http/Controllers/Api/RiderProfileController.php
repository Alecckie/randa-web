<?php

namespace App\Http\Controllers\Api;

use App\Services\LocationService;
use App\Services\RiderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
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
            $counties = $this->locationService->getAllCounties();

            $profileData = $this->riderService->getRiderProfileData($user->id);

            $data = [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'role' => $user->role,
                ],
                'rider' => $profileData['rider'],
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
                $this->riderService->changeRiderLocation(
                    $rider,
                    $validated['location'],
                    'Profile update - Location step (API)'
                );
                $rider->refresh();
                $message = 'Location details updated successfully!';
            } else {
                $rider = $this->riderService->createRiderWithLocation($user->id, $validated['location']);
                $message = 'Location details saved successfully!';
            }

            return $this->sendResponse([
                'rider' => $this->riderService->formatBasicRiderData($rider),
                'step_completed' => 'location',
                // 'next_step' => $rider->getNextIncompleteStep(),
                // 'profile_completion' => $rider->getProfileCompletionPercentage(),
            ], $message);

        } catch (ValidationException $e) {
            return $this->sendError('Validation Error', $e->errors(), 422);
        } catch (\Exception $e) {
            return $this->sendError('Failed to save location: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Upload a SINGLE document (recommended approach)
     */
    public function uploadSingleDocument(Request $request): JsonResponse
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
                'field_name' => 'required|string|in:national_id_front_photo,national_id_back_photo,passport_photo,good_conduct_certificate,motorbike_license,motorbike_registration',
                'file' => 'required|file|max:10240', // 10MB max
            ]);

            $fieldName = $validated['field_name'];
            $file = $request->file('file');

            // Use service to upload document
            $result = $this->riderService->uploadSingleDocument($rider, $fieldName, $file);

            return $this->sendResponse($result, 'Document uploaded successfully!');

        } catch (ValidationException $e) {
            return $this->sendError('Validation Error', $e->errors(), 422);
        } catch (\Exception $e) {
            return $this->sendError('Failed to upload document: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Delete a specific document
     */
    public function deleteDocument(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            $rider = $this->riderService->getRiderByUserId($user->id);

            if (!$rider) {
                return $this->sendError('Rider profile not found', [], 404);
            }

            $validated = $request->validate([
                'field_name' => 'required|string|in:national_id_front_photo,national_id_back_photo,passport_photo,good_conduct_certificate,motorbike_license,motorbike_registration',
            ]);

            $result = $this->riderService->deleteDocument($rider, $validated['field_name']);

            return $this->sendResponse($result, 'Document deleted successfully!');

        } catch (ValidationException $e) {
            return $this->sendError('Validation Error', $e->errors(), 422);
        } catch (\Exception $e) {
            return $this->sendError('Failed to delete document: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Step 2: Store/Update Documents (batch upload - kept for backward compatibility)
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

            // Make all documents optional - allow partial uploads
            $validated = $request->validate([
                'national_id' => 'nullable|string|max:20|unique:riders,national_id,' . $rider->id,
                'national_id_front_photo' => 'nullable|file|mimes:jpeg,png,jpg|max:5120',
                'national_id_back_photo' => 'nullable|file|mimes:jpeg,png,jpg|max:5120',
                'passport_photo' => 'nullable|file|mimes:jpeg,png,jpg|max:2048',
                'good_conduct_certificate' => 'nullable|file|mimes:pdf,jpeg,png,jpg|max:10240',
                'motorbike_license' => 'nullable|file|mimes:pdf,jpeg,png,jpg|max:5120',
                'motorbike_registration' => 'nullable|file|mimes:pdf,jpeg,png,jpg|max:5120',
            ]);

            $this->riderService->updateRiderDocuments($rider, $validated);
            $rider->refresh();

            $missingDocs = $this->riderService->getMissingDocuments($rider);

            return $this->sendResponse([
                'rider' => $this->riderService->formatBasicRiderData($rider),
                'uploaded_documents' => $this->riderService->getUploadedDocumentsStatus($rider),
                'missing_documents' => $missingDocs,
                'step_completed' => empty($missingDocs) ? 'documents' : null,
                // 'next_step' => $rider->getNextIncompleteStep(),
                // 'profile_completion' => $rider->getProfileCompletionPercentage(),
            ], 'Documents processed successfully!' . (empty($missingDocs) ? '' : ' Some documents are still missing.'));

        } catch (ValidationException $e) {
            return $this->sendError('Validation Error', $e->errors(), 422);
        } catch (\Exception $e) {
            return $this->sendError('Failed to upload documents: ' . $e->getMessage(), [], 500);
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
                'rider' => $this->riderService->formatBasicRiderData($rider),
                'step_completed' => 'contact',
                // 'next_step' => $rider->getNextIncompleteStep(),
                // 'profile_completion' => $rider->getProfileCompletionPercentage(),
            ], 'Contact and payment information saved successfully!');

        } catch (ValidationException $e) {
            return $this->sendError('Validation Error', $e->errors(), 422);
        } catch (\Exception $e) {
            return $this->sendError('Failed to save contact information: ' . $e->getMessage(), [], 500);
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

            $message = $rider->isProfileComplete() 
                ? 'Agreement signed successfully! Your profile is now complete and under review.'
                : 'Agreement signed successfully!';

            return $this->sendResponse([
                'rider' => $this->riderService->formatBasicRiderData($rider),
                'step_completed' => 'agreement',
                // 'next_step' => $rider->getNextIncompleteStep(),
                // 'profile_completion' => $rider->getProfileCompletionPercentage(),
                'is_complete' => $rider->isProfileComplete(),
            ], $message);

        } catch (ValidationException $e) {
            return $this->sendError('Validation Error', $e->errors(), 422);
        } catch (\Exception $e) {
            return $this->sendError('Failed to save agreement: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Display the full rider profile (view only)
     */
    public function show(): JsonResponse
    {
        try {
            $user = Auth::user();
            $rider = $this->riderService->getRiderByUserId($user->id);

            if (!$rider) {
                return $this->sendError(
                    'Please complete your profile first.',
                    ['profile' => ['Rider profile not found']],
                    404
                );
            }

            $rider = $this->riderService->loadRiderDetailsForShow($rider);
            $riderData = $this->riderService->formatFullRiderData($rider);

            return $this->sendResponse($riderData, 'Rider profile retrieved successfully');
        } catch (\Exception $e) {
            return $this->sendError($e->getMessage(), [], 500);
        }
    }
}