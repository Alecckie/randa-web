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

    // Status constants
    const STATUS_DRAFT = 'draft';
    const STATUS_CONFIRMED = 'confirmed';
    const STATUS_PAID = 'paid';
    const STATUS_REFUNDED = 'refunded';

    // Relationships
    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class);
    }

    // Scopes
    public function scopeConfirmed($query)
    {
        return $query->where('status', self::STATUS_CONFIRMED);
    }

    public function scopeLatestVersion($query)
    {
        return $query->orderByDesc('version');
    }

    public function scopeForCampaign($query, $campaignId)
    {
        return $query->where('campaign_id', $campaignId);
    }

    public function scopeDraft($query)
    {
        return $query->where('status', self::STATUS_DRAFT);
    }

    public function scopePaid($query)
    {
        return $query->where('status', self::STATUS_PAID);
    }

    // Accessors
    public function getFormattedBaseCostAttribute(): string
    {
        return 'KES ' . number_format($this->base_cost, 2);
    }

    public function getFormattedDesignCostAttribute(): string
    {
        return 'KES ' . number_format($this->design_cost, 2);
    }

    public function getFormattedSubtotalAttribute(): string
    {
        return 'KES ' . number_format($this->subtotal, 2);
    }

    public function getFormattedVatAmountAttribute(): string
    {
        return 'KES ' . number_format($this->vat_amount, 2);
    }

    public function getFormattedTotalCostAttribute(): string
    {
        return 'KES ' . number_format($this->total_cost, 2);
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

    public function getDetailedBreakdownAttribute(): array
    {
        $breakdown = [
            'base_campaign' => [
                'description' => 'Base campaign cost',
                'calculation' => "{$this->helmet_count} helmets × {$this->duration_days} days × KES {$this->helmet_daily_rate}",
                'amount' => $this->base_cost,
                'formatted_amount' => $this->formatted_base_cost,
            ],
        ];

        if ($this->includes_design) {
            $breakdown['design_services'] = [
                'description' => 'Professional design services',
                'calculation' => 'One-time design fee',
                'amount' => $this->design_cost,
                'formatted_amount' => $this->formatted_design_cost,
            ];
        }

        $breakdown['subtotal'] = [
            'description' => 'Subtotal before VAT',
            'amount' => $this->subtotal,
            'formatted_amount' => $this->formatted_subtotal,
        ];

        $breakdown['vat'] = [
            'description' => "VAT ({$this->vat_rate}%)",
            'calculation' => "KES {$this->subtotal} × {$this->vat_rate}%",
            'amount' => $this->vat_amount,
            'formatted_amount' => $this->formatted_vat_amount,
        ];

        $breakdown['total'] = [
            'description' => 'Total amount due',
            'amount' => $this->total_cost,
            'formatted_amount' => $this->formatted_total_cost,
            'currency' => 'KES',
        ];

        return $breakdown;
    }

    // Static calculation methods
    public static function calculateBaseCost(int $helmetCount, int $durationDays, float $dailyRate = 200.00): float
    {
        return round($helmetCount * $durationDays * $dailyRate, 2);
    }

    public static function calculateDesignCost(bool $needsDesign, float $designRate = 3000.00): float
    {
        return $needsDesign ? round($designRate, 2) : 0.00;
    }

    public static function calculateVat(float $subtotal, float $vatRate = 16.00): float
    {
        return round(($subtotal * $vatRate) / 100, 2);
    }

    public static function calculateTotalCost(float $baseCost, float $designCost, float $vatRate = 16.00): array
    {
        $subtotal = round($baseCost + $designCost, 2);
        $vatAmount = self::calculateVat($subtotal, $vatRate);
        $totalCost = round($subtotal + $vatAmount, 2);

        return [
            'subtotal' => $subtotal,
            'vat_amount' => $vatAmount,
            'total_cost' => $totalCost,
        ];
    }

    /**
     * Create a cost calculation for a campaign
     */
    public static function createForCampaign(Campaign $campaign): self
    {
        $helmetCount = $campaign->helmet_count;
        $durationDays = $campaign->duration_days;
        $needsDesign = $campaign->need_design;
        $dailyRate = 1.00;
        $designRate = 3000.00;
        $vatRate = 16.00;

        // Calculate costs
        $baseCost = self::calculateBaseCost($helmetCount, $durationDays, $dailyRate);
        $designCost = self::calculateDesignCost($needsDesign, $designRate);
        $costBreakdown = self::calculateTotalCost($baseCost, $designCost, $vatRate);

        // Get next version number for this campaign
        $nextVersion = self::where('campaign_id', $campaign->id)->max('version') + 1;

        return self::create([
            'campaign_id' => $campaign->id,
            'helmet_count' => $helmetCount,
            'duration_days' => $durationDays,
            'helmet_daily_rate' => $dailyRate,
            'base_cost' => $baseCost,
            'includes_design' => $needsDesign,
            'design_cost' => $designCost,
            'subtotal' => $costBreakdown['subtotal'],
            'vat_rate' => $vatRate,
            'vat_amount' => $costBreakdown['vat_amount'],
            'total_cost' => $costBreakdown['total_cost'],
            'status' => self::STATUS_CONFIRMED,
            'version' => $nextVersion,
        ]);
    }

    /**
     * Create a preview cost calculation without saving to database
     */
    public static function previewForCampaign(Campaign $campaign): array
    {
        $helmetCount = $campaign->helmet_count;
        $durationDays = $campaign->duration_days;
        $needsDesign = $campaign->need_design;
        $dailyRate = 1.00;
        $designRate = 3000.00;
        $vatRate = 16.00;

        $baseCost = self::calculateBaseCost($helmetCount, $durationDays, $dailyRate);
        $designCost = self::calculateDesignCost($needsDesign, $designRate);
        $costBreakdown = self::calculateTotalCost($baseCost, $designCost, $vatRate);

        return [
            'helmet_count' => $helmetCount,
            'duration_days' => $durationDays,
            'daily_rate' => $dailyRate,
            'base_cost' => $baseCost,
            'includes_design' => $needsDesign,
            'design_cost' => $designCost,
            'subtotal' => $costBreakdown['subtotal'],
            'vat_rate' => $vatRate,
            'vat_amount' => $costBreakdown['vat_amount'],
            'total_cost' => $costBreakdown['total_cost'],
            'currency' => 'KES',
            'is_preview' => true,
        ];
    }

    // Helper methods
    public function isConfirmed(): bool
    {
        return $this->status === self::STATUS_CONFIRMED;
    }

    public function isDraft(): bool
    {
        return $this->status === self::STATUS_DRAFT;
    }

    public function isPaid(): bool
    {
        return $this->status === self::STATUS_PAID;
    }

    public function isRefunded(): bool
    {
        return $this->status === self::STATUS_REFUNDED;
    }

    public function markAsConfirmed(): bool
    {
        return $this->update(['status' => self::STATUS_CONFIRMED]);
    }

    public function markAsPaid(): bool
    {
        return $this->update(['status' => self::STATUS_PAID]);
    }

    public function markAsRefunded(string $reason = null): bool
    {
        return $this->update([
            'status' => self::STATUS_REFUNDED,
            'notes' => $reason ? "Refunded: {$reason}" : 'Refunded'
        ]);
    }

    /**
     * Get cost comparison with previous version
     */
    public function compareWithPrevious(): array
    {
        $previousVersion = self::where('campaign_id', $this->campaign_id)
            ->where('version', '<', $this->version)
            ->orderByDesc('version')
            ->first();

        if (!$previousVersion) {
            return ['message' => 'No previous version to compare'];
        }

        $difference = $this->total_cost - $previousVersion->total_cost;
        $percentageChange = $previousVersion->total_cost > 0 
            ? ($difference / $previousVersion->total_cost) * 100 
            : 0;

        return [
            'current_version' => $this->version,
            'previous_version' => $previousVersion->version,
            'current_cost' => $this->total_cost,
            'previous_cost' => $previousVersion->total_cost,
            'difference' => $difference,
            'percentage_change' => round($percentageChange, 2),
            'is_increase' => $difference > 0,
            'is_decrease' => $difference < 0,
            'is_same' => $difference == 0,
        ];
    }

    /**
     * Validate cost parameters before calculation
     */
    public static function validateParameters(array $params): array
    {
        $errors = [];

        if (!isset($params['helmet_count']) || $params['helmet_count'] < 1) {
            $errors[] = 'Helmet count must be at least 1';
        }

        if (!isset($params['duration_days']) || $params['duration_days'] < 1) {
            $errors[] = 'Duration must be at least 1 day';
        }

        if (isset($params['helmet_count']) && $params['helmet_count'] > 10000) {
            $errors[] = 'Maximum 10,000 helmets allowed';
        }

        if (isset($params['duration_days']) && $params['duration_days'] > 365) {
            $errors[] = 'Maximum campaign duration is 365 days';
        }

        return $errors;
    }

    // Boot method for automatic calculations and validations
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            // Ensure version is set
            if (!$model->version) {
                $model->version = self::where('campaign_id', $model->campaign_id)->max('version') + 1;
            }

            // Validate calculations
            $expectedTotal = $model->subtotal + $model->vat_amount;
            if (abs($model->total_cost - $expectedTotal) > 0.01) {
                throw new \Exception('Cost calculation mismatch. Please recalculate.');
            }
        });
    }
}