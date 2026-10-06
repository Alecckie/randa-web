<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Riders must now accept/reject an assignment before it's onboarded.
     * Assignments are created as 'pending' instead of 'active'; a 'rejected'
     * terminal state is added alongside the existing 'completed'/'cancelled'.
     * The active_helmet_id generated column (see
     * 2026_07_13_230127_fix_unique_active_helmet_constraint.php) must also
     * treat 'pending' as occupying the helmet, otherwise two riders could be
     * offered the same helmet while both are awaiting a response.
     */
    public function up(): void
    {
        DB::statement("ALTER TABLE campaign_assignments MODIFY status ENUM('pending', 'active', 'completed', 'cancelled', 'rejected') NOT NULL DEFAULT 'pending'");

        DB::statement("ALTER TABLE campaign_assignments MODIFY active_helmet_id BIGINT UNSIGNED AS (IF(status IN ('active', 'pending'), helmet_id, NULL)) STORED");

        Schema::table('campaign_assignments', function (Blueprint $table) {
            $table->timestamp('responded_at')->nullable()->after('assigned_at');
            $table->string('rejection_reason', 500)->nullable()->after('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('campaign_assignments', function (Blueprint $table) {
            $table->dropColumn(['responded_at', 'rejection_reason']);
        });

        DB::statement("ALTER TABLE campaign_assignments MODIFY active_helmet_id BIGINT UNSIGNED AS (IF(status = 'active', helmet_id, NULL)) STORED");

        DB::statement("ALTER TABLE campaign_assignments MODIFY status ENUM('active', 'completed', 'cancelled') NOT NULL DEFAULT 'active'");
    }
};
