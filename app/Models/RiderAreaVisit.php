<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RiderAreaVisit extends Model
{
    protected $fillable = [
        'rider_id',
        'campaign_id',
        'campaign_assignment_id',
        'check_in_id',
        'coverage_area_id',
        'entered_at',
        'exited_at',
        'duration_seconds',
        'gps_points_inside',
        'entry_latitude',
        'entry_longitude',
        'exit_latitude',
        'exit_longitude',
        'visit_date',
    ];

    protected $casts = [
        'entered_at'      => 'datetime',
        'exited_at'       => 'datetime',
        'visit_date'      => 'date',
        'entry_latitude'  => 'float',
        'entry_longitude' => 'float',
        'exit_latitude'   => 'float',
        'exit_longitude'  => 'float',
    ];

    // ──────────────────────────────────────────────────────────────────────
    // Relationships
    // ──────────────────────────────────────────────────────────────────────

    public function rider(): BelongsTo
    {
        return $this->belongsTo(Rider::class);
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class);
    }

    public function campaignAssignment(): BelongsTo
    {
        return $this->belongsTo(CampaignAssignment::class);
    }

    public function checkIn(): BelongsTo
    {
        return $this->belongsTo(RiderCheckIn::class, 'check_in_id');
    }

    public function coverageArea(): BelongsTo
    {
        return $this->belongsTo(CoverageArea::class);
    }

    // ──────────────────────────────────────────────────────────────────────
    // Scopes
    // ──────────────────────────────────────────────────────────────────────

    public function scopeForCampaign($query, int $campaignId)
    {
        return $query->where('campaign_id', $campaignId);
    }

    public function scopeForRider($query, int $riderId)
    {
        return $query->where('rider_id', $riderId);
    }

    public function scopeForArea($query, int $coverageAreaId)
    {
        return $query->where('coverage_area_id', $coverageAreaId);
    }

    public function scopeComplete($query)
    {
        return $query->whereNotNull('exited_at');
    }

    public function scopeInDateRange($query, string $from, string $to)
    {
        return $query->whereBetween('visit_date', [$from, $to]);
    }

    // ──────────────────────────────────────────────────────────────────────
    // Accessors
    // ──────────────────────────────────────────────────────────────────────

    /**
     * Whether the visit has a confirmed exit — i.e. rider entered AND exited.
     */
    public function getIsCompleteAttribute(): bool
    {
        return $this->exited_at !== null;
    }

    /**
     * Human-readable duration string e.g. "12 min" or "1h 4min".
     */
    public function getFormattedDurationAttribute(): string
    {
        if ($this->duration_seconds === null) {
            return 'Ongoing';
        }

        $minutes = (int) round($this->duration_seconds / 60);

        if ($minutes < 60) {
            return "{$minutes} min";
        }

        $hours = intdiv($minutes, 60);
        $rem   = $minutes % 60;

        return $rem > 0 ? "{$hours}h {$rem}min" : "{$hours}h";
    }
}