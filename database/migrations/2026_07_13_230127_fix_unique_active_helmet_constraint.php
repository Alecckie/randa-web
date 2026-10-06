<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The old unique(['helmet_id', 'status']) index blocks a helmet from ever
     * having more than one 'completed' (or 'cancelled') assignment, breaking
     * reuse once any helmet is revoked/reassigned a second time. Replace it
     * with a unique index on a generated column that only carries a value
     * when status = 'active', so MySQL's "unique allows multiple NULLs"
     * behavior preserves the real invariant: one active assignment per helmet.
     */
    public function up(): void
    {
        Schema::table('campaign_assignments', function (Blueprint $table) {
            $table->dropUnique('unique_active_helmet');
        });

        Schema::table('campaign_assignments', function (Blueprint $table) {
            $table->unsignedBigInteger('active_helmet_id')
                ->nullable()
                ->storedAs("IF(status = 'active', helmet_id, NULL)")
                ->after('helmet_id');
        });

        Schema::table('campaign_assignments', function (Blueprint $table) {
            $table->unique('active_helmet_id', 'unique_active_helmet');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('campaign_assignments', function (Blueprint $table) {
            $table->dropUnique('unique_active_helmet');
            $table->dropColumn('active_helmet_id');
        });

        Schema::table('campaign_assignments', function (Blueprint $table) {
            $table->unique(['helmet_id', 'status'], 'unique_active_helmet');
        });
    }
};
