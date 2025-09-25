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
        Schema::create('campaign_costs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('campaign_id')->index();

            // Cost breakdown
            $table->integer('helmet_count');
            $table->integer('duration_days');
            $table->decimal('helmet_daily_rate', 8, 2)->default(200.00);
            $table->decimal('base_cost', 12, 2); // helmet_count * duration_days * helmet_daily_rate

            $table->boolean('includes_design')->default(false);
            $table->decimal('design_cost', 8, 2)->default(0.00);

            $table->decimal('subtotal', 12, 2); 
            $table->decimal('vat_rate', 5, 2)->default(16.00); 
            $table->decimal('vat_amount', 12, 2);
            $table->decimal('total_cost', 12, 2);

            $table->enum('status', ['draft', 'confirmed', 'paid', 'refunded'])->default('draft');
            $table->integer('version')->default(1); 
            $table->text('notes')->nullable();

            $table->index(['campaign_id', 'version']);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('campaign_costs');
    }
};
