<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * check_in_time was declared as a plain `timestamp` column with no explicit
 * default. Because it's the first TIMESTAMP column in the table and this
 * server runs with explicit_defaults_for_timestamp=OFF, MySQL silently
 * attached `DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` to it.
 * That means every UPDATE to a rider_check_ins row (checkout, pause,
 * resume, settlement) was resetting check_in_time to "now", corrupting the
 * shift-start value the earnings calculator depends on. Giving it an
 * explicit default (which the app never relies on — check_in_time is
 * always set explicitly on insert) suppresses MySQL's implicit ON UPDATE
 * behavior.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement(
            'ALTER TABLE rider_check_ins MODIFY check_in_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP'
        );
    }

    public function down(): void
    {
        DB::statement(
            'ALTER TABLE rider_check_ins MODIFY check_in_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
        );
    }
};
