<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Advertiser extends Model
{
     use HasFactory;

    protected $fillable = [
        'user_id',
        'company_name',
        'business_registration',
        'address',
        'status'
    ];

    protected static function boot()
    {
        parent::boot();

        // Assign a human-readable, unique advertiser number once the row
        // has an id — a RANDA-internal reference distinct from the
        // advertiser's own external business_registration number.
        static::created(function (Advertiser $advertiser) {
            if (!$advertiser->advertiser_number) {
                $advertiser->advertiser_number = sprintf('ADV-%06d', $advertiser->id);
                $advertiser->saveQuietly();
            }
        });
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function campaigns()
    {
        return $this->hasMany(Campaign::class);
    }

    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }
}
