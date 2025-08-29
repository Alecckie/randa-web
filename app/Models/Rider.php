<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Rider extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'national_id',
        'national_id_front_photo',
        'national_id_back_photo',
        'passport_photo',
        'good_conduct_certificate',
        'motorbike_license',
        'motorbike_registration',
        'mpesa_number',
        'next_of_kin_name',
        'next_of_kin_phone',
        'signed_agreement',
        'status',
        'daily_rate',
        'wallet_balance'
    ];

    protected $casts = [
        'daily_rate' => 'decimal:2',
        'wallet_balance' => 'decimal:2',
    ];

    public function user()
    {
        return $this->belongsTo(User::class,'user_id');
    }

    public function campaignAssignments()
    {
        return $this->hasMany(CampaignAssignment::class);
    }

    public function checkIns()
    {
        return $this->hasMany(RiderCheckIn::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    public function currentAssignment()
    {
        return $this->hasOne(CampaignAssignment::class)->where('status', 'active')->latest();
    }

    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }
}
