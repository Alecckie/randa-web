<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * RiderGpsPoint - Stores actual GPS tracking points
 * 
 * This is different from RiderLocation which stores the rider's permanent operating location
 */
class RiderGpsPoint extends Model
{
    protected $table = 'rider_gps_points';

    protected $fillable = [
        'rider_id',
        'check_in_id',
        'campaign_assignment_id',
        'latitude',
        'longitude',
        'accuracy',
        'altitude',
        'speed',
        'heading',
        'recorded_at',
        'source',
        'metadata',
    ];

    protected $casts = [
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
        'accuracy' => 'decimal:2',
        'altitude' => 'decimal:2',
        'speed' => 'decimal:2',
        'heading' => 'decimal:2',
        'recorded_at' => 'datetime',
        'metadata' => 'array',
    ];

    /**
     * Rider relationship
     */
    public function rider(): BelongsTo
    {
        return $this->belongsTo(Rider::class);
    }

    /**
     * Check-in relationship
     */
    public function checkIn(): BelongsTo
    {
        return $this->belongsTo(RiderCheckIn::class, 'check_in_id');
    }

    /**
     * Campaign assignment relationship
     */
    public function campaignAssignment(): BelongsTo
    {
        return $this->belongsTo(CampaignAssignment::class);
    }

    /**
     * Scope to get recent points
     */
    public function scopeRecent($query, int $minutes = 5)
    {
        return $query->where('recorded_at', '>=', now()->subMinutes($minutes));
    }

    /**
     * Scope to get today's points
     */
    public function scopeToday($query)
    {
        return $query->whereDate('recorded_at', today());
    }

    /**
     * Check if point is recent (within 5 minutes)
     */
    public function getIsRecentAttribute(): bool
    {
        return $this->recorded_at->isAfter(now()->subMinutes(5));
    }

    /**
     * Get time ago human readable
     */
    public function getTimeAgoAttribute(): string
    {
        return $this->recorded_at->diffForHumans();
    }
}