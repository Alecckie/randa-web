<?php

namespace App\Services;

use App\Models\CampaignAssignment;
use App\Models\Helmet;
use App\Models\Rider;
use App\Models\RiderCheckIn;
use App\Models\RiderPauseEvent;
use App\Models\RiderRoute;
use App\Services\Shift\ShiftEarningsCalculator;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Exception;

class CheckInService
{
    public function __construct(
        private ShiftEarningsCalculator $earningsCalculator,
        private NotificationService $notificationService,
    ) {}

    /**
     * Process rider check-in via QR code scan
     */
    public function checkIn(string $qrCode, int $riderId, ?float $latitude = null, ?float $longitude = null): array
    {
        return DB::transaction(function () use ($qrCode, $riderId, $latitude, $longitude) {
            // Find helmet by QR code
            $helmet = Helmet::where('qr_code', $qrCode)->first();

            if (!$helmet) {
                throw new Exception('Invalid QR code. Helmet not found.');
            }

            // Find rider
            $rider = Rider::findOrFail($riderId);

            if ($rider->status !== 'approved') {
                throw new Exception('Your rider account is not approved yet.');
            }

            // Find active campaign assignment for this helmet
            $assignment = CampaignAssignment::where('helmet_id', $helmet->id)
                ->where('rider_id', $riderId)
                ->where('status', 'active')
                ->first();

            if (!$assignment) {
                throw new Exception('No active campaign assignment found for this helmet and rider.');
            }

            // Check if campaign is live and genuinely paid
            if (!in_array($assignment->campaign->status, ['active', 'submitted']) || $assignment->campaign->payment_status !== 'paid') {
                throw new Exception('The campaign associated with this helmet is not active or paid.');
            }

            if (Carbon::now()->hour < RiderCheckIn::earliestCheckInHour()) {
                $earliest = Carbon::today()->setHour(RiderCheckIn::earliestCheckInHour())->format('h:i A');
                throw new Exception("Check-in is not allowed before {$earliest}.");
            }

            if (Carbon::now()->hour >= RiderCheckIn::latestCheckInHour()) {
                $latest = Carbon::today()->setHour(RiderCheckIn::latestCheckInHour())->format('h:i A');
                throw new Exception("Check-in is not allowed after {$latest}.");
            }

            // Check if rider already has a shift record today, in any state.
            // A rider gets exactly one rider_check_ins row per day (enforced
            // by a DB unique constraint on rider_id+check_in_date), so this
            // must catch paused/resumed/ended too, not just 'started' —
            // otherwise the guard passes and the INSERT below fails with a
            // raw unique-constraint error instead of a friendly message.
            $existingCheckIn = RiderCheckIn::where('rider_id', $riderId)
                ->whereDate('check_in_date', Carbon::today())
                ->first();

            if ($existingCheckIn) {
                throw new Exception($existingCheckIn->status === RiderCheckIn::STATUS_ENDED
                    ? 'You have already completed your shift for today.'
                    : 'You have already checked in today at ' .
                        $existingCheckIn->check_in_time->format('h:i A'));
            }

            $checkIn = RiderCheckIn::create([
                'rider_id' => $riderId,
                'campaign_assignment_id' => $assignment->id,
                'check_in_date' => Carbon::today(),
                'check_in_time' => Carbon::now(),
                'check_out_time' => null,
                'daily_earning' => $rider->daily_rate ?? 70.00,
                'status' => 'started',
                'check_in_latitude' => $latitude,
                'check_in_longitude' => $longitude
            ]);

            return [
                'success' => true,
                'message' => 'Check-in successful! Have a great day.',
                'check_in' => $checkIn->load(['campaignAssignment.campaign', 'campaignAssignment.helmet']),
                'campaign_name' => $assignment->campaign->name,
                'helmet_code' => $helmet->helmet_code,
                'check_in_time' => $checkIn->formatted_check_in_time,
                'daily_earning' => $checkIn->formatted_daily_earning
            ];
        });
    }

    /**
     * End today's shift normally ("End Shift" button).
     */
    public function checkOut(int $riderId, ?float $latitude = null, ?float $longitude = null): array
    {
        return $this->finalizeShift($riderId, $latitude, $longitude, RiderCheckIn::END_REASON_COMPLETED);
    }

