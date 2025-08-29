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
        Schema::create('riders', function (Blueprint $table) {
            $table->id();
             $table->unsignedBigInteger('user_id')->index()->onDelete('cascade');
            $table->string('national_id')->index()->unique();
            $table->string('national_id_front_photo');
            $table->string('national_id_back_photo');
            $table->string('passport_photo');
            $table->string('good_conduct_certificate');
            $table->string('motorbike_license');
            $table->string('motorbike_registration');
            $table->string('mpesa_number');
            $table->string('next_of_kin_name');
            $table->string('next_of_kin_phone');
            $table->text('signed_agreement');
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->decimal('daily_rate', 8, 2)->default(70.00);
            $table->decimal('wallet_balance', 10, 2)->default(0.00);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('riders');
    }
};
