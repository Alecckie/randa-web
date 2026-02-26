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
        Schema::create('selfie_submissions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('selfie_prompt_id');
            $table->unsignedBigInteger('rider_id');
            $table->unsignedBigInteger('user_id');
            $table->string('selfie_image');
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->dateTime('submitted_at');
            $table->enum('status', ['pending_review', 'approved', 'rejected'])->default('pending_review');
            $table->text('review_notes')->nullable();
            $table->index(['rider_id', 'status']);
            $table->index('selfie_prompt_id');
            $table->softDeletes();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('selfie_submissions');
    }
};
