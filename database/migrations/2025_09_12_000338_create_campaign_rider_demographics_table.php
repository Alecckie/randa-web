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
        Schema::create('campaign_rider_demographics', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('campaign_id')->index();
            $table->enum('age_group', ['18-25', '26-35', '36-45', '46-55', '55+'])->index();
            $table->enum('gender', ['male', 'female', 'any'])->index();
            $table->enum('rider_type', ['courier', 'boda', 'delivery', 'taxi'])->index();
            // $table->unique(['campaign_id', 'age_group', 'gender', 'rider_type']);
            $table->softDeletes();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('campaign_rider_demographics');
    }
};