    /**
     * End today's shift early for a reason other than a normal finish —
     * e.g. sickness or an emergency ("Leave Shift" / "Stop Shift" button).
     * Pay is calculated exactly the same way as a normal check-out; only
     * the recorded reason differs.
     */
    public function leaveShift(
        int $riderId,
        string $reason = RiderCheckIn::END_REASON_OTHER,
        ?float $latitude = null,
        ?float $longitude = null
    ): array {
        return $this->finalizeShift($riderId, $latitude, $longitude, $reason);
    }

    /**
     * Shared implementation for every way a shift can end (normal
     * check-out, sickness, emergency, ...). This is the one place that
     * calculates and records a day's pay — update it here and every ending
     * path picks up the change.
     */
    private function finalizeShift(int $riderId, ?float $latitude, ?float $longitude, string $reason): array
    {
        return DB::transaction(function () use ($riderId, $latitude, $longitude, $reason) {
            // Find today's active check-in
            $checkIn = RiderCheckIn::where('rider_id', $riderId)
                ->whereDate('check_in_date', Carbon::today())
                ->where('status', '!=', RiderCheckIn::STATUS_ENDED)
                ->first();

            if (!$checkIn) {
                throw new Exception('No active check-in found for today.');
            }

            $checkOutTime = Carbon::now();
            $earnings = $this->earningsCalculator->calculate($checkIn, $checkOutTime);

            // If the rider ended their shift without resuming from a pause,
            // close that pause out too so pause history stays consistent
            // with the final status.
            $openPause = RiderPauseEvent::where('check_in_id', $checkIn->id)
                ->whereNull('resumed_at')
                ->latest('paused_at')
                ->first();

            if ($openPause) {
                $openPause->update([
                    'resumed_at' => $checkOutTime,
                    'duration_minutes' => max(0, $openPause->paused_at->diffInMinutes($checkOutTime, false)),
                ]);
            }

            $checkIn->update([
                'check_out_time' => $checkOutTime,
                'status' => RiderCheckIn::STATUS_ENDED,
                'end_reason' => $reason,
                'daily_earning' => $earnings['daily_earning'],
                'worked_hours' => $earnings['worked_hours'],
                'payable_hours' => $earnings['payable_hours'],
                'stationary_hours' => $earnings['stationary_hours'],
                'hourly_rate_applied' => $earnings['hourly_rate'],
                'check_out_latitude' => $latitude,
                'check_out_longitude' => $longitude
            ]);

            $rider = Rider::findOrFail($riderId);

            if ($earnings['qualifies_for_payment']) {
                $rider->increment('wallet_balance', $earnings['daily_earning']);
            } else {
                $this->notificationService->notifyRiderShiftNotQualified(
                    $rider,
                    $earnings['worked_hours'],
                    RiderCheckIn::minQualifyingHours()
                );
            }

            // Finalize route if exists
            $route = RiderRoute::where('check_in_id', $checkIn->id)->first();
            if ($route) {
                $route->update([
                    'ended_at' => $checkOutTime,
                ]);
                $route->updatePauseSummary();
            }

            $message = $earnings['qualifies_for_payment']
                ? 'Check-out successful! Your earnings have been added to your wallet.'
                : sprintf(
                    'Shift ended. You worked %.1f hour(s), below the %.1f-hour minimum required to qualify for payment — no earnings were recorded for today.',
                    $earnings['worked_hours'],
                    RiderCheckIn::minQualifyingHours()
                );

            return [
                'success' => true,
                'message' => $message,
                'data' => [
                    'check_out_time' => $checkIn->formatted_check_out_time,
                    'end_reason' => $reason,
                    'total_hours' => $earnings['total_hours'],
                    'worked_hours' => $earnings['worked_hours'],
                    'payable_hours' => $earnings['payable_hours'],
                    'paused_hours' => $earnings['paused_hours'],
                    'paused_minutes' => $earnings['paused_minutes'],
                    'stationary_hours' => $earnings['stationary_hours'],
                    'pause_count' => RiderPauseEvent::where('check_in_id', $checkIn->id)->count(),
                    'hourly_rate' => $earnings['hourly_rate'],
                    'max_hours_per_day' => RiderCheckIn::maxHoursPerDay(),
                    'min_qualifying_hours' => RiderCheckIn::minQualifyingHours(),
                    'qualifies_for_payment' => $earnings['qualifies_for_payment'],
                    'daily_earning' => $checkIn->formatted_daily_earning,
                    'new_wallet_balance' => 'KSh ' . number_format($rider->wallet_balance, 2)
                ]
            ];
        });
    }

