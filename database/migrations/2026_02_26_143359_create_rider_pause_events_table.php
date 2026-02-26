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
        Schema::create('rider_pause_events', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('rider_id');
            $table->unsignedBigInteger('check_in_id');
            $table->unsignedBigInteger('route_id')->nullable();

            // Event timestamps
            $table->timestamp('paused_at');
            $table->timestamp('resumed_at')->nullable();
            $table->integer('duration_minutes')->nullable()
                ->comment('Calculated when resumed');

            // Location where paused
            $table->decimal('pause_latitude', 10, 8)->nullable();
            $table->decimal('pause_longitude', 11, 8)->nullable();

            // Optional metadata
            $table->enum('reason', ['lunch', 'break', 'emergency', 'other'])
                ->default('break');
            $table->json('metadata')->nullable();
            $table->softDeletes();
            $table->index(['rider_id', 'paused_at'], 'idx_rider_paused');
            $table->index(['check_in_id', 'paused_at'], 'idx_check_in_paused');
            $table->index('route_id', 'idx_route');
            $table->index('resumed_at', 'idx_resumed');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('rider_pause_events');
    }
};
