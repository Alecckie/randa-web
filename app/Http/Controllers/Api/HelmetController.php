<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\BaseApiController;
use App\Models\Helmet;
use App\Services\HelmetService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HelmetController extends BaseApiController
{
    public function __construct(
        private HelmetService $helmetService
    ) {}

    /**
     * Get all helmets with assigned rider information
     */
    public function index(Request $request): JsonResponse
    {
        $filters = $request->only(['search', 'status']);
        $helmets = $this->helmetService->getAllHelmets($filters);

        return $this->sendResponse($helmets, 'Helmets retrieved successfully');
    }

    /**
     * Show specific helmet with assigned rider
     */
    public function show(Helmet $helmet): JsonResponse
    {
        $helmet->load(['currentAssignment.rider.user', 'currentAssignment.campaign']);
        
        $helmetData = [
            'id' => $helmet->id,
            'helmet_code' => $helmet->helmet_code,
            'qr_code' => $helmet->qr_code,
            'status' => $helmet->status,
            'current_branding' => $helmet->current_branding,
            'assigned_rider' => $helmet->currentAssignment ? [
                'id' => $helmet->currentAssignment->rider->id,
                'name' => $helmet->currentAssignment->rider->user->name,
                'email' => $helmet->currentAssignment->rider->user->email,
                'phone' => $helmet->currentAssignment->rider->user->phone,
            ] : null,
            'created_at' => $helmet->created_at,
            'updated_at' => $helmet->updated_at,
        ];

        return $this->sendResponse($helmetData, 'Helmet retrieved successfully');
    }

    /**
     * Get riders available for helmet assignment
     */
    public function availableRiders(): JsonResponse
    {
        $riders = $this->helmetService->getRidersWithoutHelmets();
        
        $riderData = $riders->map(function ($rider) {
            return [
                'id' => $rider->id,
                'name' => $rider->user->name,
                'email' => $rider->user->email,
                'phone' => $rider->user->phone,
            ];
        });

        return $this->sendResponse($riderData, 'Available riders retrieved successfully');
    }

    /**
     * Assign helmet to rider
     */
    public function assignToRider(Request $request, Helmet $helmet): JsonResponse
    {
        $request->validate([
            'rider_id' => 'required|exists:riders,id',
        ]);

        try {
            $assignment = $this->helmetService->assignHelmetToRider($helmet, $request->rider_id);
            $assignment->load('rider.user');

            return $this->sendResponse([
                'assignment_id' => $assignment->id,
                'helmet_code' => $helmet->helmet_code,
                'rider_name' => $assignment->rider->user->name,
            ], 'Helmet assigned successfully');

        } catch (\Exception $e) {
            return $this->sendError('Assignment failed', ['error' => $e->getMessage()], 400);
        }
    }
}