<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transactions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('payment_id')->nullable()->index();
            $table->unsignedBigInteger('campaign_id')->index();
            $table->unsignedBigInteger('advertiser_id')->index();
            
            $table->string('transaction_reference')->unique();
            
            $table->enum('type', ['payment', 'refund', 'adjustment']);
            $table->decimal('amount', 12, 2);
            $table->string('currency', 3)->default('KES');
            $table->enum('status', ['pending', 'completed', 'failed', 'reversed']);
            
            $table->text('description')->nullable();
            $table->json('transaction_data')->nullable();
            $table->string('processed_by')->nullable();
            
            
            $table->timestamp('processed_at')->nullable();
            $table->timestamp('settled_at')->nullable();
            
            $table->timestamps();
            
           
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transactions');
    }
};