    /**
     * Close out any check-in still open (started/paused/resumed) past that
     * shift's own day's closure time (RiderCheckIn::latestCheckInHour(),
     * e.g. 6:00 PM) — a rider who forgets to check out doesn't stay
     * "active" indefinitely. Uses that day's closure time as the checkout
     * moment (not "now"), so hours worked never extend past the daily
     * cutoff. Intended to run on a daily schedule (see routes/console.php),
     * but is idempotent and safe to run any time — it only touches rows
     * whose own closure time has already passed, so it also sweeps up any
     * pre-existing backlog of abandoned shifts the first time it runs.
     *
     * @return array{closed_count: int, total_paid: float}
     */
    public function autoCloseAbandonedShifts(): array
    {
        $latestHour = RiderCheckIn::latestCheckInHour();
        $closedCount = 0;
        $totalPaid = 0.0;

        RiderCheckIn::where('status', '!=', RiderCheckIn::STATUS_ENDED)
            ->get()
            ->each(function (RiderCheckIn $checkIn) use ($latestHour, &$closedCount, &$totalPaid) {
                $closureTime = $checkIn->check_in_date->copy()->setHour($latestHour)->startOfHour();

                if (Carbon::now()->lt($closureTime)) {
                    return; // that shift's own day hasn't reached its cutoff yet
                }

                DB::transaction(function () use ($checkIn, $closureTime, &$closedCount, &$totalPaid) {
                    $earnings = $this->earningsCalculator->calculate($checkIn, $closureTime);

                    $openPause = RiderPauseEvent::where('check_in_id', $checkIn->id)
                        ->whereNull('resumed_at')
                        ->latest('paused_at')
                        ->first();

                    if ($openPause) {
                        $openPause->update([
                            'resumed_at' => $closureTime,
                            'duration_minutes' => max(0, $openPause->paused_at->diffInMinutes($closureTime, false)),
                        ]);
                    }

                    $checkIn->update([
                        'check_out_time' => $closureTime,
                        'status' => RiderCheckIn::STATUS_ENDED,
                        'end_reason' => RiderCheckIn::END_REASON_AUTO_CLOSED,
                        'daily_earning' => $earnings['daily_earning'],
                        'worked_hours' => $earnings['worked_hours'],
                        'payable_hours' => $earnings['payable_hours'],
                        'stationary_hours' => $earnings['stationary_hours'],
                        'hourly_rate_applied' => $earnings['hourly_rate'],
                    ]);

                    $rider = Rider::findOrFail($checkIn->rider_id);

                    if ($earnings['qualifies_for_payment']) {
                        $rider->increment('wallet_balance', $earnings['daily_earning']);
                    }

                    $route = RiderRoute::where('check_in_id', $checkIn->id)->first();
                    if ($route) {
                        $route->update(['ended_at' => $closureTime]);
                        $route->updatePauseSummary();
                    }

                    $this->notificationService->notifyRiderShiftAutoClosed(
                        $rider,
                        $checkIn->check_in_date,
                        $earnings['worked_hours'],
                        $earnings['daily_earning'],
                        $earnings['qualifies_for_payment']
                    );

                    $closedCount++;
                    $totalPaid += $earnings['qualifies_for_payment'] ? $earnings['daily_earning'] : 0.0;
                });
            });

        return ['closed_count' => $closedCount, 'total_paid' => round($totalPaid, 2)];
    }

    /**
     * Get today's check-in status for a rider
     */
    public function getTodayCheckInStatus(int $riderId): ?array
    {
        $checkIn = RiderCheckIn::where('rider_id', $riderId)
            ->whereDate('check_in_date', Carbon::today())
            ->with(['campaignAssignment.campaign', 'campaignAssignment.helmet'])
            ->first();


        if (!$checkIn) {
            return null;
        }

        return [
            'id' => $checkIn->id,
            'status' => $checkIn->status,
            'check_in_time' => $checkIn->formatted_check_in_time,
            'check_out_time' => $checkIn->formatted_check_out_time,
            'worked_hours' => $checkIn->worked_hours,
            'paused_hours' => $checkIn->paused_hours,
            'daily_earning' => $checkIn->formatted_daily_earning,
            // 'campaign_name' => $checkIn->campaignAssignment->campaign->name ?? 'N/A',
            // 'helmet_code' => $checkIn->campaignAssignment->helmet->helmet_code ?? 'N/A',
        ];
    }

