<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Services\CheckInService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;

class RiderCheckInController extends Controller
{
    protected $checkInService;

    public function __construct(CheckInService $checkInService)
    {
        $this->checkInService = $checkInService;
    }

    /**
     * Display check-in page
     */
    public function index()
    {
        $rider = Auth::user()->rider;

        if (!$rider) {
            return redirect()->route('rider.rider-dash.index')
                ->with('error', 'Rider profile not found.');
        }

        $todayStatus = $this->checkInService->getTodayCheckInStatus($rider->id);
        $stats = $this->checkInService->getCheckInStats($rider->id);

        return Inertia::render('Rider/CheckIn/Index', [
            'todayStatus' => $todayStatus,
            'stats' => $stats,
            'rider' => $rider->load('currentAssignment.campaign')
        ]);
    }

    /**
     * Process check-in via QR code
     */
    public function checkIn(Request $request)
    {
        $request->validate([
            'qr_code' => 'required|string',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180'
        ]);

        try {
            $rider = Auth::user()->rider;

            if (!$rider) {
                return response()->json([
                    'success' => false,
                    'message' => 'Rider profile not found.'
                ], 404);
            }

            $result = $this->checkInService->checkIn(
                $request->qr_code,
                $rider->id,
                $request->latitude,
                $request->longitude
            );

            return response()->json($result);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }

    /**
     * Process check-out
     */
    public function checkOut(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $rider = Auth::user()->rider;

            if (!$rider) {
                return response()->json([
                    'success' => false,
                    'message' => 'Rider profile not found.'
                ], 404);
            }

            $result = $this->checkInService->checkOut(
                $rider->id,
                $request->latitude,
                $request->longitude
            );

            return response()->json($result, 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }

    /**
     * Validate QR code before check-in
     */
    public function validateQrCode(Request $request)
    {
        $request->validate([
            'qr_code' => 'required|string'
        ]);

        try {
            $rider = Auth::user()->rider;

            if (!$rider) {
                return response()->json([
                    'success' => false,
                    'message' => 'Rider profile not found.'
                ], 404);
            }

            $result = $this->checkInService->validateQrCode($request->qr_code, $rider->id);

            return response()->json([
                'success' => true,
                'data' => $result
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }

    public function campaignSummary(Request $request): JsonResponse
    {
        try {
            $rider = $request->user()->rider;

            if (! $rider) {
                return response()->json([
                    'success' => false,
                    'message' => 'Rider profile not found.',
                ], 404);
            }

            $summary = $this->checkInService->getCampaignSummary($rider->id);

            return response()->json([
                'success' => true,
                'data'    => $summary,
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'error'   => config('app.debug') ? $e->getTraceAsString() : null,
            ], 400);
        }
    }

    /**
     * Get today's check-in status
     */
    public function getTodayStatus()
    {
        try {
            $rider = Auth::user()->rider;

            if (!$rider) {
                return response()->json([
                    'success' => false,
                    'message' => 'Rider profile not found.'
                ], 404);
            }

            $status = $this->checkInService->getTodayCheckInStatus($rider->id);

            return response()->json([
                'success' => true,
                'data' => $status
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }

    /**
     * Display check-in history
     */
    public function history()
    {
        $rider = Auth::user()->rider;

        if (!$rider) {
            return redirect()->route('rider.dashboard')
                ->with('error', 'Rider profile not found.');
        }

        $checkIns = $this->checkInService->getCheckInHistory($rider->id);

        return Inertia::render('Rider/CheckIn/History', [
            'checkIns' => $checkIns,
            'stats' => $this->checkInService->getCheckInStats($rider->id)
        ]);
    }
}
