<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('rider_check_ins', function (Blueprint $table) {
            // Snapshot of the hours/rate actually applied when the shift was
            // finalized, so historical payouts stay stable even if rider
            // daily_rate or the max-hours-per-day rule changes later.
            if (! Schema::hasColumn('rider_check_ins', 'worked_hours')) {
                $table->decimal('worked_hours', 5, 2)->nullable()->after('daily_earning');
            }
            if (! Schema::hasColumn('rider_check_ins', 'payable_hours')) {
                $table->decimal('payable_hours', 5, 2)->nullable()->after('worked_hours');
            }
            if (! Schema::hasColumn('rider_check_ins', 'hourly_rate_applied')) {
                $table->decimal('hourly_rate_applied', 8, 2)->nullable()->after('payable_hours');
            }

            // Admin payout settlement: null until an admin marks this day's
            // earning as paid out.
            if (! Schema::hasColumn('rider_check_ins', 'settled_at')) {
                $table->timestamp('settled_at')->nullable()->after('end_reason');
            }
            if (! Schema::hasColumn('rider_check_ins', 'settled_by')) {
                $table->foreignId('settled_by')->nullable()->after('settled_at')
                    ->constrained('users')->nullOnDelete();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rider_check_ins', function (Blueprint $table) {
            $table->dropConstrainedForeignId('settled_by');
            $table->dropColumn(['worked_hours', 'payable_hours', 'hourly_rate_applied', 'settled_at']);
        });
    }
};
