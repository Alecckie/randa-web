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
        Schema::create('helmets', function (Blueprint $table) {
            $table->id();
            $table->string('helmet_code')->unique(); 
            $table->string('qr_code')->nullable()->unique(); 
            $table->enum('status', ['available', 'assigned', 'maintenance', 'retired'])->default('available');
            $table->string('current_branding')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('helmets');
    }
};
