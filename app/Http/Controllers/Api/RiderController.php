<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\BaseApiController;
use App\Http\Requests\StoreRiderRequest;
use App\Models\Rider;
use App\Models\User;
use App\Services\RiderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RiderController extends BaseApiController
{
    protected RiderService $riderService;

    public function __construct(RiderService $riderService)
    {
        $this->riderService = $riderService;
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $filters = $request->only([
                'status', 'search', 'user_id', 'date_from', 'date_to', 
                'daily_rate_min', 'daily_rate_max'
            ]);

            $riders = $this->riderService->getRidersPaginated($filters, $request->get('per_page', 15));
            $stats = $this->riderService->getRiderStats();
            $users = User::select('id', 'name', 'email')->get();

            return $this->sendResponse([
                'riders' => $riders,
                'stats' => $stats,
                'filters' => $filters,
                'users' => $users,
            ], 'Riders retrieved successfully');

        } catch (\Exception $e) {
            return $this->sendError(
                'Failed to retrieve riders', 
                ['error' => $e->getMessage()], 
                500
            );
        }
    }

    /**
     * Get data for creating a new rider.
     */
    public function create(): JsonResponse
    {
        try {
            $users = User::whereDoesntHave('rider')
                ->select('id', 'name', 'email')
                ->get();

            return $this->sendResponse([
                'users' => $users,
            ], 'Create rider data retrieved successfully');

        } catch (\Exception $e) {
            return $this->sendError(
                'Failed to retrieve create rider data', 
                ['error' => $e->getMessage()], 
                500
            );
        }
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreRiderRequest $request): JsonResponse
    {
        try {
            $rider = $this->riderService->createRider($request->validated());

            return $this->sendResponse(
                $rider, 
                'Rider application submitted successfully. Pending approval.', 
                201
            );

        } catch (\Exception $e) {
            return $this->sendError(
                'Failed to create rider application', 
                ['error' => $e->getMessage()], 
                500
            );
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(Rider $rider): JsonResponse
    {
        try {
            
            $riderDetails = $this->riderService->loadRiderDetailsForShow($rider);

            return $this->sendResponse(
                $riderDetails, 
                'Rider details retrieved successfully'
            );

        } catch (\Exception $e) {
            return $this->sendError(
                'Failed to load rider details', 
                ['error' => $e->getMessage()], 
                500
            );
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Rider $rider): JsonResponse
    {
        try {
            // Validate the request data
            $validatedData = $request->validate([
                'firstname' => 'sometimes|string|max:255',
                'lastname' => 'sometimes|string|max:255',
                'email' => 'sometimes|email|unique:users,email,' . $rider->user_id,
                'phone' => 'sometimes|string|unique:users,phone,' . $rider->user_id,
                'national_id' => 'sometimes|string|max:255',
                'mpesa_number' => 'sometimes|string|max:255',
                'daily_rate' => 'sometimes|numeric|min:0',
                'location' => 'sometimes|string|max:255',
                'emergency_contact_name' => 'sometimes|string|max:255',
                'emergency_contact_phone' => 'sometimes|string|max:255',
            ]);

            $updatedRider = $this->riderService->updateRiderProfile($rider, $validatedData);

            return $this->sendResponse(
                $updatedRider, 
                'Rider profile updated successfully'
            );

        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->sendError(
                'Validation failed', 
                $e->errors(), 
                422
            );
        } catch (\Exception $e) {
            return $this->sendError(
                'Failed to update rider profile', 
                ['error' => $e->getMessage()], 
                500
            );
        }
    }

    /**
     * Update rider status (for admin use).
     */
    public function updateStatus(Request $request, Rider $rider): JsonResponse
    {
        try {
            $validated = $request->validate([
                'status' => 'required|in:pending,approved,rejected',
                'rejection_reason' => 'nullable|string|max:500'
            ]);

            $updatedRider = $this->riderService->updateRiderStatus(
                $rider, 
                $validated['status'], 
                $validated['rejection_reason'] ?? null
            );

            return $this->sendResponse(
                $updatedRider, 
                'Rider status updated successfully'
            );

        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->sendError(
                'Validation failed', 
                $e->errors(), 
                422
            );
        } catch (\Exception $e) {
            return $this->sendError(
                'Failed to update rider status', 
                ['error' => $e->getMessage()], 
                500
            );
        }
    }

    /**
     * Get rider statistics.
     */
    public function stats(): JsonResponse
    {
        try {
            $stats = $this->riderService->getRiderStats();

            return $this->sendResponse(
                $stats, 
                'Rider statistics retrieved successfully'
            );

        } catch (\Exception $e) {
            return $this->sendError(
                'Failed to retrieve rider statistics', 
                ['error' => $e->getMessage()], 
                500
            );
        }
    }

    /**
     * Get available riders for assignment.
     */
    public function available(): JsonResponse
    {
        try {
            $availableRiders = $this->riderService->getAvailableRiders();

            return $this->sendResponse(
                $availableRiders, 
                'Available riders retrieved successfully'
            );

        } catch (\Exception $e) {
            return $this->sendError(
                'Failed to retrieve available riders', 
                ['error' => $e->getMessage()], 
                500
            );
        }
    }

    /**
     * Get rider by user ID (for authenticated rider).
     */
    public function getByUserId(Request $request): JsonResponse
    {
        try {
            $userId = $request->user()->id; // Get authenticated user's ID
            $rider = $this->riderService->getRiderByUserId($userId);

            if (!$rider) {
                return $this->sendError(
                    'Rider profile not found', 
                    [], 
                    404
                );
            }

            return $this->sendResponse(
                $rider, 
                'Rider profile retrieved successfully'
            );

        } catch (\Exception $e) {
            return $this->sendError(
                'Failed to retrieve rider profile', 
                ['error' => $e->getMessage()], 
                500
            );
        }
    }

    /**
     * Update wallet balance.
     */
    public function updateWallet(Request $request, Rider $rider): JsonResponse
    {
        try {
            $validated = $request->validate([
                'amount' => 'required|numeric|min:0',
                'type' => 'required|in:add,subtract'
            ]);

            $updatedRider = $this->riderService->updateWalletBalance(
                $rider, 
                $validated['amount'], 
                $validated['type']
            );

            return $this->sendResponse(
                [
                    'rider' => $updatedRider,
                    'new_balance' => $updatedRider->wallet_balance
                ], 
                'Wallet balance updated successfully'
            );

        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->sendError(
                'Validation failed', 
                $e->errors(), 
                422
            );
        } catch (\Exception $e) {
            return $this->sendError(
                'Failed to update wallet balance', 
                ['error' => $e->getMessage()], 
                500
            );
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Rider $rider): JsonResponse
    {
        try {
            // Note: You might want to soft delete instead of hard delete
            $rider->delete();

            return $this->sendResponse(
                null, 
                'Rider deleted successfully'
            );

        } catch (\Exception $e) {
            return $this->sendError(
                'Failed to delete rider', 
                ['error' => $e->getMessage()], 
                500
            );
        }
    }
}