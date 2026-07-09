<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Same root cause as the check_in_time fix on rider_check_ins
 * (2026_07_05_194415_fix_rider_check_ins_check_in_time_auto_update.php):
 * paused_at is the first TIMESTAMP column in rider_pause_events, so MySQL
 * silently attached DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
 * to it. Every update to a pause row (resuming it, or closing an open pause
 * at checkout) reset paused_at to the current moment — production earnings
 * weren't affected (duration_minutes is computed from the correct in-memory
 * value before the corrupting update runs), but any direct read of
 * paused_at on an already-resumed pause shows the wrong pause-start time.
 * Giving it an explicit default suppresses MySQL's implicit auto-update.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement(
            'ALTER TABLE rider_pause_events MODIFY paused_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP'
        );
    }

    public function down(): void
    {
        DB::statement(
            'ALTER TABLE rider_pause_events MODIFY paused_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
        );
    }
};
