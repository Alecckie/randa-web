<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class RiderRoute extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'rider_id',
        'check_in_id',
        'campaign_assignment_id',
        'route_date',
        'status',
        'tracking_status',
        'started_at',
        'ended_at',
        'last_paused_at',
        'last_resumed_at',
        'total_pause_duration',
        'total_distance',
        'total_duration',
        'location_points_count',
        'avg_speed',
        'max_speed',
        'coverage_areas',
        'route_polyline',
        'pause_history',
        'statistics',
        'metadata',
    ];

    protected $casts = [
        'route_date' => 'date',
        'started_at' => 'datetime',
        'ended_at' => 'datetime',
        'last_paused_at' => 'datetime',
        'last_resumed_at' => 'datetime',
        'total_pause_duration' => 'integer',
        'total_distance' => 'decimal:2',
        'total_duration' => 'integer',
        'location_points_count' => 'integer',
        'avg_speed' => 'decimal:2',
        'max_speed' => 'decimal:2',
        'coverage_areas' => 'array',
        'pause_history' => 'array',
        'statistics' => 'array',
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
     * GPS points for this route
     * CORRECTED: Uses RiderGpsPoint, not RiderLocation
     */
    public function gpsPoints(): HasMany
    {
        return $this->hasMany(RiderGpsPoint::class, 'check_in_id', 'check_in_id')
            ->whereDate('recorded_at', $this->route_date)
            ->orderBy('recorded_at');
    }

    /**
     * Alias for gpsPoints (for backward compatibility)
     * This is what your tracking service calls
     */
    public function locations(): HasMany
    {
        return $this->gpsPoints();
    }

    /**
     * Get formatted distance
     */
    public function getFormattedDistanceAttribute(): string
    {
        return number_format($this->total_distance, 2) . ' km';
    }

    /**
     * Get formatted duration
     */
    public function getFormattedDurationAttribute(): string
    {
        $hours = floor($this->total_duration / 60);
        $minutes = $this->total_duration % 60;
        
        if ($hours > 0) {
            return "{$hours}h {$minutes}m";
        }
        
        return "{$minutes}m";
    }

    /**
     * Get actual working duration (excluding pauses)
     */
    public function getActualWorkingDurationAttribute(): int
    {
        return max(0, $this->total_duration - $this->total_pause_duration);
    }

    /**
     * Check if currently tracking
     */
    public function getIsTrackingAttribute(): bool
    {
        return $this->tracking_status === 'active';
    }

    /**
     * Check if currently paused
     */
    public function getIsPausedAttribute(): bool
    {
        return $this->tracking_status === 'paused';
    }

    /**
     * Scope to get active routes
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Scope to get today's routes
     */
    public function scopeToday($query)
    {
        return $query->whereDate('route_date', today());
    }
}