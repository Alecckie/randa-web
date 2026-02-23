<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Helmet extends Model
{
    use HasFactory;

    protected $fillable = [
        'helmet_code',
        'qr_code',
        'status',
        'current_branding'
    ];

    public function assignments()
    {
        return $this->hasMany(CampaignAssignment::class);
    }

    public function currentAssignment()
    {
        return $this->hasOne(CampaignAssignment::class)->where('status', 'active');
    }

    // public function qrScans()
    // {
    //     return $this->hasMany(QrScan::class);
    // }

    // Scopes
    public function scopeAvailable($query)
    {
        return $query->where('status', 'available');
    }

    public function scopeAssigned($query)
    {
        return $query->where('status', 'assigned');
    }
}
