<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

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
        'location_points_count',
        'coverage_areas',
        'route_polyline',
        'avg_speed',
        'max_speed',
        'statistics',
        'status'
    ];

    protected $casts = [
        'route_date' => 'date',
        'started_at' => 'datetime',
        'ended_at' => 'datetime',
        'total_distance' => 'decimal:2',
        'avg_speed' => 'decimal:2',
        'max_speed' => 'decimal:2',
        'coverage_areas' => 'array',
        'statistics' => 'array',
    ];

    public function rider(): BelongsTo
    {
        return $this->belongsTo(Rider::class);
    }

    public function checkIn(): BelongsTo
    {
        return $this->belongsTo(RiderCheckIn::class, 'check_in_id');
    }

    public function locations(): HasMany
    {
        return $this->hasMany(RiderLocation::class, 'check_in_id', 'check_in_id')
            ->whereDate('recorded_at', $this->route_date);
    }
}