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
        'contact_person',
        'status'
    ];

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
