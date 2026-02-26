<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RiderRoute extends Model
{
    protected $fillable = [
        'rider_id',
        'check_in_id',
        'campaign_assignment_id',
        'route_date',
        'started_at',
        'ended_at',
        'total_distance',
        'total_duration',
        'total_pause_duration',
        'pause_count',
        'location_points_count',
        'avg_speed',
        'max_speed',
        'route_polyline',
        'statistics',
        'metadata',
    ];
    
    protected $casts = [
        'route_date' => 'date',
        'started_at' => 'datetime',
        'ended_at' => 'datetime',
        'total_distance' => 'decimal:2',
        'avg_speed' => 'decimal:2',
        'max_speed' => 'decimal:2',
        'statistics' => 'array',
        'metadata' => 'array',
    ];
    
    // Relationships
    public function rider()
    {
        return $this->belongsTo(Rider::class);
    }
    
    public function checkIn()
    {
        return $this->belongsTo(RiderCheckIn::class, 'check_in_id');
    }
    
    public function pauseEvents()
    {
        return $this->hasMany(RiderPauseEvent::class, 'route_id')
            ->orderBy('paused_at');
    }
    
    public function gpsPoints()
    {
        return $this->hasMany(RiderGpsPoint::class, 'check_in_id', 'check_in_id')
            ->orderBy('recorded_at');
    }
    
    // Calculate total pause duration from events
    public function calculateTotalPauseDuration(): int
    {
        return $this->pauseEvents()
            ->whereNotNull('resumed_at')
            ->sum('duration_minutes');
    }
    
    // Update pause summary
    public function updatePauseSummary(): void
    {
        $this->update([
            'total_pause_duration' => $this->calculateTotalPauseDuration(),
            'pause_count' => $this->pauseEvents()->count(),
        ]);
    }
}