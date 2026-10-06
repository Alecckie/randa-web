<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class CampaignRiderDemographic extends Model
{
    use SoftDeletes,HasFactory;

    const AGE_GROUPS = ['18-25','26-35','36-45','46-55','55+','any'];
    const GENDERS = ['male','female','any'];
    const RIDER_TYPES = ['boda','courier','delivery','taxi'];

    protected $fillable = ['campaign_id','age_group','gender','rider_type'];

}
