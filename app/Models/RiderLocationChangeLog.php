<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RiderLocationChangeLog extends Model
{
     protected $fillable = [
        'rider_id', 'old_location_id', 'new_location_id', 'change_type',
        'reason', 'metadata', 'changed_at'
    ];

    protected $casts = [
        'metadata' => 'array',
        'changed_at' => 'datetime',
    ];

    public function rider(): BelongsTo
    {
        return $this->belongsTo(Rider::class);
    }

    public function oldLocation(): BelongsTo
    {
        return $this->belongsTo(RiderLocation::class, 'old_location_id');
    }

    public function newLocation(): BelongsTo
    {
        return $this->belongsTo(RiderLocation::class, 'new_location_id');
    }

    public function scopeByChangeType(Builder $query, string $type): Builder
    {
        return $query->where('change_type', $type);
    }

    public function scopeByDateRange(Builder $query, $from, $to = null): Builder
    {
        return $query->where('changed_at', '>=', $from)
            ->when($to, function (Builder $subQuery, $to) {
                $subQuery->where('changed_at', '<=', $to);
            });
    }

    public function scopeWithLocations(Builder $query): Builder
    {
        return $query->with(['oldLocation.ward', 'newLocation.ward']);
    }
}
