<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class SelfiePrompt extends Model
{
    use HasFactory;

    protected $fillable = [
        'rider_id',
        'user_id',
        'prompt_sent_at',
        'responded_at',
        'status',
        'device_token',
    ];

    protected $casts = [
        'prompt_sent_at'      => 'datetime',
        'responded_at'        => 'datetime',
    ];

    // ─── Relationships ────────────────────────────────────────────────────────

    public function rider(): BelongsTo
    {
        return $this->belongsTo(Rider::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function submission(): HasOne
    {
        return $this->hasOne(SelfieSubmission::class);
    }

    // ─── Scopes ───────────────────────────────────────────────────────────────

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    public function scopeExpired($query)
    {
        return $query->where('status', 'expired');
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    public function isAccepted(): bool
    {
        return $this->status === 'accepted';
    }

    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }

    public function isExpired(): bool
    {
        return $this->status === 'expired';
    }
}