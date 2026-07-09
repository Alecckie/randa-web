<?php

namespace App\Services\Shift;

use App\Models\Rider;
use App\Models\RiderCheckIn;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Turns a rider's finalized shifts into a day-by-day payout audit and
 * handles admin settlement of outstanding dues. Reads the hours/rate/earning
 * figures snapshotted on each RiderCheckIn at checkout time
 * (see CheckInService::finalizeShift) rather than recomputing them, so a
 * settled or historical day's amount never drifts if pay rules change later.
 */
class RiderPayoutService
{
    /**
     * Day-by-day breakdown of every ended shift for a rider in [from, to].
     *
     * @return array<int, array<string, mixed>>
     */
    public function dailyAudit(int $riderId, Carbon $from, Carbon $to): array
    {
        return $this->auditRows(
            RiderCheckIn::where('rider_id', $riderId)
                ->whereBetween('check_in_date', [$from->toDateString(), $to->toDateString()])
        );
    }

    /**
     * Day-by-day breakdown scoped to a single campaign assignment — i.e.
     * this rider's earnings/check-ins for this one campaign only, not their
     * whole history. Used by the "view this rider's activity for this
     * campaign" link on Campaigns/Show.
     *
     * @return array<int, array<string, mixed>>
     */
    public function dailyAuditForAssignment(int $campaignAssignmentId): array
    {
        return $this->auditRows(
            RiderCheckIn::where('campaign_assignment_id', $campaignAssignmentId)
        );
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function auditRows($query): array
    {
        return $query
            ->where('status', RiderCheckIn::STATUS_ENDED)
            ->with('rider')
            ->orderBy('check_in_date')
            ->get()
            ->map(fn (RiderCheckIn $checkIn) => $this->auditRow($checkIn))
            ->all();
    }

    /**
     * Totals for [from, to] plus the day-by-day breakdown that produced them.
     * Totals are computed as a DB-level DECIMAL SUM (not summed in PHP from
     * already-rounded floats) so they can't accumulate float rounding drift
     * across many days.
     */
    public function periodSummary(int $riderId, Carbon $from, Carbon $to): array
    {
        $summary = $this->summaryFromQuery(
            RiderCheckIn::where('rider_id', $riderId)
                ->whereBetween('check_in_date', [$from->toDateString(), $to->toDateString()]),
            $this->dailyAudit($riderId, $from, $to)
        );

        return ['from' => $from->toDateString(), 'to' => $to->toDateString(), ...$summary];
    }

    /**
     * Totals + day-by-day breakdown scoped to a single campaign assignment
     * — this rider's earnings for this one campaign only.
     */
    public function summaryForAssignment(int $campaignAssignmentId): array
    {
        return $this->summaryFromQuery(
            RiderCheckIn::where('campaign_assignment_id', $campaignAssignmentId),
            $this->dailyAuditForAssignment($campaignAssignmentId)
        );
    }

    /**
     * Totals are computed as a DB-level DECIMAL SUM (not summed in PHP from
     * already-rounded floats) so they can't accumulate float rounding drift
     * across many days.
     */
    private function summaryFromQuery($query, array $days): array
    {
        $totals = $query
            ->where('status', RiderCheckIn::STATUS_ENDED)
            ->selectRaw('
                COUNT(*) AS days_worked,
                COALESCE(SUM(worked_hours), 0) AS total_hours_worked,
                COALESCE(SUM(payable_hours), 0) AS total_payable_hours,
                COALESCE(SUM(daily_earning), 0) AS total_earning,
                COALESCE(SUM(CASE WHEN settled_at IS NOT NULL THEN daily_earning ELSE 0 END), 0) AS total_settled,
                COALESCE(SUM(CASE WHEN settled_at IS NULL THEN daily_earning ELSE 0 END), 0) AS total_owed
            ')
            ->first();

        return [
            'days_worked' => (int) $totals->days_worked,
            'total_hours_worked' => round((float) $totals->total_hours_worked, 2),
            'total_payable_hours' => round((float) $totals->total_payable_hours, 2),
            'total_earning' => round((float) $totals->total_earning, 2),
            'total_settled' => round((float) $totals->total_settled, 2),
            'total_owed' => round((float) $totals->total_owed, 2),
            'days' => $days,
        ];
    }

    /**
     * Total outstanding (unsettled) earnings for a rider, all-time.
     */
    public function owedTotal(int $riderId): float
    {
        return round((float) RiderCheckIn::where('rider_id', $riderId)
            ->where('status', RiderCheckIn::STATUS_ENDED)
            ->unsettled()
            ->sum('daily_earning'), 2);
    }

    /**
     * Mark all outstanding qualifying shifts (up to and including $upTo, or
     * all outstanding shifts if $upTo is null) as settled, and bring the
     * rider's wallet_balance down by the amount paid out.
     *
     * Locks the rider row and the candidate check-in rows for the duration
     * of the transaction so two concurrent settle requests for the same
     * rider can't both read the same "unsettled" set and double-pay it —
     * meaningful now that these tables run on InnoDB instead of MyISAM.
     *
     * @return array{settled_count: int, settled_total: float, remaining_wallet_balance: float}
     */
    public function settle(Rider $rider, int $settledByUserId, ?Carbon $upTo = null): array
    {
        return DB::transaction(function () use ($rider, $settledByUserId, $upTo) {
            $lockedRider = Rider::whereKey($rider->id)->lockForUpdate()->firstOrFail();

            $query = RiderCheckIn::where('rider_id', $lockedRider->id)
                ->where('status', RiderCheckIn::STATUS_ENDED)
                ->unsettled()
                ->where('daily_earning', '>', 0)
                ->lockForUpdate();

            if ($upTo) {
                $query->whereDate('check_in_date', '<=', $upTo->toDateString());
            }

            $checkInIds = $query->pluck('daily_earning', 'id');
            $total = round((float) $checkInIds->sum(), 2);

            if ($total > 0) {
                RiderCheckIn::whereIn('id', $checkInIds->keys())->update([
                    'settled_at' => now(),
                    'settled_by' => $settledByUserId,
                ]);

                $lockedRider->decrement('wallet_balance', $total);
            }

            return [
                'settled_count' => $checkInIds->count(),
                'settled_total' => $total,
                'remaining_wallet_balance' => round((float) $lockedRider->fresh()->wallet_balance, 2),
            ];
        });
    }

    private function auditRow(RiderCheckIn $checkIn): array
    {
        return [
            'check_in_id' => $checkIn->id,
            'date' => $checkIn->check_in_date->toDateString(),
            'check_in_time' => $checkIn->check_in_time?->format('h:i A'),
            'check_out_time' => $checkIn->check_out_time?->format('h:i A'),
            'worked_hours' => (float) $checkIn->worked_hours,
            'payable_hours' => (float) $checkIn->payable_hours,
            'stationary_hours' => (float) $checkIn->stationary_hours,
            'hourly_rate' => (float) $checkIn->hourly_rate_applied,
            'daily_earning' => (float) $checkIn->daily_earning,
            // The full daily rate this rider could have earned that day —
            // shown alongside daily_earning as "51.17 / 70.00" so a rider
            // can see how close they got to a full day's pay.
            'max_possible_earning' => (float) $checkIn->rider->daily_rate,
            'qualified' => (float) $checkIn->daily_earning > 0,
            'settled' => ! is_null($checkIn->settled_at),
            'settled_at' => $checkIn->settled_at?->toDateTimeString(),
        ];
    }
}
