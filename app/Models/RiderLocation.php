<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RiderLocation extends Model
{
     protected $fillable = [
        'rider_id', 'county_id', 'sub_county_id', 'ward_id', 'stage_name',
        'stage_description', 'latitude', 'longitude', 'is_current',
        'effective_from', 'effective_to', 'status', 'notes'
    ];

    protected $casts = [
        'effective_from' => 'date',
        'effective_to' => 'date',
        'is_current' => 'boolean',
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
    ];

    public function rider(): BelongsTo
    {
        return $this->belongsTo(Rider::class);
    }

    public function county(): BelongsTo
    {
        return $this->belongsTo(County::class);
    }

    public function subcounty(): BelongsTo
    {
        return $this->belongsTo(SubCounty::class,'sub_county_id');
    }

    public function ward(): BelongsTo
    {
        return $this->belongsTo(Ward::class);
    }

    public function changeLogs(): HasMany
    {
        return $this->hasMany(RiderLocationChangeLog::class, 'new_location_id');
    }

    public function scopeCurrent(Builder $query): Builder
    {
        return $query->where('is_current', true);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', 'active');
    }

    public function scopeByDateRange(Builder $query, Carbon $from, ?Carbon $to = null): Builder
    {
        return $query->where('effective_from', '>=', $from)
            ->when($to, function (Builder $subQuery, Carbon $to) {
                $subQuery->where('effective_from', '<=', $to);
            });
    }

    public function scopeByStage(Builder $query, string $stageName): Builder
    {
        return $query->where('stage_name', 'LIKE', "%{$stageName}%");
    }

    public function scopeWithFullHierarchy(Builder $query): Builder
    {
        return $query->with(['county', 'subcounty', 'ward']);
    }

    public function isActive(): bool
    {
        return $this->status === 'active' && 
               $this->effective_from <= now() && 
               ($this->effective_to === null || $this->effective_to >= now());
    }

    public function getDurationAttribute(): ?int
    {
        if (!$this->effective_to) {
            return $this->effective_from->diffInDays(now());
        }
        
        return $this->effective_from->diffInDays($this->effective_to);
    }

    public function getFullAddressAttribute(): string
    {
        return "{$this->stage_name}, {$this?->ward?->name}, {$this?->subcounty?->name}, {$this?->county?->name}";
    }

    public function hasGpsCoordinates(): bool
    {
        return $this->latitude !== null && $this->longitude !== null;
    }
}
