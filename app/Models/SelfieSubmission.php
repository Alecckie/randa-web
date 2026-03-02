<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SelfieSubmission extends Model
{
    use HasFactory;

    protected $fillable = [
        'selfie_prompt_id',
        'rider_id',
        'user_id',
        'helmet_id',
        'qr_code',
        'latitude',
        'longitude',
        'submitted_at',
        'status',
        'review_notes',
    ];

    protected $casts = [
        'latitude'     => 'decimal:7',
        'longitude'    => 'decimal:7',
        'submitted_at' => 'datetime',
    ];

    // ─── Relationships ────────────────────────────────────────────────────────

    public function selfiePrompt(): BelongsTo
    {
        return $this->belongsTo(SelfiePrompt::class);
    }

    public function rider(): BelongsTo
    {
        return $this->belongsTo(Rider::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function helmet(): BelongsTo
    {
        return $this->belongsTo(Helmet::class);
    }

    // ─── Scopes ───────────────────────────────────────────────────────────────

    public function scopePendingReview($query)
    {
        return $query->where('status', 'pending_review');
    }

    public function scopeAccepted($query)
    {
        return $query->where('status', 'accepted');
    }

    public function scopeRejected($query)
    {
        return $query->where('status', 'rejected');
    }
}