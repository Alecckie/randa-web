<?php

namespace App\Console\Commands\RiderShifts;

use App\Models\Rider;
use App\Models\RiderCheckIn;
use App\Models\RiderGpsPoint;
use App\Models\RiderPauseEvent;
use App\Models\RiderRoute;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * One-off cleanup: everything dated before an explicitly-chosen cutoff was
 * seeded demo/test data, not real rider activity. Deletes rider_check_ins
 * (and their pause events, routes, and GPS points) before that date,
 * decrementing each affected rider's wallet_balance by the unsettled
 * earnings being removed so it stays consistent with what actually remains
 * in the audit trail.
 *
 * --before has NO default on purpose. An earlier version defaulted to
 * 2026-07-04 (the seed/real-data boundary in one specific development
 * sandbox) and that default was carried into a runbook and run verbatim
 * against a real server, where "today" wasn't anywhere near July 2026 —
 * every real historical row matched the cutoff and was deleted. Never give
 * a destructive, date-scoped delete a default date; the correct boundary
 * is different on every environment and changes over time.
 */
class PurgeSeededData extends Command
{
    protected $signature = 'rider-shifts:purge-seeded-data
        {--before= : REQUIRED. Delete data strictly before this date (YYYY-MM-DD). No default — you must deliberately choose the real seed/real-data boundary for THIS environment.}
        {--dry-run : Preview counts and wallet impact without deleting anything}
        {--force : Skip the confirmation prompt (needed for non-interactive/scripted runs)}';

    protected $description = 'Permanently delete rider check-ins, pause events, routes, and GPS points dated before an explicitly-chosen cutoff (seeded/demo data)';

    public function handle(): int
    {
        $beforeOption = $this->option('before');

        if (! $beforeOption) {
            $this->error('You must pass --before=YYYY-MM-DD explicitly — there is no default. Pick the real seed/real-data boundary for this specific environment; do not reuse a date from documentation or another environment without verifying it applies here.');
            return Command::FAILURE;
        }

        $cutoff = Carbon::parse($beforeOption)->startOfDay();
        $dryRun = (bool) $this->option('dry-run');

        $checkIns = RiderCheckIn::where('check_in_date', '<', $cutoff)->get();
        $checkInIds = $checkIns->pluck('id');

        $gpsCount = RiderGpsPoint::where('recorded_at', '<', $cutoff)->count();
        $routeCount = RiderRoute::where('route_date', '<', $cutoff)->count();
        $pauseCount = RiderPauseEvent::whereIn('check_in_id', $checkInIds)->count();

        $walletAdjustments = $checkIns
            ->where('status', RiderCheckIn::STATUS_ENDED)
            ->whereNull('settled_at')
            ->filter(fn (RiderCheckIn $c) => (float) $c->daily_earning > 0)
            ->groupBy('rider_id')
            ->map(fn ($group) => round($group->sum(fn (RiderCheckIn $c) => (float) $c->daily_earning), 2));

        $this->table(['Table', 'Rows to delete'], [
            ['rider_check_ins', $checkIns->count()],
            ['rider_pause_events', $pauseCount],
            ['rider_routes', $routeCount],
            ['rider_gps_points', $gpsCount],
        ]);

        if ($walletAdjustments->isNotEmpty()) {
            $this->table(
                ['Rider ID', 'Wallet adjustment (unsettled earnings on deleted rows)'],
                $walletAdjustments->map(fn ($amount, $riderId) => [$riderId, '-' . number_format($amount, 2)])->values()->toArray()
            );
        }

        if ($checkIns->isEmpty() && $gpsCount === 0 && $routeCount === 0) {
            $this->info("Nothing before {$cutoff->toDateString()} to delete.");
            return Command::SUCCESS;
        }

        if ($dryRun) {
            $this->warn('Dry run — no changes made.');
            return Command::SUCCESS;
        }

        $newestDeletedDate = $checkIns->max('check_in_date')?->toDateString();

        if ($newestDeletedDate) {
            $this->warn("This will permanently delete data up to and including {$newestDeletedDate}. Make sure that's actually seeded/test data on THIS environment, not real history.");
        }

        if (! $this->option('force') && ! $this->confirm('This cannot be undone. Proceed with permanent deletion?', false)) {
            $this->warn('Aborted — no changes made.');
            return Command::SUCCESS;
        }

        DB::transaction(function () use ($checkInIds, $walletAdjustments) {
            foreach ($walletAdjustments as $riderId => $amount) {
                Rider::whereKey($riderId)->lockForUpdate()->first()?->decrement('wallet_balance', $amount);
            }

            RiderPauseEvent::whereIn('check_in_id', $checkInIds)->delete();
            RiderCheckIn::whereIn('id', $checkInIds)->delete();
        });

        // Potentially large tables — delete by date directly rather than
        // loading into PHP, outside the main transaction to avoid a long-held
        // lock on a bulk operation that doesn't need atomicity with the above.
        RiderRoute::where('route_date', '<', $cutoff)->delete();
        RiderGpsPoint::where('recorded_at', '<', $cutoff)->delete();

        $this->info('Purge complete.');

        return Command::SUCCESS;
    }
}
