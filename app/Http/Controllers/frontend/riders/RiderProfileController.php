<?php

namespace App\Http\Controllers\frontend\riders;

use App\Http\Controllers\Controller;
use App\Models\County;
use App\Services\LocationService;
use App\Services\RiderService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class RiderProfileController extends Controller
{
    public function __construct(
        private RiderService $riderService,
        private LocationService $locationService
    ) {}

    /**
     * Display the rider profile page
     */
    public function index(): Response
    {
        $user = Auth::user();
        $counties = $this->locationService->getAllCounties();
        
        // Use service method to get profile data
        $profileData = $this->riderService->getRiderProfileData($user->id);

        return Inertia::render('front-end/Riders/Profile', [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'role' => $user->role,
            ],
            'rider' => $profileData['rider'],
            'counties' => $counties,
        ]);
    }

    /**
     * Step 1: Store/Update Location Details
     */
    public function storeLocation(Request $request)
    {
        $validated = $request->validate([
            'location.county_id' => 'required|exists:counties,id',
            'location.sub_county_id' => 'required|exists:sub_counties,id',
            'location.ward_id' => 'required|exists:wards,id',
            'location.stage_name' => 'required|string|max:255',
            'location.latitude' => 'nullable|numeric|between:-90,90',
            'location.longitude' => 'nullable|numeric|between:-180,180',
            'location.notes' => 'nullable|string|max:1000',
        ]);

        try {
            $user = Auth::user();
            $rider = $this->riderService->getRiderByUserId($user->id);

            if ($rider) {
                // Update existing location
                $this->riderService->changeRiderLocation(
                    $rider,
                    $validated['location'],
                    'Profile update - Location step'
                );
            } else {
                // Create initial rider record with location
                $rider = $this->riderService->createRiderWithLocation($user->id, $validated['location']);
            }

            return back()->with('success', 'Location details saved successfully!');
        } catch (\Exception $e) {
            return back()
                ->withErrors(['error' => 'Failed to save location: ' . $e->getMessage()])
                ->withInput();
        }
    }

    /**
     * Upload a single document (NEW - AJAX endpoint for web)
     * This is the RECOMMENDED approach for avoiding timeouts
     */
    public function uploadSingleDocument(Request $request)
    {
        $user = Auth::user();
        $rider = $this->riderService->getRiderByUserId($user->id);

        if (!$rider) {
            return response()->json([
                'success' => false,
                'message' => 'Please complete location details first.',
            ], 400);
        }

        $validated = $request->validate([
            'field_name' => 'required|string|in:national_id_front_photo,national_id_back_photo,passport_photo,good_conduct_certificate,motorbike_license,motorbike_registration',
            'file' => 'required|file|max:10240', // 10MB max
        ]);

        try {
            // Use service method to upload document
            $result = $this->riderService->uploadSingleDocument(
                $rider,
                $validated['field_name'],
                $request->file('file')
            );

            return response()->json([
                'success' => true,
                'message' => 'Document uploaded successfully!',
                'data' => $result,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to upload document: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete a specific document (NEW - AJAX endpoint for web)
     */
    public function deleteDocument(Request $request)
    {
        $user = Auth::user();
        $rider = $this->riderService->getRiderByUserId($user->id);

        if (!$rider) {
            return response()->json([
                'success' => false,
                'message' => 'Rider profile not found',
            ], 404);
        }

        $validated = $request->validate([
            'field_name' => 'required|string|in:national_id_front_photo,national_id_back_photo,passport_photo,good_conduct_certificate,motorbike_license,motorbike_registration',
        ]);

        try {
            // Use service method to delete document
            $result = $this->riderService->deleteDocument($rider, $validated['field_name']);

            return response()->json([
                'success' => true,
                'message' => 'Document deleted successfully!',
                'data' => $result,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete document: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Step 2: Store/Update Documents (Batch upload - kept for backward compatibility)
     */
    public function storeDocuments(Request $request)
    {
        $user = Auth::user();
        $rider = $this->riderService->getRiderByUserId($user->id);

        if (!$rider) {
            return back()->withErrors(['error' => 'Please complete location details first.']);
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

        try {
            $this->riderService->updateRiderDocuments($rider, $validated);

            return back()->with('success', 'Documents uploaded successfully!');
        } catch (\Exception $e) {
            return back()
                ->withErrors(['error' => 'Failed to upload documents: ' . $e->getMessage()])
                ->withInput();
        }
    }

    /**
     * Step 3: Store/Update Contact & Payment Information
     */
    public function storeContactInfo(Request $request)
    {
        $user = Auth::user();
        $rider = $this->riderService->getRiderByUserId($user->id);

        if (!$rider) {
            return back()->withErrors(['error' => 'Please complete location details first.']);
        }

        $validated = $request->validate([
            'mpesa_number' => 'required|string|regex:/^254[0-9]{9}$/',
            'next_of_kin_name' => 'required|string|max:255',
            'next_of_kin_phone' => 'required|string|regex:/^254[0-9]{9}$/',
        ]);

        try {
            $this->riderService->updateRiderContactInfo($rider, $validated);

            return back()->with('success', 'Contact and payment information saved successfully!');
        } catch (\Exception $e) {
            return back()
                ->withErrors(['error' => 'Failed to save contact information: ' . $e->getMessage()])
                ->withInput();
        }
    }

    /**
     * Step 4: Store/Update Agreement
     */
    public function storeAgreement(Request $request)
    {
        $user = Auth::user();
        $rider = $this->riderService->getRiderByUserId($user->id);

        if (!$rider) {
            return back()->withErrors(['error' => 'Please complete location details first.']);
        }

        $validated = $request->validate([
            'signed_agreement' => 'required|string|min:10',
        ]);

        try {
            $this->riderService->updateRiderAgreement($rider, $validated);

            // Service already handles status update if profile is complete
            $message = $rider->isProfileComplete()
                ? 'Agreement signed successfully! Your profile is now complete and under review.'
                : 'Agreement signed successfully!';

            return back()->with('success', $message);
        } catch (\Exception $e) {
            return back()
                ->withErrors(['error' => 'Failed to save agreement: ' . $e->getMessage()])
                ->withInput();
        }
    }

    /**
     * Display the rider profile show page (view only)
     */
    public function show()
    {
        $user = Auth::user();

        // Get rider profile with all relationships
        $rider = $this->riderService->getRiderByUserId($user->id);

        if (!$rider) {
            return redirect()
                ->route('rider.profile')
                ->with('error', 'Please complete your profile first.');
        }

        // Load full rider details and format using service
        $rider = $this->riderService->loadRiderDetailsForShow($rider);
        $riderData = $this->riderService->formatFullRiderData($rider);

        return Inertia::render('front-end/Riders/ShowProfile', [
            'rider' => $riderData,
        ]);
    }
}