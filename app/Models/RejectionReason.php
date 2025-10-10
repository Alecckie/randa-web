<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RejectionReason extends Model
{
    protected $fillable = ['rejected_by','rejectable_type','rejectable_id','reason'];


    public function rejectedBy()
    {
        return $this->belongsTo(User::class,'rejected_by');
    }

    public function rejectable()
    {
        return $this->morphTo();
    }
}
