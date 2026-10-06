<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Helmet extends Model
{
    use HasFactory, SoftDeletes;

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

    /**
     * Resolve a helmet from a rider-supplied code. Accepts either the
     * scanned QR value or the human-readable helmet_code typed in as a
     * fallback when the rider can't scan (they're two different columns —
     * qr_code is generated separately and isn't equal to helmet_code).
     */
    public static function findByScanOrCode(string $code): ?self
    {
        return static::where('qr_code', $code)
            ->orWhere('helmet_code', $code)
            ->first();
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