    /**
     * Get rider's check-in history
     */
    public function getCheckInHistory(int $riderId, int $perPage = 15)
    {
        return RiderCheckIn::where('rider_id', $riderId)
            ->with(['campaignAssignment.campaign', 'campaignAssignment.helmet'])
            ->orderBy('check_in_date', 'desc')
            ->orderBy('check_in_time', 'desc')
            ->paginate($perPage);
    }

    /**
     * Get rider's check-in statistics
     */
    public function getCheckInStats(int $riderId): array
    {
        $totalCheckIns = RiderCheckIn::where('rider_id', $riderId)->count();
        $completedCheckIns = RiderCheckIn::where('rider_id', $riderId)
            ->where('status', 'ended')
            ->count();

        $totalEarnings = RiderCheckIn::where('rider_id', $riderId)
            ->where('status', 'ended')
            ->sum('daily_earning');

        $totalHours = RiderCheckIn::where('rider_id', $riderId)
            ->where('status', 'ended')
            ->get()
            ->sum(function ($checkIn) {
                return $checkIn->worked_hours ?? 0;
            });

        $thisMonthCheckIns = RiderCheckIn::where('rider_id', $riderId)
            ->whereMonth('check_in_date', Carbon::now()->month)
            ->whereYear('check_in_date', Carbon::now()->year)
            ->where('status', 'ended')
            ->count();

        $thisMonthEarnings = RiderCheckIn::where('rider_id', $riderId)
            ->whereMonth('check_in_date', Carbon::now()->month)
            ->whereYear('check_in_date', Carbon::now()->year)
            ->where('status', 'ended')
            ->sum('daily_earning');

        return [
            'total_check_ins' => $totalCheckIns,
            'completed_check_ins' => $completedCheckIns,
            'total_earnings' => 'KSh ' . number_format($totalEarnings, 2),
            'total_hours_worked' => round($totalHours, 2),
            'this_month_check_ins' => $thisMonthCheckIns,
            'this_month_earnings' => 'KSh ' . number_format($thisMonthEarnings, 2),
            'average_hours_per_day' => $completedCheckIns > 0
                ? round($totalHours / $completedCheckIns, 2)
                : 0
        ];
    }
    public function getCampaignSummary(int $riderId): array
    {
        $assignment = \App\Models\CampaignAssignment::with([
            'campaign:id,name,description,start_date,end_date,helmet_count,status',
            'helmet:id,helmet_code',
        ])
            ->where('rider_id', $riderId)
            ->where('status', 'active')
            ->latest('assigned_at')
            ->first();

        if (! $assignment) {
            throw new \Exception('No active campaign assignment found for this rider.');
        }

        $campaign    = $assignment->campaign;
        $campaignId  = $campaign->id;
        $startDate   = \Carbon\Carbon::parse($campaign->start_date)->startOfDay();
        $endDate     = \Carbon\Carbon::parse($campaign->end_date)->endOfDay();
        $today       = \Carbon\Carbon::today();
        $now         = \Carbon\Carbon::now();

        $stats = RiderCheckIn::query()
            ->join(
                'campaign_assignments',
                'rider_check_ins.campaign_assignment_id',
                '=',
                'campaign_assignments.id'
            )
            ->where('rider_check_ins.rider_id', $riderId)
            ->where('campaign_assignments.campaign_id', $campaignId)
            ->where('rider_check_ins.status', 'ended')
            ->selectRaw('
            COUNT(*)                        AS total_days_worked,
            COALESCE(SUM(daily_earning), 0) AS total_earnings,
            COALESCE(
                SUM(
                    TIMESTAMPDIFF(
                        MINUTE,
                        check_in_time,
                        check_out_time
                    )
                ) / 60.0,
                0
            )                               AS total_hours_worked
        ')
            ->first();

        $todayCheckIn = RiderCheckIn::query()
            ->join(
                'campaign_assignments',
                'rider_check_ins.campaign_assignment_id',
                '=',
                'campaign_assignments.id'
            )
            ->where('rider_check_ins.rider_id', $riderId)
            ->where('campaign_assignments.campaign_id', $campaignId)
            ->whereDate('rider_check_ins.check_in_date', $today)
            ->select('rider_check_ins.*')
            ->latest('rider_check_ins.check_in_time')
            ->first();

        $campaignDurationDays = (int) $startDate->diffInDays($endDate) + 1; // inclusive
        $dayOfCampaign        = (int) $startDate->diffInDays($today) + 1;   // e.g. "3rd day"
        $dayOfCampaign        = max(1, min($dayOfCampaign, $campaignDurationDays));

        // Remaining days = days from tomorrow to end_date (inclusive)
        $tomorrow        = $today->copy()->addDay()->startOfDay();
        $remainingDays   = max(0, (int) $tomorrow->diffInDays($endDate->copy()->startOfDay()) + 1);

        // If campaign has already ended or today is last day, remaining = 0
        if ($endDate->isPast() && ! $endDate->isToday()) {
            $remainingDays = 0;
        }

        $todayEarning = 0.0;

        if ($todayCheckIn) {
            if ($todayCheckIn->status === 'ended') {
                $todayEarning = (float) $todayCheckIn->daily_earning;
            } else {
                // Check-in is still active — estimate earnings so far using
                // the same rules that will apply when the shift actually ends.
                $todayEarning = $this->earningsCalculator->calculate($todayCheckIn, $now)['daily_earning'];
            }
        }


        $rider                   = Rider::findOrFail($riderId);
        $hoursPerDay             = RiderCheckIn::maxHoursPerDay();
        $hourlyRate              = RiderCheckIn::hourlyRateFor($rider);
        $expectedDailyEarning    = $hoursPerDay * $hourlyRate;
        $expectedRemainingEarnings = $remainingDays * $expectedDailyEarning;

        // ── Ordinal helper ──────────────────────────────────────────────────────
        $ordinal = static function (int $n): string {
            $suffix = match (true) {
                ($n % 100 >= 11 && $n % 100 <= 13) => 'th',
                ($n % 10 === 1)                     => 'st',
                ($n % 10 === 2)                     => 'nd',
                ($n % 10 === 3)                     => 'rd',
                default                             => 'th',
            };
            return "{$n}{$suffix}";
        };

        // ── Assemble response ───────────────────────────────────────────────────
        return [
            'campaign' => [
                'id'          => $campaign->id,
                'name'        => $campaign->name,
                'description' => $campaign->description,
                'status'      => $campaign->status,
                'start_date'  => $startDate->toDateString(),
                'end_date'    => $endDate->toDateString(),
                'duration_days' => $campaignDurationDays,
            ],

            'progress' => [
                'day_of_campaign'       => $dayOfCampaign,
                'day_of_campaign_label' => $ordinal($dayOfCampaign) . ' day of the campaign',
                'remaining_days'        => $remainingDays,
                'campaign_duration_days' => $campaignDurationDays,
            ],

            'earnings' => [
                'today'                     => round($todayEarning, 2),
                'today_formatted'           => 'KSh ' . number_format($todayEarning, 2),
                'total_campaign'            => round((float) $stats->total_earnings, 2),
                'total_campaign_formatted'  => 'KSh ' . number_format((float) $stats->total_earnings, 2),
                'expected_remaining'        => $expectedRemainingEarnings,
                'expected_remaining_formatted' => 'KSh ' . number_format($expectedRemainingEarnings, 2),
                'expected_remaining_note'   => "Based on working a full {$hoursPerDay}-hour day × KSh {$hourlyRate}/hr for {$remainingDays} remaining day(s)",
                'hourly_rate'               => $hourlyRate,
            ],

            'work_summary' => [
                'total_days_worked'   => (int) $stats->total_days_worked,
                'total_hours_worked'  => round((float) $stats->total_hours_worked, 2),
                'today_checked_in'    => ! is_null($todayCheckIn),
                'today_check_in_time' => $todayCheckIn?->check_in_time?->format('h:i A'),
                'today_status'        => $todayCheckIn?->status ?? 'not_checked_in',
            ],

            'assignment' => [
                'id'          => $assignment->id,
                'helmet_code' => $assignment->helmet?->helmet_code,
                'assigned_at' => $assignment->assigned_at?->toDateTimeString(),
            ],
        ];
    }





    /**
     * Validate QR code and get assignment info
     */
    public function validateQrCode(string $qrCode, int $riderId): array
    {
        $helmet = Helmet::where('qr_code', $qrCode)->first();

        if (!$helmet) {
            throw new Exception('Invalid QR code.');
        }

        $assignment = CampaignAssignment::where('helmet_id', $helmet->id)
            ->where('rider_id', $riderId)
            ->where('status', 'active')
            ->with(['campaign', 'helmet'])
            ->first();

        if (!$assignment) {
            throw new Exception('This helmet is not assigned to you.');
        }

        return [
            'valid' => true,
            'helmet_code' => $helmet->helmet_code,
            'campaign_name' => $assignment->campaign->name,
            'campaign_status' => $assignment->campaign->status,
            'assignment_id' => $assignment->id
        ];
    }
}
