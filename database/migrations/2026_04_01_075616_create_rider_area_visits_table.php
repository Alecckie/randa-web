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
        Schema::create('rider_area_visits', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('rider_id');
            $table->unsignedBigInteger('campaign_id');
            $table->unsignedBigInteger('campaign_assignment_id');
            $table->unsignedBigInteger('check_in_id');
            $table->unsignedBigInteger('coverage_area_id');
            // Visit timing
            $table->timestamp('entered_at');
            $table->timestamp('exited_at')->nullable()
                ->comment('Null = rider was still inside at check-out');
            // Duration in seconds — null if visit incomplete
            $table->unsignedInteger('duration_seconds')->nullable();
            // GPS points recorded while inside the area
            $table->unsignedInteger('gps_points_inside')->default(0);
            // Entry / exit coordinates for map display
            $table->decimal('entry_latitude',  10, 8)->nullable();
            $table->decimal('entry_longitude', 11, 8)->nullable();
            $table->decimal('exit_latitude',   10, 8)->nullable();
            $table->decimal('exit_longitude',  11, 8)->nullable();
            // Visit date — denormalised for fast date-range queries
            $table->date('visit_date')->index();
            $table->timestamps();
            // ── Indexes ──────────────────────────────────────────────────
            // Most queries filter by campaign + area, or rider + area
            $table->index(
                ['campaign_id', 'coverage_area_id', 'visit_date'],
                'idx_campaign_area_date'
            );
            $table->index(
                ['rider_id', 'coverage_area_id', 'visit_date'],
                'idx_rider_area_date'
            );
            $table->index(
                ['check_in_id'],
                'idx_check_in'
            );
            // Prevent double-processing: a rider can't start two visits
            // to the same area on the same check-in simultaneously
            $table->index(
                ['check_in_id', 'coverage_area_id', 'entered_at'],
                'idx_checkin_area_entry'
            );
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('rider_area_visits');
    }
};
