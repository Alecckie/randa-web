<?php

namespace App\Services\Shift;

use App\Models\RiderCheckIn;
use App\Models\RiderPauseEvent;
use Carbon\Carbon;

/**
 * Single source of truth for turning a rider's check-in + pause history into
 * hours worked and a pay figure. Used both to finalize a shift's payment
 * (CheckInService::finalizeShift) and to estimate today's earnings while a
 * shift is still in progress (CheckInService::getCampaignSummary).
 *
 * Business rules:
 * - A rider must work at least RiderCheckIn::minQualifyingHours() (after
 *   pause time is deducted) to be paid anything for the day at all.
 * - Pay is capped at RiderCheckIn::maxHoursPerDay() worth of hours — working
 *   longer than a full day does not earn more than the rider's daily_rate.
 * - The hourly rate is derived per rider (daily_rate / max_hours_per_day),
 *   not a flat global figure, since daily_rate can vary by rider.
 * - Sustained GPS-detected stationary time is deducted from worked_hours
 *   the same way a declared pause is (RiderMovementAnalyzer) — pay tracks
 *   actual movement, not just elapsed clock time between check-in/out.
 * The threshold and max-hours settings live in config/rider_shift.php so
 * they can be changed without touching this code.
 */
class ShiftEarningsCalculator
{
    public function __construct(
        private RiderMovementAnalyzer $movementAnalyzer,
    ) {}

    /**
     * @return array{
     *     total_hours: float,
     *     paused_hours: float,
     *     paused_minutes: int,
     *     stationary_hours: float,
     *     worked_hours: float,
     *     payable_hours: float,
     *     hourly_rate: float,
     *     qualifies_for_payment: bool,
     *     daily_earning: float,
     * }
     */
    public function calculate(RiderCheckIn $checkIn, Carbon $asOf): array
    {
        // Explicit non-absolute diff + max(0, ...), rather than relying on
        // Carbon's default absolute diff, so a clock-skew/bad-data case
        // where $asOf precedes check_in_time clamps to zero instead of
        // silently reporting a wrong-but-positive elapsed time.
        $totalMinutes = max(0, $checkIn->check_in_time->diffInMinutes($asOf, false));
        $pausedMinutes = $this->pausedMinutes($checkIn, $asOf);

        $movement = $this->movementAnalyzer->analyze($checkIn->id, $checkIn->check_in_time, $asOf);
        $stationaryMinutes = $movement['has_sufficient_data'] ? $movement['stationary_minutes'] : 0.0;

        $totalHours = $totalMinutes / 60;
        $pausedHours = $pausedMinutes / 60;
        $stationaryHours = $stationaryMinutes / 60;
        $workedHours = max(0, $totalHours - $pausedHours - $stationaryHours);
        $payableHours = min($workedHours, RiderCheckIn::maxHoursPerDay());

        $hourlyRate = RiderCheckIn::hourlyRateFor($checkIn->rider);
        $qualifies = $workedHours >= RiderCheckIn::minQualifyingHours();
        $dailyEarning = $qualifies ? round($payableHours * $hourlyRate, 2) : 0.0;

        return [
            'total_hours' => round($totalHours, 2),
            'paused_hours' => round($pausedHours, 2),
            'paused_minutes' => (int) round($pausedMinutes),
            'stationary_hours' => round($stationaryHours, 2),
            'worked_hours' => round($workedHours, 2),
            'payable_hours' => round($payableHours, 2),
            'hourly_rate' => round($hourlyRate, 2),
            'qualifies_for_payment' => $qualifies,
            'daily_earning' => $dailyEarning,
        ];
    }

    /**
     * Sum of completed pause durations, plus — if the rider is still paused
     * at $asOf (e.g. they ended their shift without resuming) — the
     * in-progress pause up to $asOf. Without this second part, ending a
     * shift while paused would silently fail to deduct that open pause.
     */
    private function pausedMinutes(RiderCheckIn $checkIn, Carbon $asOf): float
    {
        $completedMinutes = (float) RiderPauseEvent::where('check_in_id', $checkIn->id)
            ->whereNotNull('resumed_at')
            ->sum('duration_minutes');

        $openPause = RiderPauseEvent::where('check_in_id', $checkIn->id)
            ->whereNull('resumed_at')
            ->latest('paused_at')
            ->first();

        if ($openPause) {
            $completedMinutes += max(0, $openPause->paused_at->diffInMinutes($asOf, false));
        }

        return max(0, $completedMinutes);
    }
}
