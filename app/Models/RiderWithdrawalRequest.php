<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RiderWithdrawalRequest extends Model
{
    use HasFactory;

    const STATUS_PENDING = 'pending';
    const STATUS_SETTLED = 'settled';
    const STATUS_REJECTED = 'rejected';

    protected $fillable = [
        'rider_id',
        'amount_requested',
        'amount_settled',
        'mpesa_confirmation_code',
        'status',
        'reviewed_by',
        'reviewed_at',
        'rejection_reason',
    ];

    protected $casts = [
        'amount_requested' => 'decimal:2',
        'amount_settled' => 'decimal:2',
        'reviewed_at' => 'datetime',
    ];

    public function rider()
    {
        return $this->belongsTo(Rider::class);
    }

    public function reviewedBy()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function scopePending($query)
    {
        return $query->where('status', self::STATUS_PENDING);
    }
}
