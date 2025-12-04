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
        'gateway_reference',
        'gateway_transaction_id',
        'status',
        'status_message',
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
        'initiated_at' => 'datetime',
        'processed_at' => 'datetime',
        'completed_at' => 'datetime',
        'failed_at' => 'datetime',
    ];

    protected $appends = [
        'mpesa_receipt'
    ];

    
    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class);
    }

    
    public function advertiser(): BelongsTo
    {
        return $this->belongsTo(Advertiser::class);
    }

    
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

   
    public function getMpesaReceiptAttribute(): ?string
{
    // First try to get from the direct field we store
    if (!empty($this->payment_details['mpesa_receipt'])) {
        return $this->payment_details['mpesa_receipt'];
    }
    
    // Fallback: Extract from callback metadata if available
    $callbackMetadata = $this->payment_details['callback']['Body']['stkCallback']['CallbackMetadata']['Item'] ?? [];
    
    foreach ($callbackMetadata as $item) {
        if (isset($item['Name']) && $item['Name'] === 'MpesaReceiptNumber') {
            return $item['Value'] ?? null;
        }
    }
    
    return null;
}
}