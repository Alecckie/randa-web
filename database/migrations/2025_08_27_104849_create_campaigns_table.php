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
        Schema::create('campaigns', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('advertiser_id')->index();
            $table->string('name')->index();
            $table->text('description')->nullable();
            $table->date('start_date')->index();
            $table->date('end_date')->index();
            $table->integer('helmet_count')->index();
            $table->boolean('need_design')->default(false)->index();
            $table->string('design_file')->nullable();
            $table->text('design_requirements')->nullable();
            $table->string('business_type')->nullable()->index();
            $table->boolean('require_vat_receipt')->default(false)->index();
            $table->boolean('agree_to_terms')->default(false);
            $table->enum('status', ['draft', 'pending_payment', 'paid', 'active', 'paused', 'completed', 'cancelled'])
                ->default('draft')->index();
            $table->text('special_instructions')->nullable();
            $table->timestamps();

            $table->index(['advertiser_id', 'status']);
            $table->index(['status', 'start_date', 'end_date']);
            $table->index(['start_date', 'end_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('campaigns');
    }
};
