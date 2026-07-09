<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Helmet extends Model
{
    use HasFactory;

    protected $fillable = [
        'helmet_code',
        'qr_code',
        'status',
        'current_branding'
    ];

    /**
     * Generate a unique helmet code, retrying until it doesn't collide.
     * Used as the server-side source of truth when an admin doesn't type
     * in a code matching a physical asset tag.
     */
    public static function generateHelmetCode(): string
    {
        do {
            $code = 'HMT-' . strtoupper(Str::random(6));
        } while (static::where('helmet_code', $code)->exists());

        return $code;
    }

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
