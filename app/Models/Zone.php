<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Zone extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'boundaries',
        'is_active'
    ];

    protected $casts = [
        'boundaries' => 'array',
        'is_active' => 'boolean',
    ];

    public function assignments()
    {
        return $this->hasMany(CampaignAssignment::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
