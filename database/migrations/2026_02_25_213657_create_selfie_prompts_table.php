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
        Schema::create('selfie_prompts', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('rider_id');
            $table->unsignedBigInteger('user_id');
            $table->dateTime('prompt_sent_at');
            $table->dateTime('responded_at')->nullable();
            $table->enum('status', ['pending', 'accepted', 'completed', 'expired', 'declined'])
                ->default('pending');
            $table->string('device_token')->nullable();
            $table->index(['rider_id', 'status']);
            $table->index(['user_id', 'status']);
            $table->index('prompt_sent_at');
            $table->softDeletes();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('selfie_prompts');
    }
};
