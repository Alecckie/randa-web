<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * "Mark settled" previously wrote amount_settled from a self-computed sum
 * of the rider's unsettled daily_earning rows, with no admin-entered proof
 * of what was actually paid — a typo'd or stale figure would go unnoticed.
 * This adds a place to record the M-Pesa confirmation code the admin
 * enters as evidence of the real payment.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rider_withdrawal_requests', function (Blueprint $table) {
            $table->string('mpesa_confirmation_code')->nullable()->after('amount_settled');
        });
    }

    public function down(): void
    {
        Schema::table('rider_withdrawal_requests', function (Blueprint $table) {
            $table->dropColumn('mpesa_confirmation_code');
        });
    }
};
