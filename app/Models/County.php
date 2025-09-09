<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class County extends Model
{
    protected $fillable = ['code', 'name'];
    
    protected $hidden = ['created_at', 'updated_at'];

    public function sub_counties(): HasMany
    {
        return $this->hasMany(SubCounty::class);
    }

    public function scopeWithCounts($query)
    {
        return $query->withCount(['sub_counties']);
    }

    public function scopeForDropdown($query)
    {
        return $query->select('id', 'name')->orderBy('name');
    }
}