<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RiderPauseEvent extends Model
{
    protected $fillable = [
        'rider_id',
        'check_in_id',
        'route_id',
        'paused_at',
        'resumed_at',
        'duration_minutes',
        'pause_latitude',
        'pause_longitude',
        'reason',
        'metadata',
    ];
    
    protected $casts = [
        'paused_at' => 'datetime',
        'resumed_at' => 'datetime',
        'pause_latitude' => 'decimal:8',
        'pause_longitude' => 'decimal:8',
        'metadata' => 'array',
    ];
    
    // Relationships
    public function rider(): BelongsTo
    {
        return $this->belongsTo(Rider::class);
    }
    
    public function checkIn(): BelongsTo
    {
        return $this->belongsTo(RiderCheckIn::class, 'check_in_id');
    }
    
    public function route(): BelongsTo
    {
        return $this->belongsTo(RiderRoute::class);
    }
    
    // Scopes
    public function scopeActive($query)
    {
        return $query->whereNull('resumed_at');
    }
    
    public function scopeCompleted($query)
    {
        return $query->whereNotNull('resumed_at');
    }
    
    public function scopeToday($query)
    {
        return $query->whereDate('paused_at', today());
    }
    
    // Helpers
    public function isActive(): bool
    {
        return $this->resumed_at === null;
    }
    
    public function calculateDuration(): int
    {
        if ($this->resumed_at) {
            return $this->paused_at->diffInMinutes($this->resumed_at);
        }
        
        // If still paused, calculate from now
        return $this->paused_at->diffInMinutes(now());
    }
    
    public function getFormattedDurationAttribute(): string
    {
        if (!$this->duration_minutes) {
            return 'Ongoing';
        }
        
        $hours = floor($this->duration_minutes / 60);
        $minutes = $this->duration_minutes % 60;
        
        if ($hours > 0) {
            return "{$hours}h {$minutes}m";
        }
        
        return "{$minutes}m";
    }
}