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
        Schema::create('rider_gps_points', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('rider_id');
            $table->unsignedBigInteger('check_in_id');
            $table->unsignedBigInteger('campaign_assignment_id')->nullable();

            // GPS Coordinates
            $table->decimal('latitude', 10, 8);
            $table->decimal('longitude', 11, 8);
            $table->decimal('accuracy', 8, 2)->nullable()->comment('Accuracy in meters');
            $table->decimal('altitude', 8, 2)->nullable()->comment('Altitude in meters');
            $table->decimal('speed', 8, 2)->nullable()->comment('Speed in km/h');
            $table->decimal('heading', 8, 2)->nullable()->comment('Direction in degrees (0-360)');

            // Recording Info
            $table->timestamp('recorded_at')->index();
            $table->string('source', 20)->default('mobile')->comment('mobile, web, api');

            // Additional Data
            $table->json('metadata')->nullable()->comment('Battery, network, app version, etc');

            $table->timestamps();

            $table->index(['rider_id', 'recorded_at']);
            $table->index(['check_in_id']);
            $table->index(['campaign_assignment_id', 'recorded_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('rider_gps_points');
    }
};
