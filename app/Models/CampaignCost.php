<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CampaignCost extends Model
{
    use HasFactory;

    protected $fillable = [
        'campaign_id',
        'helmet_count',
        'duration_days',
        'helmet_daily_rate',
        'base_cost',
        'includes_design',
        'design_cost',
        'subtotal',
        'vat_rate',
        'vat_amount',
        'total_cost',
        'status',
        'version',
        'notes'
    ];

    protected $casts = [
        'helmet_daily_rate' => 'decimal:2',
        'base_cost' => 'decimal:2',
        'design_cost' => 'decimal:2',
        'subtotal' => 'decimal:2',
        'vat_rate' => 'decimal:2',
        'vat_amount' => 'decimal:2',
        'total_cost' => 'decimal:2',
        'includes_design' => 'boolean',
    ];

    // Relationships
    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class);
    }

    // Scopes
    public function scopeConfirmed($query)
    {
        return $query->where('status', 'confirmed');
    }

    public function scopeLatestVersion($query)
    {
        return $query->orderByDesc('version');
    }

    public function scopeForCampaign($query, $campaignId)
    {
        return $query->where('campaign_id', $campaignId);
    }

    // Accessors
    public function getFormattedBaseCostAttribute(): string
    {
        return number_format($this->base_cost, 2);
    }

    public function getFormattedDesignCostAttribute(): string
    {
        return number_format($this->design_cost, 2);
    }

    public function getFormattedSubtotalAttribute(): string
    {
        return number_format($this->subtotal, 2);
    }

    public function getFormattedVatAmountAttribute(): string
    {
        return number_format($this->vat_amount, 2);
    }

    public function getFormattedTotalCostAttribute(): string
    {
        return number_format($this->total_cost, 2);
    }

    public function getCostBreakdownAttribute(): array
    {
        return [
            'helmet_count' => $this->helmet_count,
            'duration_days' => $this->duration_days,
            'daily_rate' => $this->helmet_daily_rate,
            'base_cost' => $this->base_cost,
            'design_required' => $this->includes_design,
            'design_cost' => $this->design_cost,
            'subtotal' => $this->subtotal,
            'vat_rate' => $this->vat_rate,
            'vat_amount' => $this->vat_amount,
            'total_cost' => $this->total_cost,
        ];
    }

    public static function calculateBaseCost(int $helmetCount, int $durationDays, float $dailyRate = 200.00): float
    {
        return $helmetCount * $durationDays * $dailyRate;
    }

    public static function calculateDesignCost(bool $needsDesign, float $designRate = 3000.00): float
    {
        return $needsDesign ? $designRate : 0.00;
    }

    public static function calculateVat(float $subtotal, float $vatRate = 16.00): float
    {
        return ($subtotal * $vatRate) / 100;
    }

    public static function calculateTotalCost(float $baseCost, float $designCost, float $vatRate = 16.00): array
    {
        $subtotal = $baseCost + $designCost;
        $vatAmount = self::calculateVat($subtotal, $vatRate);
        $totalCost = $subtotal + $vatAmount;

        return [
            'subtotal' => round($subtotal, 2),
            'vat_amount' => round($vatAmount, 2),
            'total_cost' => round($totalCost, 2),
        ];
    }

    // Helper methods
    public function isConfirmed(): bool
    {
        return $this->status === 'confirmed';
    }

    public function isDraft(): bool
    {
        return $this->status === 'draft';
    }

    public function isPaid(): bool
    {
        return $this->status === 'paid';
    }
}