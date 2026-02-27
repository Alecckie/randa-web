<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\CheckInService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class RiderCheckInController extends Controller
{
    protected $checkInService;

    public function __construct(CheckInService $checkInService)
    {
        $this->checkInService = $checkInService;
    }

    /**
     * Get rider's check-in overview
     *
     * @return JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $rider = $request->user()->rider;

            if (!$rider) {
                return response()->json([
                    'success' => false,
                    'message' => 'Rider profile not found.'
                ], 404);
            }

            $todayStatus = $this->checkInService->getTodayCheckInStatus($rider->id);
            $stats = $this->checkInService->getCheckInStats($rider->id);

            return response()->json([
                'success' => true,
                'data' => [
                    'today_status' => $todayStatus,
                    'stats' => $stats,
                    'rider' => [
                        'id' => $rider->id,
                        'name' => $rider->user->name,
                        'wallet_balance' => 'KSh ' . number_format($rider->wallet_balance, 2),
                        'daily_rate' => 'KSh ' . number_format($rider->daily_rate, 2),
                    ]
                ]
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch check-in data.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Process check-in via QR code
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function checkIn(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'qr_code' => 'required|string|min:3|max:255',
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $rider = $request->user()->rider;

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

            return response()->json($result, 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }

    /**
     * Process check-out
     *
     * @return JsonResponse
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
            $rider = $request->user()->rider;

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
     * Validate QR code before check-in
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function validateQrCode(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'qr_code' => 'required|string|min:3|max:255'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $rider = $request->user()->rider;

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
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }

    /**
     * Get today's check-in status
     *
     * @return JsonResponse
     */
    public function getTodayStatus(Request $request): JsonResponse
    {
        try {
            $rider = $request->user()->rider;

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
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch status.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Get check-in history with pagination
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function history(Request $request): JsonResponse
    {
        try {
            $rider = $request->user()->rider;

            if (!$rider) {
                return response()->json([
                    'success' => false,
                    'message' => 'Rider profile not found.'
                ], 404);
            }

            $perPage = $request->input('per_page', 15);
            $checkIns = $this->checkInService->getCheckInHistory($rider->id, $perPage);

            return response()->json([
                'success' => true,
                'data' => [
                    'check_ins' => $checkIns->items(),
                    'pagination' => [
                        'current_page' => $checkIns->currentPage(),
                        'last_page' => $checkIns->lastPage(),
                        'per_page' => $checkIns->perPage(),
                        'total' => $checkIns->total(),
                        'from' => $checkIns->firstItem(),
                        'to' => $checkIns->lastItem(),
                    ]
                ]
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch history.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Get check-in statistics
     *
     * @return JsonResponse
     */
    public function stats(Request $request): JsonResponse
    {
        try {
            $rider = $request->user()->rider;

            if (!$rider) {
                return response()->json([
                    'success' => false,
                    'message' => 'Rider profile not found.'
                ], 404);
            }

            $stats = $this->checkInService->getCheckInStats($rider->id);

            return response()->json([
                'success' => true,
                'data' => $stats
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch statistics.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Get check-in details by ID
     *
     * @param int $id
     * @return JsonResponse
     */
    // public function show(int $id): JsonResponse
    // {
    //     try {
    //         $rider = Auth::user()->rider;

    //         if (!$rider) {
    //             return response()->json([
    //                 'success' => false,
    //                 'message' => 'Rider profile not found.'
    //             ], 404);
    //         }

    //         $checkIn = \App\Models\RiderCheckIn::with([
    //             'campaignAssignment.campaign',
    //             'campaignAssignment.helmet'
    //         ])
    //             ->where('id', $id)
    //             ->where('rider_id', $rider->id)
    //             ->first();

    //         if (!$checkIn) {
    //             return response()->json([
    //                 'success' => false,
    //                 'message' => 'Check-in record not found.'
    //             ], 404);
    //         }

    //         return response()->json([
    //             'success' => true,
    //             'data' => [
    //                 'id' => $checkIn->id,
    //                 'check_in_date' => $checkIn->check_in_date->format('Y-m-d'),
    //                 'check_in_time' => $checkIn->formatted_check_in_time,
    //                 'check_out_time' => $checkIn->formatted_check_out_time,
    //                 'worked_hours' => $checkIn->worked_hours,
    //                 'daily_earning' => $checkIn->formatted_daily_earning,
    //                 'status' => $checkIn->status,
    //                 'campaign' => [
    //                     'id' => $checkIn->campaignAssignment->campaign->id,
    //                     'name' => $checkIn->campaignAssignment->campaign->name,
    //                 ],
    //                 'helmet' => [
    //                     'id' => $checkIn->campaignAssignment->helmet->id,
    //                     'code' => $checkIn->campaignAssignment->helmet->helmet_code,
    //                 ]
    //             ]
    //         ], 200);
    //     } catch (\Exception $e) {
    //         return response()->json([
    //             'success' => false,
    //             'message' => 'Failed to fetch check-in details.',
    //             'error' => config('app.debug') ? $e->getMessage() : null
    //         ], 500);
    //     }
    // }

    /**
     * Force check-out (admin only or emergency)
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function forceCheckOut(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'check_in_id' => 'required|integer|exists:rider_check_ins,id',
            'reason' => 'nullable|string|max:500'
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

            $checkIn = \App\Models\RiderCheckIn::where('id', $request->check_in_id)
                ->where('rider_id', $rider->id)
                ->where('status', 'active')
                ->first();

            if (!$checkIn) {
                return response()->json([
                    'success' => false,
                    'message' => 'Active check-in not found.'
                ], 404);
            }

            // Force check-out
            $checkIn->update([
                'check_out_time' => now(),
                'status' => 'completed'
            ]);

            // Update wallet
            $rider->increment('wallet_balance', $checkIn->daily_earning);

            return response()->json([
                'success' => true,
                'message' => 'Force check-out successful.',
                'data' => [
                    'check_out_time' => $checkIn->formatted_check_out_time,
                    'worked_hours' => $checkIn->worked_hours,
                    'daily_earning' => $checkIn->formatted_daily_earning,
                ]
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to force check-out.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Get current active assignment for rider
     *
     * @return JsonResponse
     */
    public function currentAssignment(): JsonResponse
    {
        try {
            $rider = Auth::user()->rider;

            if (!$rider) {
                return response()->json([
                    'success' => false,
                    'message' => 'Rider profile not found.'
                ], 404);
            }

            $assignment = $rider->currentAssignment()
                ->with(['campaign', 'helmet'])
                ->first();

            if (!$assignment) {
                return response()->json([
                    'success' => true,
                    'message' => 'No active assignment found.',
                    'data' => null
                ], 200);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $assignment->id,
                    'assigned_at' => $assignment->assigned_at->format('Y-m-d H:i:s'),
                    'status' => $assignment->status,
                    'campaign' => [
                        'id' => $assignment->campaign->id,
                        'name' => $assignment->campaign->name,
                        'start_date' => $assignment->campaign->start_date,
                        'end_date' => $assignment->campaign->end_date,
                        'status' => $assignment->campaign->status,
                    ],
                    'helmet' => [
                        'id' => $assignment->helmet->id,
                        'code' => $assignment->helmet->helmet_code,
                        'qr_code' => $assignment->helmet->qr_code,
                        'status' => $assignment->helmet->status,
                    ]
                ]
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch assignment.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Get monthly earnings summary
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function monthlyEarnings(Request $request): JsonResponse
    {
        try {
            $rider = Auth::user()->rider;

            if (!$rider) {
                return response()->json([
                    'success' => false,
                    'message' => 'Rider profile not found.'
                ], 404);
            }

            $month = $request->input('month', now()->month);
            $year = $request->input('year', now()->year);

            $earnings = \App\Models\RiderCheckIn::where('rider_id', $rider->id)
                ->whereMonth('check_in_date', $month)
                ->whereYear('check_in_date', $year)
                ->where('status', 'completed')
                ->selectRaw('
                    COUNT(*) as total_days,
                    SUM(daily_earning) as total_earnings,
                    AVG(daily_earning) as average_earning,
                    DATE(check_in_date) as date,
                    SUM(TIMESTAMPDIFF(HOUR, check_in_time, check_out_time)) as total_hours
                ')
                ->groupBy('date')
                ->orderBy('date', 'desc')
                ->get();

            $summary = [
                'month' => $month,
                'year' => $year,
                'total_days_worked' => $earnings->count(),
                'total_earnings' => 'KSh ' . number_format($earnings->sum('total_earnings'), 2),
                'average_daily_earning' => 'KSh ' . number_format($earnings->avg('average_earning'), 2),
                'total_hours_worked' => $earnings->sum('total_hours'),
                'daily_breakdown' => $earnings->map(function ($item) {
                    return [
                        'date' => $item->date,
                        'earnings' => 'KSh ' . number_format($item->total_earnings, 2),
                        'hours' => $item->total_hours
                    ];
                })
            ];

            return response()->json([
                'success' => true,
                'data' => $summary
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch monthly earnings.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }
}
