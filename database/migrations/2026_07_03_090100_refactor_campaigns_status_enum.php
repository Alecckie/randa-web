<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * `campaigns.status` used to conflate payment state into the campaign
     * lifecycle (`pending_payment`, `paid`). Payment state now lives
     * entirely in `payment_status` (see prior migration). This narrows
     * `status` down to pure operational lifecycle values:
     * draft -> submitted -> active -> paused/completed/cancelled.
     *
     * A campaign may only reach `active` when `payment_status` is `paid`
     * (enforced in application code, not the DB).
     */
    public function up(): void
    {
        // Step 1: widen the enum so it accepts both old and new values
        // while we rewrite the data.
        DB::statement("ALTER TABLE `campaigns` MODIFY COLUMN `status` ENUM(
            'draft', 'pending_payment', 'paid', 'submitted', 'active', 'paused', 'completed', 'cancelled'
        ) NOT NULL DEFAULT 'draft'");

        DB::table('campaigns')->where('status', 'pending_payment')->update(['status' => 'submitted']);
        DB::table('campaigns')->where('status', 'paid')->update(['status' => 'submitted']);

        // Step 2: narrow to the final value set.
        DB::statement("ALTER TABLE `campaigns` MODIFY COLUMN `status` ENUM(
            'draft', 'submitted', 'active', 'paused', 'completed', 'cancelled'
        ) NOT NULL DEFAULT 'draft'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE `campaigns` MODIFY COLUMN `status` ENUM(
            'draft', 'pending_payment', 'paid', 'submitted', 'active', 'paused', 'completed', 'cancelled'
        ) NOT NULL DEFAULT 'draft'");

        // Best-effort reverse mapping: a submitted campaign that's paid goes
        // back to 'paid', otherwise back to 'pending_payment'.
        DB::table('campaigns')
            ->where('status', 'submitted')
            ->where('payment_status', 'paid')
            ->update(['status' => 'paid']);

        DB::table('campaigns')
            ->where('status', 'submitted')
            ->update(['status' => 'pending_payment']);

        DB::statement("ALTER TABLE `campaigns` MODIFY COLUMN `status` ENUM(
            'draft', 'pending_payment', 'paid', 'active', 'paused', 'completed', 'cancelled'
        ) NOT NULL DEFAULT 'draft'");
    }
};
