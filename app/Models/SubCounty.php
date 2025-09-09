<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SubCounty extends Model
{
    protected $fillable = ['county_id', 'name'];
    
    protected $hidden = ['created_at', 'updated_at'];

    public function county()
    {
        return $this->belongsTo(County::class);
    }

    public function wards(): HasMany
    {
        return $this->hasMany(Ward::class);
    }

    public function scopeByCounty($query, $countyId)
    {
        return $query->where('county_id', $countyId);
    }

    public function scopeWithCounts($query)
    {
        return $query->withCount(['wards']);
    }

    public function scopeForDropdown($query)
    {
        return $query->select('id', 'county_id', 'name')->orderBy('name');
    }
}