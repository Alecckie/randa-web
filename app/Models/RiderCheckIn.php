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

    // Why a shift ended — a plain string column, not a DB enum, so new
    // reasons can be added here without a migration.
    const END_REASON_COMPLETED = 'completed';
    const END_REASON_SICKNESS = 'sickness';
    const END_REASON_EMERGENCY = 'emergency';
    const END_REASON_OTHER = 'other';
    const END_REASON_AUTO_CLOSED = 'auto_closed';

    protected $fillable = [
        'rider_id',
        'campaign_assignment_id',
        'check_in_date',
        'check_in_time',
        'check_out_time',
        'daily_earning',
        'worked_hours',
        'payable_hours',
        'stationary_hours',
        'hourly_rate_applied',
        'status', // started | paused | resumed | ended
        'end_reason', // completed | sickness | emergency | other
        'settled_at',
        'settled_by',
        'check_in_latitude',
        'check_in_longitude',
        'check_out_latitude',
        'check_out_longitude'
    ];

    /**
     * Hours in a full paid day. Config-backed (RIDER_MAX_HOURS_PER_DAY) so
     * admins can adjust it without a code deploy — see config/rider_shift.php.
     * Payable hours in a shift are capped at this figure.
     */
    public static function maxHoursPerDay(): float
    {
        return (float) config('rider_shift.max_hours_per_day');
    }

    /**
     * KSh paid per hour of tracked, unpaused work, derived from this rider's
     * own daily_rate spread across a full day (daily_rate / max_hours_per_day).
     * e.g. KSh 70/day over a 7-hour day = KSh 10/hr.
     */
    public static function hourlyRateFor(Rider $rider): float
    {
        $maxHours = self::maxHoursPerDay();

        return $maxHours > 0 ? (float) $rider->daily_rate / $maxHours : 0.0;
    }

    /**
     * Minimum hours a rider must actually work in a shift to qualify for
     * that day's payment at all. Config-backed (RIDER_MIN_QUALIFYING_HOURS).
     */
    public static function minQualifyingHours(): float
    {
        return (float) config('rider_shift.min_qualifying_hours');
    }

    /**
     * Earliest hour (0-23) a rider may check in. Config-backed
     * (RIDER_EARLIEST_CHECK_IN_HOUR).
     */
    public static function earliestCheckInHour(): int
    {
        return (int) config('rider_shift.earliest_check_in_hour');
    }

    /**
     * Latest hour (0-23) a rider may check in — at or after this hour,
     * check-in is blocked. Config-backed (RIDER_LATEST_CHECK_IN_HOUR).
     */
    public static function latestCheckInHour(): int
    {
        return (int) config('rider_shift.latest_check_in_hour');
    }

    protected $casts = [
        'check_in_date' => 'date',
        'check_in_time' => 'datetime',
        'check_out_time' => 'datetime',
        'daily_earning' => 'decimal:2',
        'worked_hours' => 'decimal:2',
        'payable_hours' => 'decimal:2',
        'stationary_hours' => 'decimal:2',
        'hourly_rate_applied' => 'decimal:2',
        'settled_at' => 'datetime',
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

    public function settledBy()
    {
        return $this->belongsTo(User::class, 'settled_by');
    }

    // Scopes
    public function scopeUnsettled($query)
    {
        return $query->whereNull('settled_at');
    }

    public function scopeSettled($query)
    {
        return $query->whereNotNull('settled_at');
    }
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

    /**
     * For a finalized shift, prefer the value frozen at checkout time
     * (CheckInService::finalizeShift) over recomputing live — otherwise this
     * accessor silently shadows the real `worked_hours` column on every
     * read (Eloquent accessors take precedence over attributes of the same
     * name), defeating the point of snapshotting it. Still falls back to a
     * live computation for a shift that's still in progress, where the
     * column is genuinely NULL.
     */
    public function getWorkedHoursAttribute(): ?float
    {
        $stored = $this->attributes['worked_hours'] ?? null;
        if (! is_null($stored)) {
            return (float) $stored;
        }

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
