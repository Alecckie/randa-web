<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class CampaignRiderDemographic extends Model
{
    use SoftDeletes,HasFactory;

    protected $fillable = ['campaign_id','dob','gender','rider_type'];

}
