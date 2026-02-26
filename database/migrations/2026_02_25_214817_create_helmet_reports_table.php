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
        Schema::create('helmet_reports', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('rider_id');
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('helmet_id')->nullable();
            $table->string('helmet_image');                 
            $table->text('status_description');
            $table->enum('priority_level', ['low', 'medium', 'high']);
            $table->enum('report_status', ['open', 'in_progress', 'resolved', 'dismissed'])->default('open');
            $table->text('resolution_notes')->nullable();
            $table->unsignedBigInteger('resolved_by')->nullable();
            $table->dateTime('resolved_at')->nullable();
            $table->index(['rider_id', 'report_status']);
            $table->index(['priority_level', 'report_status']);
            $table->index('helmet_id');
            $table->softDeletes();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('helmet_reports');
    }
};
