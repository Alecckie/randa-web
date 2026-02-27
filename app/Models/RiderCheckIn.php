<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class RiderCheckIn extends Model
{
    use HasFactory;

    // Status constants
    const STATUS_STARTED = 'started';
    const STATUS_PAUSED = 'paused';
    const STATUS_RESUMED = 'resumed';
    const STATUS_ENDED = 'ended';

    const HOURLY_RATE = 7;

    const EARLIEST_CHECK_IN_HOUR = 6;

    protected $fillable = [
        'rider_id',
        'campaign_assignment_id',
        'check_in_date',
        'check_in_time',
        'check_out_time',
        'daily_earning',
        'status', // started | paused | resumed | ended
        'check_in_latitude',
        'check_in_longitude',
        'check_out_latitude',
        'check_out_longitude'
    ];

    protected $casts = [
        'check_in_date' => 'date',
        'check_in_time' => 'datetime',
        'check_out_time' => 'datetime',
        'daily_earning' => 'decimal:2',
        'check_in_latitude' => 'decimal:8',
        'check_in_longitude' => 'decimal:8',
        'check_out_latitude' => 'decimal:8',
        'check_out_longitude' => 'decimal:8'
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

    public function route()
    {
        return $this->hasOne(RiderRoute::class, 'check_in_id');
    }

    public function pauseEvents()
    {
        return $this->hasMany(RiderPauseEvent::class, 'check_in_id');
    }

    // Scopes
    public function scopeTracking($query)
    {
        return $query->whereIn('status', [self::STATUS_STARTED, self::STATUS_RESUMED]);
    }

    public function scopeOnBreak($query)
    {
        return $query->where('status', self::STATUS_PAUSED);
    }

    public function scopeActive($query)
    {
        return $query->where('status', '!=', self::STATUS_ENDED);
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', self::STATUS_ENDED);
    }

    public function scopeToday($query)
    {
        return $query->whereDate('check_in_date', Carbon::today());
    }

    public function scopeForRider($query, int $riderId)
    {
        return $query->where('rider_id', $riderId);
    }

    // Helper methods
    public function isTracking(): bool
    {
        return in_array($this->status, [self::STATUS_STARTED, self::STATUS_RESUMED]);
    }

    public function isPaused(): bool
    {
        return $this->status === self::STATUS_PAUSED;
    }

    public function isEnded(): bool
    {
        return $this->status === self::STATUS_ENDED;
    }

    // Accessors
    public function getTotalHoursAttribute(): ?float
    {
        if ($this->check_in_time && $this->check_out_time) {
            return $this->check_in_time->diffInMinutes($this->check_out_time) / 60;
        }
        return null;
    }

    public function getPausedMinutesAttribute(): int
    {
        return $this->pauseEvents()
            ->whereNotNull('resumed_at')
            ->sum('duration_minutes');
    }

    public function getPausedHoursAttribute(): float
    {
        return $this->paused_minutes / 60;
    }

    public function getWorkedHoursAttribute(): ?float
    {
        if (!$this->total_hours) {
            return null;
        }

        return max(0, $this->total_hours - $this->paused_hours);
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
