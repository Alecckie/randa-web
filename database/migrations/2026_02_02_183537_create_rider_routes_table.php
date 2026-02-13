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
        Schema::create('rider_routes', function (Blueprint $table) {
            $table->id();
            // Foreign Keys
            $table->unsignedBigInteger('rider_id');
            $table->unsignedBigInteger('check_in_id');
            $table->unsignedBigInteger('campaign_assignment_id')->nullable();
            $table->date('route_date');
            $table->string('status')->default('active'); // active, completed, cancelled
            $table->string('tracking_status')->default('active'); // active, paused, completed
            $table->timestamp('started_at')->nullable();
            $table->timestamp('ended_at')->nullable();
            $table->timestamp('last_paused_at')->nullable();
            $table->timestamp('last_resumed_at')->nullable();
            $table->integer('total_pause_duration')->default(0)->comment('Total pause time in minutes');
            $table->decimal('total_distance', 10, 2)->default(0)->comment('Total distance in kilometers');
            $table->integer('total_duration')->default(0)->comment('Total duration in minutes');
            $table->integer('location_points_count')->default(0)->comment('Number of location points recorded');
            $table->decimal('avg_speed', 8, 2)->nullable()->comment('Average speed in km/h');
            $table->decimal('max_speed', 8, 2)->nullable()->comment('Maximum speed in km/h');
            $table->json('coverage_areas')->nullable()->comment('Array of ward IDs covered');
            $table->text('route_polyline')->nullable()->comment('Encoded polyline for route visualization');
            $table->json('pause_history')->nullable()->comment('Complete pause/resume history');
            $table->json('statistics')->nullable()->comment('Additional route statistics');
            $table->json('metadata')->nullable()->comment('Additional metadata');
            $table->softDeletes();
            $table->index(['rider_id', 'route_date'], 'idx_rider_date');
            $table->index(['route_date', 'status'], 'idx_date_status');
            $table->index(['route_date', 'tracking_status'], 'idx_date_tracking');
            $table->index('check_in_id', 'idx_check_in');
            $table->index('created_at', 'idx_created');
            $table->unique(['rider_id', 'route_date'], 'unique_rider_route_per_day');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('rider_routes');
    }
};
