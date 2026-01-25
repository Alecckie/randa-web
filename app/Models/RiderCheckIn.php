<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class RiderCheckIn extends Model
{
    use HasFactory;

    protected $fillable = [
        'rider_id',
        'campaign_assignment_id',
        'check_in_date',
        'check_in_time',
        'check_out_time',
        'daily_earning',
        'status'
    ];

    protected $casts = [
        'check_in_date' => 'date',
        'check_in_time' => 'datetime',
        'check_out_time' => 'datetime',
        'daily_earning' => 'decimal:2'
    ];

    // Relationships
    public function rider()
    {
        return $this->belongsTo(Rider::class);
    }

    public function campaignAssignment()
    {
        return $this->belongsTo(CampaignAssignment::class);
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    public function scopeToday($query)
    {
        return $query->whereDate('check_in_date', Carbon::today());
    }

    public function scopeForRider($query, int $riderId)
    {
        return $query->where('rider_id', $riderId);
    }

    // Accessors
    public function getWorkedHoursAttribute(): ?float
    {
        if ($this->check_in_time && $this->check_out_time) {
            return $this->check_in_time->diffInHours($this->check_out_time, true);
        }
        return null;
    }

    public function getFormattedCheckInTimeAttribute(): string
    {
        return $this->check_in_time ? $this->check_in_time->format('h:i A') : '-';
    }

    public function getFormattedCheckOutTimeAttribute(): string
    {
        return $this->check_out_time ? $this->check_out_time->format('h:i A') : '-';
    }

    public function getFormattedDailyEarningAttribute(): string
    {
        return 'KSh ' . number_format($this->daily_earning, 2);
    }
}