<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('rider_routes', function (Blueprint $table) {
            $table->dropColumn([
                'status',
                'tracking_status',
                'coverage_areas',
                'last_paused_at',
                'last_resumed_at',
                'pause_history'
            ]);

            // Add pause count
            $table->integer('pause_count')->default(0)
                ->comment('Number of pause events')
                ->after('total_pause_duration');
        });

        DB::statement("ALTER TABLE rider_routes 
            MODIFY COLUMN total_pause_duration INT DEFAULT 0 
            COMMENT 'Total pause time in minutes (calculated from pause_events)'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rider_routes', function (Blueprint $table) {
            $table->string('status')->default('active');
            $table->string('tracking_status')->default('active');
            $table->json('coverage_areas')->nullable();
            $table->timestamp('last_paused_at')->nullable();
            $table->timestamp('last_resumed_at')->nullable();
            $table->json('pause_history')->nullable();
            $table->dropColumn('pause_count');
        });
    }
};
