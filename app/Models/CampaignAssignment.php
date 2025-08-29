<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CampaignAssignment extends Model
{
    use HasFactory;

    protected $fillable = [
        'campaign_id',
        'rider_id',
        'helmet_id',
        'creative_id',
        'zone_id',
        'tracking_tag',
        'assigned_at',
        'completed_at',
        'status'
    ];

    protected $casts = [
        'assigned_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    // Relationships
    public function campaign()
    {
        return $this->belongsTo(Campaign::class);
    }

    public function rider()
    {
        return $this->belongsTo(Rider::class);
    }

    public function helmet()
    {
        return $this->belongsTo(Helmet::class);
    }

    public function creative()
    {
        return $this->belongsTo(Creative::class);
    }

    public function zone()
    {
        return $this->belongsTo(Zone::class);
    }

    public function checkIns()
    {
        return $this->hasMany(RiderCheckIn::class);
    }

    public function qrScans()
    {
        return $this->hasMany(QrScan::class);
    }

    public function gpsTracksViaCheckIns()
    {
        return $this->hasManyThrough(GpsTrack::class, RiderCheckIn::class);
    }

    // Boot method to generate unique tracking tag
    protected static function boot()
    {
        parent::boot();
        
        static::creating(function ($assignment) {
            if (!$assignment->tracking_tag) {
                $assignment->tracking_tag = 'TRK-' . strtoupper(uniqid());
            }
        });
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }
}
