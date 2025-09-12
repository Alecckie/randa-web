<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('campaign_id')->index();
            $table->unsignedBigInteger('advertiser_id')->index();
            
            $table->string('payment_reference')->unique();
            $table->decimal('amount', 12, 2);
            $table->string('currency', 3)->default('KES');
            
            $table->enum('payment_method', ['mpesa', 'bank_transfer', 'card', 'cash', 'cheque']);
            $table->string('payment_gateway')->nullable(); 
            $table->string('gateway_reference')->nullable();
            $table->string('gateway_transaction_id')->nullable();
            
            $table->enum('status', ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded']);
            $table->text('status_message')->nullable();
            
            $table->timestamp('initiated_at');
            $table->timestamp('processed_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('failed_at')->nullable();
            
            $table->json('payment_details')->nullable();
            $table->json('metadata')->nullable();
            
            $table->timestamps();
            
        
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};