<?php

namespace App\Console\Commands\RiderShifts;

use App\Models\Rider;
use App\Models\RiderCheckIn;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * wallet_balance is supposed to always equal the sum of a rider's
 * unsettled, ended check-ins' daily_earning — but seeded/legacy data can
 * drift from that (found system-wide on 2026-07-08: every rider's balance
 * was seeded independently of real check-in history). This recomputes and
 * corrects it per rider, using the check-in rows as the source of truth.
 */
class ReconcileWallets extends Command
{
    protected $signature = 'rider-shifts:reconcile-wallets {--dry-run : Preview mismatches without changing anything}';

    protected $description = "Set each rider's wallet_balance to exactly match the sum of their real unsettled earnings";

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $rows = [];

        DB::transaction(function () use ($dryRun, &$rows) {
            foreach (Rider::lockForUpdate()->get() as $rider) {
                $trueOwed = round((float) RiderCheckIn::where('rider_id', $rider->id)
                    ->where('status', RiderCheckIn::STATUS_ENDED)
                    ->whereNull('settled_at')
                    ->sum('daily_earning'), 2);

                $before = (float) $rider->wallet_balance;

                if (abs(round($before - $trueOwed, 2)) <= 0.01) {
                    continue;
                }

                $rows[] = [
                    $rider->id,
                    number_format($before, 2),
                    number_format($trueOwed, 2),
                    number_format($trueOwed - $before, 2),
                ];

                if (! $dryRun) {
                    $rider->update(['wallet_balance' => $trueOwed]);
                }
            }
        });

        if (empty($rows)) {
            $this->info('Every rider already matches their true unsettled earnings — nothing to do.');
            return Command::SUCCESS;
        }

        $this->table(['Rider ID', 'Wallet Before', 'True Owed', 'Adjustment'], $rows);

        if ($dryRun) {
            $this->warn('Dry run — no changes made.');
        } else {
            $this->info(count($rows) . ' rider(s) reconciled.');
        }

        return Command::SUCCESS;
    }
}
