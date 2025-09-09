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
        Schema::create('rider_location_change_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('rider_id')->index();
            $table->unsignedBigInteger('old_location_id')->nullable()->index();
            $table->unsignedBigInteger('new_location_id')->index();
            $table->enum('change_type', ['initial', 'transfer', 'reactivation', 'suspension']);
            $table->text('reason')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('changed_at');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('rider_location_change_logs');
    }
};
