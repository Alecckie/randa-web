<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
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
        'special_instructions'
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'need_design' => 'boolean',
        'require_vat_receipt' => 'boolean',
        'agree_to_terms' => 'boolean',
    ];

    // Relationships
    public function advertiser(): BelongsTo
    {
        return $this->belongsTo(Advertiser::class);
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

   
    // Scopes
    public function scopeActive($query)
    {
        return $query->where('status', 'active')
                    ->whereDate('start_date', '<=', now())
                    ->whereDate('end_date', '>=', now());
    }

    public function scopePaid($query)
    {
        return $query->where('status', 'paid');
    }

    public function scopePendingPayment($query)
    {
        return $query->where('status', 'pending_payment');
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

    public function getPaymentStatusAttribute(): string
    {
        if (!$this->currentCost) {
            return 'no_cost_calculated';
        }

        $totalPaid = $this->total_paid_amount;
        $totalCost = $this->currentCost->total_cost;

        if ($totalPaid >= $totalCost) {
            return 'fully_paid';
        } elseif ($totalPaid > 0) {
            return 'partially_paid';
        } else {
            return 'unpaid';
        }
    }

    // Helper methods
    public function canBeActivated(): bool
    {
        return $this->status === 'paid' && 
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
        return in_array($this->status, ['draft', 'pending_payment', 'paid', 'paused']);
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