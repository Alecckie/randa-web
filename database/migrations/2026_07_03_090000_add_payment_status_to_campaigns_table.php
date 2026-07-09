<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Introduces `payment_status` as its own persisted, first-class column —
     * previously "paid" was conflated into the campaign lifecycle status
     * (`pending_payment`/`paid`), which is what let a campaign be manually
     * marked paid without a real completed payment. Backfilled from the
     * actual payment records, not from the old (sometimes-wrong) status.
     */
    public function up(): void
    {
        Schema::table('campaigns', function (Blueprint $table) {
            $table->enum('payment_status', [
                'unpaid',
                'pending_verification',
                'rejected',
                'partially_paid',
                'paid',
            ])->default('unpaid')->after('status')->index();
        });

        $campaigns = DB::table('campaigns')->select('id')->get();

        foreach ($campaigns as $campaign) {
            $cost = DB::table('campaign_costs')
                ->where('campaign_id', $campaign->id)
                ->where('status', 'confirmed')
                ->orderByDesc('version')
                ->orderByDesc('created_at')
                ->first();

            $totalCost = $cost->total_cost ?? 0;

            $totalPaid = (float) DB::table('payments')
                ->where('campaign_id', $campaign->id)
                ->where('status', 'completed')
                ->sum('amount');

            $hasPendingVerification = DB::table('payments')
                ->where('campaign_id', $campaign->id)
                ->where('status', 'pending_verification')
                ->exists();

            $latestPayment = DB::table('payments')
                ->where('campaign_id', $campaign->id)
                ->orderByDesc('created_at')
                ->first();

            $wasRejected = $latestPayment
                && $latestPayment->status === 'failed'
                && str_starts_with((string) $latestPayment->status_message, 'Rejected:');

            $paymentStatus = match (true) {
                $totalCost > 0 && $totalPaid >= $totalCost => 'paid',
                $totalPaid > 0 => 'partially_paid',
                $hasPendingVerification => 'pending_verification',
                $wasRejected => 'rejected',
                default => 'unpaid',
            };

            DB::table('campaigns')->where('id', $campaign->id)->update([
                'payment_status' => $paymentStatus,
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('campaigns', function (Blueprint $table) {
            $table->dropColumn('payment_status');
        });
    }
};
