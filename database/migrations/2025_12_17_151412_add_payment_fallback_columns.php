<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Adds columns for better payment tracking and fallback mechanisms
     */
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            // M-Pesa specific fields (extracted from JSON for easier querying)
            $table->string('mpesa_receipt_number')->nullable()->unique()->after('gateway_transaction_id');
            $table->string('phone_number', 15)->nullable()->index()->after('mpesa_receipt_number');
            
            // Payment verification fields
            $table->enum('verification_method', [
                'auto_callback',      // Standard STK Push callback
                'manual_receipt',     // User entered receipt manually
                'query_api',          // Retrieved via M-Pesa Query API
                'admin_approval',     // Admin manually verified
                'paybill_manual'      // User paid via paybill manually
            ])->nullable()->after('payment_gateway');
            
            $table->boolean('requires_admin_approval')->default(false)->index()->after('verification_method');
            $table->timestamp('admin_approved_at')->nullable()->after('requires_admin_approval');
            $table->unsignedBigInteger('admin_approved_by')->nullable()->after('admin_approved_at');
            
            // Payment attempt tracking
            $table->integer('stk_push_attempts')->default(0)->after('admin_approved_by');
            $table->timestamp('last_stk_push_at')->nullable()->after('stk_push_attempts');
            $table->timestamp('last_query_at')->nullable()->after('last_stk_push_at');
            
            // Paybill payment details
            $table->string('paybill_account_number')->nullable()->after('phone_number');
            $table->text('paybill_instructions_sent')->nullable()->after('paybill_account_number');
            
            // Add indexes for performance
            $table->index(['status', 'requires_admin_approval']);
            $table->index(['verification_method', 'status']);
            $table->index('created_at');
            
        });

        Schema::table('campaigns', function (Blueprint $table) {
            // Link to payment for easier tracking
            $table->unsignedBigInteger('payment_id')->nullable()->after('advertiser_id');
            
            // Payment verification status
            $table->enum('payment_verification_status', [
                'not_initiated',
                'pending',
                'verified',
                'failed',
                'awaiting_admin'
            ])->default('not_initiated')->after('status');
            
            $table->index('payment_verification_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('campaigns', function (Blueprint $table) {
            $table->dropColumn(['payment_id', 'payment_verification_status']);
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn([
                'mpesa_receipt_number',
                'phone_number',
                'verification_method',
                'requires_admin_approval',
                'admin_approved_at',
                'admin_approved_by',
                'stk_push_attempts',
                'last_stk_push_at',
                'last_query_at',
                'paybill_account_number',
                'paybill_instructions_sent'
            ]);
        });
    }
};