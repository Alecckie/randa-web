<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Modify the riders table to add 'incomplete' status
        DB::statement("ALTER TABLE riders MODIFY COLUMN status ENUM('incomplete', 'pending', 'approved', 'rejected') DEFAULT 'incomplete'");

        Schema::table('riders', function (Blueprint $table) {
            $table->string('national_id')->nullable()->change();
            $table->string('national_id_front_photo')->nullable()->change();
            $table->string('national_id_back_photo')->nullable()->change();
            $table->string('passport_photo')->nullable()->change();
            $table->string('good_conduct_certificate')->nullable()->change();
            $table->string('motorbike_license')->nullable()->change();
            $table->string('motorbike_registration')->nullable()->change();
            $table->string('mpesa_number')->nullable()->change();
            $table->string('next_of_kin_name')->nullable()->change();
            $table->string('next_of_kin_phone')->nullable()->change();
            $table->text('signed_agreement')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE riders MODIFY COLUMN status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending'");

        Schema::table('riders', function (Blueprint $table) {
            $table->string('national_id')->nullable(false)->change();
            $table->string('national_id_front_photo')->nullable(false)->change();
            $table->string('national_id_back_photo')->nullable(false)->change();
            $table->string('passport_photo')->nullable(false)->change();
            $table->string('good_conduct_certificate')->nullable(false)->change();
            $table->string('motorbike_license')->nullable(false)->change();
            $table->string('motorbike_registration')->nullable(false)->change();
            $table->string('mpesa_number')->nullable(false)->change();
            $table->string('next_of_kin_name')->nullable(false)->change();
            $table->string('next_of_kin_phone')->nullable(false)->change();
            $table->text('signed_agreement')->nullable(false)->change();
        });
    }
};
