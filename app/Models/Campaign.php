<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Campaign extends Model
{
    use HasFactory;

    protected $fillable = [
        'advertiser_id',
        'name',
        'description',
        'start_date',
        'end_date',
        'coverage_areas',
        'helmet_count',
        'budget',
        'status'
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'coverage_areas' => 'array',
        'budget' => 'decimal:2',
    ];

    public function advertiser()
    {
        return $this->belongsTo(Advertiser::class);
    }

    public function assignments()
    {
        return $this->hasMany(CampaignAssignment::class);
    }

    public function reports()
    {
        return $this->hasMany(Report::class);
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('status', 'active')
                    ->whereDate('start_date', '<=', now())
                    ->whereDate('end_date', '>=', now());
    }

}
