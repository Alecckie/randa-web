<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Every table in the rider shift/pay pipeline (check-in, pause, route,
 * wallet) was running on MyISAM, which does not support transactions.
 * Every DB::transaction()/beginTransaction() around check-in, pause,
 * resume, checkout, and admin settlement was therefore a silent no-op —
 * a failure mid-sequence (e.g. check-in status flips to 'paused' but the
 * pause event insert fails) could leave inconsistent state with no
 * rollback. Converting to InnoDB makes those transactions real and enables
 * row locking (see RiderPayoutService::settle()) to prevent concurrent
 * double-settlement.
 *
 * Scoped to just these 4 tables — the rest of the application database is
 * also MyISAM, but converting it broadly is a separate infrastructure
 * decision outside the rider-payroll hardening this migration is for.
 */
return new class extends Migration
{
    private array $tables = [
        'rider_check_ins',
        'rider_pause_events',
        'rider_routes',
        'riders',
    ];

    public function up(): void
    {
        foreach ($this->tables as $table) {
            DB::statement("ALTER TABLE `{$table}` ENGINE=InnoDB");
        }
    }

    public function down(): void
    {
        foreach ($this->tables as $table) {
            DB::statement("ALTER TABLE `{$table}` ENGINE=MyISAM");
        }
    }
};
