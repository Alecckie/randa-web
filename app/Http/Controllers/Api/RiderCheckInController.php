<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\CheckInService;
use App\Services\Shift\RiderPayoutService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class RiderCheckInController extends Controller
{
    protected $checkInService;

    public function __construct(
        CheckInService $checkInService,
        private RiderPayoutService $payoutService,
    ) {
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
     * End the shift early for a reason other than a normal finish —
     * e.g. sickness or an emergency ("Leave Shift" / "Stop Shift").
     * Pay is calculated the same way as a normal check-out (worked hours
     * minus pause time, subject to the minimum-hours-to-qualify rule);
     * only the recorded reason differs.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function leaveShift(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'reason' => 'required|string|in:sickness,emergency,other',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
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

            $result = $this->checkInService->leaveShift(
                $rider->id,
                $request->reason,
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

            $month = (int) $request->input('month', now()->month);
            $year = (int) $request->input('year', now()->year);

            $from = Carbon::create($year, $month, 1)->startOfMonth();
            $to = $from->copy()->endOfMonth();

            $summary = $this->payoutService->periodSummary($rider->id, $from, $to);
            $daysWorked = $summary['days_worked'];

            return response()->json([
                'success' => true,
                'data' => [
                    'month' => $month,
                    'year' => $year,
                    'total_days_worked' => $daysWorked,
                    'total_earnings' => 'KSh ' . number_format($summary['total_earning'], 2),
                    'average_daily_earning' => 'KSh ' . number_format(
                        $daysWorked > 0 ? $summary['total_earning'] / $daysWorked : 0,
                        2
                    ),
                    'total_hours_worked' => $summary['total_hours_worked'],
                    'total_owed' => $summary['total_owed'],
                    'daily_breakdown' => array_map(fn (array $day) => [
                        'date' => $day['date'],
                        'earnings' => 'KSh ' . number_format($day['daily_earning'], 2),
                        'hours' => $day['worked_hours'],
                        'settled' => $day['settled'],
                        'daily_earning' => $day['daily_earning'],
                        'max_possible_earning' => $day['max_possible_earning'],
                    ], $summary['days']),
                ],
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
