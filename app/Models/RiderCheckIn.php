<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RiderCheckIn extends Model
{
     use HasFactory;

    protected $fillable = [
        'rider_id',
        'campaign_assignment_id',
        'check_in_date',
        'check_in_time',
        'check_out_time',
        'daily_earning',
        'status'
    ];

    protected $casts = [
        'check_in_date' => 'date',
        'check_in_time' => 'datetime',
        'check_out_time' => 'datetime',
        'daily_earning' => 'decimal:2',
    ];

    public function rider()
    {
        return $this->belongsTo(Rider::class);
    }

    public function campaignAssignment()
    {
        return $this->belongsTo(CampaignAssignment::class);
    }

    public function gpsTrack()
    {
        return $this->hasMany(GpsTrack::class);
    }

    // Helper methods
    public function getWorkingHours()
    {
        if ($this->check_out_time && $this->check_in_time) {
            return $this->check_in_time->diffInHours($this->check_out_time);
        }
        return 0;
    }

    public function scopeToday($query)
    {
        return $query->whereDate('check_in_date', today());
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }
}
