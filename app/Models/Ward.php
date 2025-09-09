<?php

namespace App\Models;

use App\Traits\HasLocationScopes;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;

class Ward extends Model
{
    use HasLocationScopes;

    protected $fillable = ['sub_county_id', 'name'];
    
    protected $hidden = ['created_at', 'updated_at'];

    protected $casts = [
        'sub_county_id' => 'integer'
    ];

    public function subcounty(): BelongsTo
    {
        return $this->belongsTo(SubCounty::class);
    }

    public function county(): BelongsTo
    {
        return $this->belongsToThrough(County::class, SubCounty::class);
    }

    public function scopeBySubCounty(Builder $query, int $subcountyId): Builder
    {
        return $query->where('sub_county_id', $subcountyId);
    }

    public function scopeByCounty(Builder $query, int $countyId): Builder
    {
        return $query->whereHas('subcounty', function (Builder $subQuery) use ($countyId) {
            $subQuery->where('county_id', $countyId);
        });
    }

    public function scopeForDropdown(Builder $query): Builder
    {
        return $query->select('id', 'sub_county_id', 'name')->orderBy('name');
    }

    public function scopeWithSubCounty(Builder $query): Builder
    {
        return $query->with('subcounty:id,name,county_id');
    }

    public function scopeWithFullHierarchy(Builder $query): Builder
    {
        return $query->with(['subcounty.county:id,name']);
    }

    // Accessor for full display name
    public function getFullNameAttribute(): string
    {
        return "{$this->name}, {$this->subcounty->name}, {$this->subcounty->county->name}";
    }
}
