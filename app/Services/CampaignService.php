<?php

namespace App\Services;

use App\Models\Campaign;
use App\Models\CampaignCost;
use App\Models\Advertiser;
use App\Models\Payment;
use App\Models\Transaction;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Http\UploadedFile;
use Carbon\Carbon;

class CampaignService
{
    /**
     * Get campaigns with filters and pagination
     */
    public function getCampaigns(array $filters = []): LengthAwarePaginator
    {
        $query = Campaign::with(['advertiser.user', 'currentCost'])
            ->when($filters['search'] ?? null, function (Builder $query, string $search) {
                $query->where(function (Builder $subQuery) use ($search) {
                    $subQuery->where('name', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%")
                        ->orWhere('contact_person', 'like', "%{$search}%")
                        ->orWhereHas('advertiser', function (Builder $advertiserQuery) use ($search) {
                            $advertiserQuery->where('company_name', 'like', "%{$search}%");
                        });
                });
            })
            ->when($filters['status'] ?? null, function (Builder $query, string $status) {
                $query->where('status', $status);
            })
            ->when($filters['advertiser_id'] ?? null, function (Builder $query, int $advertiserId) {
                $query->where('advertiser_id', $advertiserId);
            })
            ->when($filters['date_range'] ?? null, function (Builder $query, array $dateRange) {
                if (!empty($dateRange['start'])) {
                    $query->whereDate('start_date', '>=', $dateRange['start']);
                }
                if (!empty($dateRange['end'])) {
                    $query->whereDate('end_date', '<=', $dateRange['end']);
                }
            })
            ->when($filters['payment_status'] ?? null, function (Builder $query, string $paymentStatus) {
                switch ($paymentStatus) {
                    case 'paid':
                        $query->where('status', 'paid');
                        break;
                    case 'pending':
                        $query->where('status', 'pending_payment');
                        break;
                    case 'unpaid':
                        $query->where('status', 'draft');
                        break;
                }
            })
            ->orderBy('created_at', 'desc');

        return $query->paginate(15);
    }

    /**
     * Create a new campaign with cost calculation
     */
    public function createCampaign(array $data, ?UploadedFile $designFile = null): Campaign
    {
        return DB::transaction(function () use ($data, $designFile) {
            // Handle design file upload
            $designFilePath = null;
            if ($designFile) {
                $designFilePath = $this->uploadDesignFile($designFile);
            }

            // Create the campaign
            $campaign = Campaign::create([
                'advertiser_id' => $data['advertiser_id'] ?? null,
                'name' => $data['name'],
                'description' => $data['description'] ?? null,
                'start_date' => $data['start_date'],
                'end_date' => $data['end_date'],
                'coverage_areas' => $data['coverage_areas'],
                'helmet_count' => $data['helmet_count'],
                'budget' => $data['budget'] ?? null,
                'need_design' => $data['need_design'] ?? false,
                'design_file' => $designFilePath,
                'design_requirements' => $data['design_requirements'] ?? null,
                'business_type' => $data['business_type'] ?? null,
                'target_audience' => $data['target_audience'] ?? null,
                'rider_demographics' => $data['rider_demographics'] ?? null,
                'require_vat_receipt' => $data['require_vat_receipt'] ?? false,
                'agree_to_terms' => $data['agree_to_terms'] ?? false,
                'status' => $data['status'] ?? 'draft',
                'special_instructions' => $data['special_instructions'] ?? null,
                'additional_services' => $data['additional_services'] ?? null,
            ]);

            $this->calculateAndStoreCosts($campaign);

            return $campaign;
        });
    }

    /**
     * Update an existing campaign
     */
    public function updateCampaign(Campaign $campaign, array $data, ?UploadedFile $designFile = null): Campaign
    {
        return DB::transaction(function () use ($campaign, $data, $designFile) {
            if ($designFile) {
                // Delete old design file if exists
                if ($campaign->design_file) {
                    Storage::disk('public')->delete($campaign->design_file);
                }
                $data['design_file'] = $this->uploadDesignFile($designFile);
            }

            $campaign->update($data);

            if ($this->shouldRecalculateCosts($campaign, $data)) {
                $this->calculateAndStoreCosts($campaign);
            }

            return $campaign->fresh();
        });
    }

    /**
     * Calculate and store campaign costs
     */
    public function calculateAndStoreCosts(Campaign $campaign): CampaignCost
    {
        $helmetCount = $campaign->helmet_count;
        $durationDays = $campaign->duration_days;
        $needsDesign = $campaign->need_design;
        $dailyRate = 200.00; 
        $designRate = 3000.00; 
        $vatRate = 16.00; 

        $baseCost = CampaignCost::calculateBaseCost($helmetCount, $durationDays, $dailyRate);
        $designCost = CampaignCost::calculateDesignCost($needsDesign, $designRate);
        $costBreakdown = CampaignCost::calculateTotalCost($baseCost, $designCost, $vatRate);

        $nextVersion = $campaign->costs()->max('version') + 1;

        // Create new cost record
        return CampaignCost::create([
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
            'status' => 'confirmed',
            'version' => $nextVersion,
        ]);
    }

    /**
     * Get campaign cost breakdown
     */
    public function getCampaignCostBreakdown(Campaign $campaign): array
    {
        $currentCost = $campaign->currentCost;
        
        if (!$currentCost) {
            return $this->calculateCostPreview($campaign);
        }

        return [
            'helmet_count' => $currentCost->helmet_count,
            'duration_days' => $currentCost->duration_days,
            'daily_rate' => $currentCost->helmet_daily_rate,
            'base_cost' => $currentCost->base_cost,
            'includes_design' => $currentCost->includes_design,
            'design_cost' => $currentCost->design_cost,
            'subtotal' => $currentCost->subtotal,
            'vat_rate' => $currentCost->vat_rate,
            'vat_amount' => $currentCost->vat_amount,
            'total_cost' => $currentCost->total_cost,
            'payment_status' => $campaign->payment_status,
            'amount_paid' => $campaign->total_paid_amount,
            'balance_due' => max(0, $currentCost->total_cost - $campaign->total_paid_amount),
        ];
    }

    /**
     * Calculate cost preview for a campaign
     */
    public function calculateCostPreview(Campaign $campaign): array
    {
        $helmetCount = $campaign->helmet_count;
        $durationDays = $campaign->duration_days;
        $needsDesign = $campaign->need_design;
        
        $baseCost = CampaignCost::calculateBaseCost($helmetCount, $durationDays);
        $designCost = CampaignCost::calculateDesignCost($needsDesign);
        $costBreakdown = CampaignCost::calculateTotalCost($baseCost, $designCost);

        return [
            'helmet_count' => $helmetCount,
            'duration_days' => $durationDays,
            'daily_rate' => 200.00,
            'base_cost' => $baseCost,
            'includes_design' => $needsDesign,
            'design_cost' => $designCost,
            'subtotal' => $costBreakdown['subtotal'],
            'vat_rate' => 16.00,
            'vat_amount' => $costBreakdown['vat_amount'],
            'total_cost' => $costBreakdown['total_cost'],
            'is_preview' => true,
        ];
    }

    /**
     * Process campaign payment
     */
    public function processPayment(Campaign $campaign, array $paymentData): Payment
    {
        return DB::transaction(function () use ($campaign, $paymentData) {
            $currentCost = $campaign->currentCost;
            
            if (!$currentCost) {
                throw new \Exception('Campaign costs must be calculated before processing payment.');
            }

            // Create payment record
            $payment = Payment::create([
                'campaign_id' => $campaign->id,
                'advertiser_id' => $campaign->advertiser_id,
                'payment_reference' => $this->generatePaymentReference(),
                'amount' => $paymentData['amount'],
                'currency' => $paymentData['currency'] ?? 'KES',
                'payment_method' => $paymentData['payment_method'],
                'payment_gateway' => $paymentData['payment_gateway'] ?? null,
                'status' => 'pending',
                'initiated_at' => now(),
                'payment_details' => $paymentData['payment_details'] ?? null,
                'metadata' => $paymentData['metadata'] ?? null,
            ]);

            // $transaction = Transaction::create([
            //     'payment_id' => $payment->id,
            //     'campaign_id' => $campaign->id,
            //     'advertiser_id' => $campaign->advertiser_id,
            //     'transaction_reference' => $this->generateTransactionReference(),
            //     'type' => 'payment',
            //     'amount' => $paymentData['amount'],
            //     'currency' => $paymentData['currency'] ?? 'KES',
            //     'status' => 'pending',
            //     'description' => "Payment for campaign: {$campaign->name}",
            //     'fee_amount' => $paymentData['fee_amount'] ?? 0.00,
            //     'net_amount' => $paymentData['amount'] - ($paymentData['fee_amount'] ?? 0.00),
            // ]);

            return $payment;
        });
    }

    /**
     * Get campaign statistics
     */
    public function getCampaignStats(): array
    {
        return [
            'total_campaigns' => Campaign::count(),
            'active_campaigns' => Campaign::where('status', 'active')->count(),
            'draft_campaigns' => Campaign::where('status', 'draft')->count(),
            'pending_payment' => Campaign::where('status', 'pending_payment')->count(),
            'paid_campaigns' => Campaign::where('status', 'paid')->count(),
            'completed_campaigns' => Campaign::where('status', 'completed')->count(),
            'total_budget' => Campaign::whereNotNull('budget')->sum('budget'),
            'total_revenue' => Transaction::where('type', 'payment')
                                        ->where('status', 'completed')
                                        ->sum('amount'),
        ];
    }

    /**
     * Get approved advertisers for campaign creation
     */
    public function getApprovedAdvertisers()
    {
        return Advertiser::approved()
            ->with('user')
            ->orderBy('company_name')
            ->get();
    }

    /**
     * Get available coverage areas
     */
    public function getAvailableCoverageAreas(): array
    {
        return [
            'nairobi_cbd' => 'Nairobi CBD',
            'westlands' => 'Westlands',
            'karen' => 'Karen',
            'kilimani' => 'Kilimani',
            'parklands' => 'Parklands',
            'kasarani' => 'Kasarani',
            'embakasi' => 'Embakasi',
            'langata' => 'Lang\'ata',
            'dagoretti' => 'Dagoretti',
            'kibra' => 'Kibra',
            'roysambu' => 'Roysambu',
            'mathare' => 'Mathare',
        ];
    }

    /**
     * Upload design file
     */
    private function uploadDesignFile(UploadedFile $file): string
    {
        $filename = time() . '_' . $file->getClientOriginalName();
        return $file->storeAs('campaign-designs', $filename, 'public');
    }

    /**
     * Check if costs should be recalculated
     */
    private function shouldRecalculateCosts(Campaign $campaign, array $data): bool
    {
        $costAffectingFields = [
            'helmet_count', 'start_date', 'end_date', 'need_design'
        ];

        foreach ($costAffectingFields as $field) {
            if (array_key_exists($field, $data) && $campaign->isDirty($field)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Generate unique payment reference
     */
    private function generatePaymentReference(): string
    {
        return 'PAY_' . strtoupper(uniqid()) . '_' . time();
    }

    /**
     * Generate unique transaction reference
     */
    private function generateTransactionReference(): string
    {
        return 'TXN_' . strtoupper(uniqid()) . '_' . time();
    }

    /**
     * Validate campaign dates
     */
    public function validateCampaignDates(string $startDate, string $endDate): bool
    {
        return strtotime($startDate) <= strtotime($endDate);
    }

    /**
     * Get campaign payment history
     */
    public function getPaymentHistory(Campaign $campaign): array
    {
        $payments = $campaign->payments()
                            ->with('transactions')
                            ->orderBy('created_at', 'desc')
                            ->get();

        return $payments->map(function ($payment) {
            return [
                'id' => $payment->id,
                'reference' => $payment->payment_reference,
                'amount' => $payment->formatted_amount,
                'method' => $payment->payment_method,
                'status' => $payment->status,
                'created_at' => $payment->created_at->format('Y-m-d H:i:s'),
                'completed_at' => $payment->completed_at?->format('Y-m-d H:i:s'),
                'transactions' => $payment->transactions->map(function ($transaction) {
                    return [
                        'reference' => $transaction->transaction_reference,
                        'type' => $transaction->type,
                        'amount' => $transaction->formatted_amount,
                        'status' => $transaction->status,
                    ];
                }),
            ];
        })->toArray();
    }
}