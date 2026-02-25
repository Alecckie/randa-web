<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
        'latitude' => 'float',
        'longitude' => 'float',
        'accuracy' => 'float',
        'altitude' => 'float',
        'speed' => 'float',
        'heading' => 'float',
        'recorded_at' => 'datetime',
        'metadata' => 'array',
    ];

    // ✅ FIX: Add is_recent to appends so it's always included
    protected $appends = ['is_recent'];

    // ✅ FIX: Define is_recent accessor
    /**
     * Determine if this GPS point was recorded recently (within 5 minutes)
     * 
     * @return bool
     */
    public function getIsRecentAttribute(): bool
    {
        if (!$this->recorded_at) {
            return false;
        }
        
        return $this->recorded_at->isAfter(now()->subMinutes(5));
    }

    // Relationships
    public function rider(): BelongsTo
    {
        return $this->belongsTo(Rider::class);
    }

    public function checkIn(): BelongsTo
    {
        return $this->belongsTo(RiderCheckIn::class, 'check_in_id');
    }

    public function campaignAssignment(): BelongsTo
    {
        return $this->belongsTo(CampaignAssignment::class);
    }
}