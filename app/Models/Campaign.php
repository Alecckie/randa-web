<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Carbon\Carbon;

class Campaign extends Model
{
    use HasFactory;

    protected $fillable = [
        'advertiser_id',
        'name',
        'description',
        'start_date',
        'end_date',
        'helmet_count',
        'need_design',
        'design_file',
        'design_requirements',
        'business_type',
        'require_vat_receipt',
        'agree_to_terms',
        'status',
        'payment_status',
        'special_instructions'
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'need_design' => 'boolean',
        'require_vat_receipt' => 'boolean',
        'agree_to_terms' => 'boolean',
    ];

    protected static function boot()
    {
        parent::boot();

        // Assign a human-readable, unique campaign number once the row has
        // an id — used as the M-Pesa paybill account number for its payments.
        static::created(function (Campaign $campaign) {
            if (!$campaign->campaign_number) {
                $campaign->campaign_number = sprintf('CMP-%06d', $campaign->id);
                $campaign->saveQuietly();
            }
        });
    }

    // Relationships
    public function advertiser(): BelongsTo
    {
        return $this->belongsTo(Advertiser::class);
    }

    public function coverageAreas(): BelongsToMany
    {
        return $this->belongsToMany(CoverageArea::class, 'campaign_coverage_areas', 'campaign_id', 'coverage_area_id');
    }

    public function riderDemographics(): HasMany
    {
        return $this->hasMany(CampaignRiderDemographic::class);
    }

    public function costs(): HasMany
    {
        return $this->hasMany(CampaignCost::class);
    }

    public function currentCost(): HasOne
    {
        return $this->hasOne(CampaignCost::class)
                   ->where('status', 'confirmed')
                   ->orderByDesc('version')
                   ->orderByDesc('created_at');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class);
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(CampaignAssignment::class);
    }

    // public function reports(): HasMany
    // {
    //     return $this->hasMany(Report::class);
    // }

    // public function currentCost(): HasOne
    // {
    //     return $this->hasOne(CampaignCost::class)
    //                ->where('status', 'confirmed')
    //                ->orderByDesc('version');
    // }

    

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('status', 'active')
                    ->whereDate('start_date', '<=', now())
                    ->whereDate('end_date', '>=', now());
    }

    public function scopeSubmitted($query)
    {
        return $query->where('status', 'submitted');
    }

    /**
     * Submitted and paid — configured, funded, just waiting on riders to be
     * assigned and the campaign to be activated.
     */
    public function scopeReadyToActivate($query)
    {
        return $query->where('status', 'submitted')->where('payment_status', 'paid');
    }

    public function scopeAwaitingPayment($query)
    {
        return $query->where('status', 'submitted')
                    ->whereIn('payment_status', ['unpaid', 'pending_verification', 'rejected', 'partially_paid']);
    }

    // Accessors & Mutators
    public function getDurationDaysAttribute(): int
    {
        if (!$this->start_date || !$this->end_date) {
            return 0;
        }
        
        return $this->start_date->diffInDays($this->end_date) + 1; // Include both start and end days
    }

    public function getIsExpiredAttribute(): bool
    {
        return $this->end_date && $this->end_date->isPast();
    }

    public function getIsActiveAttribute(): bool
    {
        return $this->status === 'active' && 
               $this->start_date && 
               $this->end_date &&
               now()->between($this->start_date, $this->end_date);
    }

    // Helper methods for coverage areas
    public function addCoverageArea($coverageAreaId): void
    {
        if (!$this->coverageAreas->contains($coverageAreaId)) {
            $this->coverageAreas()->attach($coverageAreaId);
        }
    }

    public function removeCoverageArea($coverageAreaId): void
    {
        $this->coverageAreas()->detach($coverageAreaId);
    }

    public function syncCoverageAreas(array $coverageAreaIds): void
    {
        $this->coverageAreas()->sync($coverageAreaIds);
    }

    public function getCoverageAreaNamesAttribute(): array
    {
        return $this->coverageAreas->pluck('name')->toArray();
    }

    public function getFormattedCoverageAreasAttribute(): string
    {
        return $this->coverageAreas->pluck('full_name')->join(', ');
    }

    public function getTotalPaidAmountAttribute(): float
    {
        return $this->payments()
                   ->where('status', 'completed')
                   ->sum('amount');
    }

    // `payment_status` is now a real persisted column (see fillable above) —
    // no computed accessor needed. Kept here only as historical context:
    // it used to be derived from total_paid_amount vs currentCost, which
    // silently ignored pending_verification/rejected payments.

    // Helper methods
    public function canBeActivated(): bool
    {
        return $this->status === 'submitted' &&
               $this->payment_status === 'paid' &&
               $this->agree_to_terms &&
               $this->start_date &&
               $this->end_date &&
               !$this->is_expired;
    }

    public function canBePaused(): bool
    {
        return $this->status === 'active';
    }

    public function canBeCancelled(): bool
    {
        return in_array($this->status, ['draft', 'submitted', 'paused']);
    }

    /**
     * Riders may only be assigned once the campaign is genuinely paid —
     * either while awaiting activation, or after it's already live.
     */
    public function canAssignRiders(): bool
    {
        return in_array($this->status, ['submitted', 'active']) && $this->payment_status === 'paid';
    }

    public function hasDesignRequirement(): bool
    {
        return $this->need_design === true;
    }

    public function requiresVatReceipt(): bool
    {
        return $this->require_vat_receipt === true;
    }
}