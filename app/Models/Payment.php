<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    use HasFactory;

    protected $fillable = [
        'campaign_id',
        'advertiser_id',
        'payment_reference',
        'amount',
        'currency',
        'payment_method',
        'payment_gateway',
        'verification_method',
        'gateway_reference',
        'gateway_transaction_id',
        'mpesa_receipt_number',
        'phone_number',
        'paybill_account_number',
        'paybill_instructions_sent',
        'status',
        'status_message',
        'requires_admin_approval',
        'admin_approved_at',
        'admin_approved_by',
        'stk_push_attempts',
        'last_stk_push_at',
        'last_query_at',
        'initiated_at',
        'processed_at',
        'completed_at',
        'failed_at',
        'payment_details',
        'metadata',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'payment_details' => 'array',
        'metadata' => 'array',
        'requires_admin_approval' => 'boolean',
        'initiated_at' => 'datetime',
        'processed_at' => 'datetime',
        'completed_at' => 'datetime',
        'failed_at' => 'datetime',
        'admin_approved_at' => 'datetime',
        'last_stk_push_at' => 'datetime',
        'last_query_at' => 'datetime',
    ];

    protected $appends = [
        'is_awaiting_approval',
        'can_retry_stk',
        'can_query_status'
    ];

    /**
     * Relationships
     */
    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class);
    }

    public function advertiser(): BelongsTo
    {
        return $this->belongsTo(Advertiser::class);
    }

    public function adminApprover(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_approved_by');
    }

    /**
     * Scopes
     */
    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    public function scopePending($query)
    {
        return $query->whereIn('status', ['pending', 'processing']);
    }

    public function scopeFailed($query)
    {
        return $query->where('status', 'failed');
    }

    public function scopeAwaitingApproval($query)
    {
        return $query->where('requires_admin_approval', true)
                    ->where('status', 'pending_verification');
    }

    public function scopeByVerificationMethod($query, string $method)
    {
        return $query->where('verification_method', $method);
    }

    /**
     * Status Check Methods
     */
    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }

    public function isPending(): bool
    {
        return in_array($this->status, ['pending', 'processing']);
    }

    public function isFailed(): bool
    {
        return $this->status === 'failed';
    }

    public function isAwaitingApproval(): bool
    {
        return $this->requires_admin_approval && 
               $this->status === 'pending_verification' && 
               !$this->admin_approved_at;
    }

    public function isApproved(): bool
    {
        return $this->admin_approved_at !== null;
    }

    /**
     * Accessors
     */
    public function getIsAwaitingApprovalAttribute(): bool
    {
        return $this->isAwaitingApproval();
    }

    public function getCanRetryStkAttribute(): bool
    {
        // Allow retry if failed and less than 3 attempts
        return $this->status === 'failed' && 
               $this->stk_push_attempts < 3 &&
               (!$this->last_stk_push_at || $this->last_stk_push_at->diffInMinutes(now()) > 2);
    }

    public function getCanQueryStatusAttribute(): bool
    {
        // Can query if pending and no recent query (within 30 seconds)
        return $this->isPending() &&
               (!$this->last_query_at || $this->last_query_at->diffInSeconds(now()) > 30);
    }

    /**
     * Get M-Pesa receipt number from various sources
     */
    public function getMpesaReceipt(): ?string
    {
        // Priority 1: Direct column
        if ($this->mpesa_receipt_number) {
            return $this->mpesa_receipt_number;
        }

        // Priority 2: From payment_details JSON
        if (!empty($this->payment_details['mpesa_receipt'])) {
            return $this->payment_details['mpesa_receipt'];
        }

        // Priority 3: Extract from callback metadata
        $callbackMetadata = $this->payment_details['callback']['Body']['stkCallback']['CallbackMetadata']['Item'] ?? [];
        
        foreach ($callbackMetadata as $item) {
            if (isset($item['Name']) && $item['Name'] === 'MpesaReceiptNumber') {
                return $item['Value'] ?? null;
            }
        }

        return null;
    }

    /**
     * Update M-Pesa receipt in both column and JSON
     */
    public function setMpesaReceipt(string $receiptNumber): void
    {
        $this->mpesa_receipt_number = $receiptNumber;
        
        // Also update in payment_details for backward compatibility
        $details = $this->payment_details ?? [];
        $details['mpesa_receipt'] = $receiptNumber;
        $this->payment_details = $details;
        
        $this->save();
    }

    /**
     * Mark as requiring admin approval
     */
    public function markRequiresApproval(string $reason = null): void
    {
        $this->update([
            'requires_admin_approval' => true,
            'status' => 'pending_verification',
            'verification_method' => 'admin_approval',
            'status_message' => $reason ?? 'Payment requires admin verification'
        ]);
    }

    /**
     * Approve payment by admin
     */
    public function approveByAdmin(int $adminUserId, string $note = null): bool
    {
        $updated = $this->update([
            'status' => 'completed',
            'completed_at' => now(),
            'admin_approved_at' => now(),
            'admin_approved_by' => $adminUserId,
            'status_message' => $note ?? 'Approved by admin',
            'requires_admin_approval' => false,
        ]);

        if ($updated && $this->campaign) {
            $this->campaign->update([
                'status' => 'paid',
                'payment_verification_status' => 'verified'
            ]);
        }

        return $updated;
    }

    /**
     * Reject payment by admin
     */
    public function rejectByAdmin(int $adminUserId, string $reason): bool
    {
        return $this->update([
            'status' => 'failed',
            'failed_at' => now(),
            'admin_approved_by' => $adminUserId,
            'status_message' => 'Rejected: ' . $reason,
            'requires_admin_approval' => false,
        ]);
    }

    /**
     * Increment STK push attempts
     */
    public function incrementStkAttempts(): void
    {
        $this->increment('stk_push_attempts');
        $this->update(['last_stk_push_at' => now()]);
    }

    /**
     * Record query attempt
     */
    public function recordQueryAttempt(): void
    {
        $this->update(['last_query_at' => now()]);
    }

    /**
     * Generate user-friendly payment reference using phone number
     */
    public static function generatePaymentReference(string $phoneNumber): string
    {
        // Use last 9 digits of phone number + timestamp suffix
        $phoneSuffix = substr($phoneNumber, -9);
        $timeSuffix = substr(time(), -4); // Last 4 digits of timestamp
        
        return 'CPG' . $phoneSuffix . $timeSuffix;
    }

    /**
     * Get paybill payment details
     */
    public function getPaybillDetails(): array
    {
        return [
            'paybill_number' => config('mpesa.business_short_code'),
            'account_number' => $this->phone_number,
            'amount' => $this->amount,
            'reference' => $this->payment_reference,
        ];
    }
}