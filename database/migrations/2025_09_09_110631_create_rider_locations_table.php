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
        Schema::create('rider_locations', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('rider_id')->index();
            $table->unsignedBigInteger('county_id')->index();
            $table->unsignedBigInteger('sub_county_id')->index();
            $table->unsignedBigInteger('ward_id')->index();
            $table->string('stage_name'); 
            $table->decimal('latitude', 10, 8)->nullable();
            $table->decimal('longitude', 11, 8)->nullable(); 
            $table->boolean('is_current')->default(false);
            $table->date('effective_from'); 
            $table->date('effective_to')->nullable();
            $table->enum('status', ['active', 'inactive', 'suspended'])->default('active');
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('rider_locations');
    }
};
