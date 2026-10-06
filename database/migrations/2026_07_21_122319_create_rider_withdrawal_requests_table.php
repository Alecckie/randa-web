<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Rider-initiated cash-out requests: rider taps "Withdraw", admin pays
     * them manually (M-Pesa etc.) outside the system, then marks the
     * request settled — mirrors the existing admin settle-dues bookkeeping
     * (RiderPayoutService::settle()) but adds a rider-visible request/audit
     * trail instead of admin unilaterally settling with no rider action.
     */
    public function up(): void
    {
        Schema::create('rider_withdrawal_requests', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('rider_id');
            // Snapshot of the rider's owed total at request time — the
            // actual amount_settled can differ slightly if more shifts
            // ended between the request and the admin acting on it, since
            // settling always pays out the CURRENT full unsettled balance.
            $table->decimal('amount_requested', 10, 2);
            $table->decimal('amount_settled', 10, 2)->nullable();
            $table->enum('status', ['pending', 'settled', 'rejected'])->default('pending');
            $table->unsignedBigInteger('reviewed_by')->nullable();
            $table->dateTime('reviewed_at')->nullable();
            $table->string('rejection_reason', 500)->nullable();
            $table->index(['rider_id', 'status']);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('rider_withdrawal_requests');
    }
};
