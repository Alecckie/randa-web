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
        Schema::create('campaign_assignments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('campaign_id')->index();
            $table->unsignedBigInteger('rider_id')->index();
            $table->unsignedBigInteger('helmet_id')->index();
            $table->unsignedBigInteger('advertiser_id')->index();
            $table->unsignedBigInteger('zone_id')->index();
            $table->string('tracking_tag')->unique();
            $table->datetime('assigned_at');
            $table->datetime('completed_at')->nullable();
            $table->enum('status', ['active', 'completed', 'cancelled'])->default('active');
            $table->unique(['helmet_id', 'status'], 'unique_active_helmet');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('campaign_assignments');
    }
};
