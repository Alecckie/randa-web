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
        Schema::create('rider_check_ins', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('rider_id')->index();
            $table->unsignedBigInteger('campaign_assignment_id')->index();
            $table->date('check_in_date');
            $table->timestamp('check_in_time');
            $table->timestamp('check_out_time')->nullable();
            $table->decimal('daily_earning', 8, 2)->default(70.00);
            $table->enum('status', ['active', 'completed'])->default('active');
            $table->unique(['rider_id', 'check_in_date']);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('rider_check_ins');
    }
};
