<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Builder;

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
        'wallet_balance',
        'location_last_updated',
        'location_changes_count'
    ];

    protected $casts = [
        'daily_rate' => 'decimal:2',
        'wallet_balance' => 'decimal:2',
        'location_last_updated' => 'datetime',
        'location_changes_count' => 'integer',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
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

     public function locations(): HasMany
    {
        return $this->hasMany(RiderLocation::class);
    }

    public function currentLocation(): HasOne
    {
        return $this->hasOne(RiderLocation::class)->where('is_current', true);
    }

    public function locationHistory(): HasMany
    {
        return $this->hasMany(RiderLocation::class)
            ->orderBy('effective_from', 'desc');
    }

    public function locationChangeLogs(): HasMany
    {
        return $this->hasMany(RiderLocationChangeLog::class)
            ->orderBy('changed_at', 'desc');
    }

    // Scopes
    public function scopeByLocation(Builder $query, int $wardId): Builder
    {
        return $query->whereHas('currentLocation', function (Builder $subQuery) use ($wardId) {
            $subQuery->where('ward_id', $wardId);
        });
    }

    public function scopeByCounty(Builder $query, int $countyId): Builder
    {
        return $query->whereHas('currentLocation', function (Builder $subQuery) use ($countyId) {
            $subQuery->where('county_id', $countyId);
        });
    }

    public function scopeBySubCounty(Builder $query, int $subcountyId): Builder
    {
        return $query->whereHas('currentLocation', function (Builder $subQuery) use ($subcountyId) {
            $subQuery->where('sub_county_id', $subcountyId);
        });
    }

    public function scopeByStage(Builder $query, string $stageName): Builder
    {
        return $query->whereHas('currentLocation', function (Builder $subQuery) use ($stageName) {
            $subQuery->where('stage_name', 'LIKE', "%{$stageName}%");
        });
    }

    public function scopeWithCurrentLocation(Builder $query): Builder
    {
        return $query->with(['currentLocation.county', 'currentLocation.subcounty', 'currentLocation.ward']);
    }

    // Helper methods
    public function hasCurrentLocation(): bool
    {
        return $this->currentLocation()->exists();
    }

    public function getLocationDisplayNameAttribute(): ?string
    {
        if (!$this->currentLocation) {
            return null;
        }

        $location = $this->currentLocation;
        return "{$location->stage_name}, {$location->ward->name}, {$location->subcounty->name}, {$location->county->name}";
    }

    public function canChangeLocation(): bool
    {
        return $this->status === 'approved';
    }
}
