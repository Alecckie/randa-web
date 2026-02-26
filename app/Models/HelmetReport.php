<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;

class HelmetReport extends Model
{
    use HasFactory,SoftDeletes;

    protected $fillable = [
        'rider_id',
        'user_id',
        'helmet_id',
        'helmet_image',
        'status_description',
        'priority_level',
        'report_status',
        'resolution_notes',
        'resolved_by',
        'resolved_at',
    ];

    protected $casts = [
        'resolved_at' => 'datetime',
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

    public function helmet(): BelongsTo
    {
        return $this->belongsTo(Helmet::class);
    }

    public function resolvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }

    // ─── Accessors ────────────────────────────────────────────────────────────

    public function getHelmetImageUrlAttribute(): ?string
    {
        return $this->helmet_image ? Storage::url($this->helmet_image) : null;
    }

    // ─── Scopes ───────────────────────────────────────────────────────────────

    public function scopeOpen($query)
    {
        return $query->where('report_status', 'open');
    }

    public function scopeHighPriority($query)
    {
        return $query->where('priority_level', 'high');
    }

    public function scopeUnresolved($query)
    {
        return $query->whereIn('report_status', ['open', 'in_progress']);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    public function isOpen(): bool
    {
        return $this->report_status === 'open';
    }

    public function isResolved(): bool
    {
        return $this->report_status === 'resolved';
    }
}