<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

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
        'route_date'           => 'date',
        'started_at'           => 'datetime',
        'ended_at'             => 'datetime',
        'last_paused_at'       => 'datetime',
        'last_resumed_at'      => 'datetime',
        'total_distance'       => 'decimal:2',
        'avg_speed'            => 'decimal:2',
        'max_speed'            => 'decimal:2',
        'coverage_areas'       => 'array',
        'pause_history'        => 'array',
        'statistics'           => 'array',
        'metadata'             => 'array',
    ];

    // ──────────────────────────────────────────────────────────────────────
    // Relationships
    // ──────────────────────────────────────────────────────────────────────

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

    public function pauseEvents(): HasMany
    {
        return $this->hasMany(RiderPauseEvent::class, 'route_id')
            ->orderBy('paused_at');
    }

    /**
     * GPS points for this route via the shared check_in_id foreign key.
     * Ordered chronologically for polyline rendering.
     */
    public function gpsPoints(): HasMany
    {
        return $this->hasMany(RiderGpsPoint::class, 'check_in_id', 'check_in_id')
            ->orderBy('recorded_at');
    }

    // ──────────────────────────────────────────────────────────────────────
    // Scopes
    // ──────────────────────────────────────────────────────────────────────

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeToday($query)
    {
        return $query->whereDate('route_date', today());
    }

    public function scopeForRider($query, int $riderId)
    {
        return $query->where('rider_id', $riderId);
    }

    // ──────────────────────────────────────────────────────────────────────
    // Pause helpers
    // ──────────────────────────────────────────────────────────────────────

    /**
     * Re-calculate total pause duration from completed pause events
     * and update pause_count and pause_history on this route.
     */
    public function updatePauseSummary(): void
    {
        $events = $this->pauseEvents()->whereNotNull('resumed_at')->get();

        $totalMinutes = $events->sum('duration_minutes');
        $pauseCount   = $this->pauseEvents()->count();

        // Build a compact history array for the pause_history JSON column
        $history = $events->map(fn ($e) => [
            'paused_at'        => $e->paused_at?->toIso8601String(),
            'resumed_at'       => $e->resumed_at?->toIso8601String(),
            'duration_minutes' => $e->duration_minutes,
            'latitude'         => $e->pause_latitude  ? (float) $e->pause_latitude  : null,
            'longitude'        => $e->pause_longitude ? (float) $e->pause_longitude : null,
            'reason'           => $e->reason,
        ])->values()->toArray();

        $this->update([
            'total_pause_duration' => $totalMinutes,
            'pause_count'          => $pauseCount,
            'pause_history'        => $history,
        ]);
    }

    // ──────────────────────────────────────────────────────────────────────
    // Accessors
    // ──────────────────────────────────────────────────────────────────────

    /**
     * Whether tracking is currently active (not paused, not ended).
     */
    public function getIsActiveAttribute(): bool
    {
        return $this->tracking_status === 'active';
    }

    /**
     * Net worked minutes excluding pauses.
     */
    public function getWorkedMinutesAttribute(): int
    {
        return max(0, ($this->total_duration ?? 0) - ($this->total_pause_duration ?? 0));
    }
}