<?php

namespace App\Services;

use App\Models\Campaign;
use App\Models\CampaignCost;
use App\Models\CampaignRiderDemographic;
use App\Models\Advertiser;
use App\Models\Payment;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Http\UploadedFile;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;

class CampaignService
{
    public function getCampaigns(array $filters = [], ?User $user = null): LengthAwarePaginator
    {
        $user = $user ?? Auth::user();
        
        $query = $this->buildBaseQuery()
            ->when($user, fn($q) => $this->applyRoleBasedFiltering($q, $user))
            ->when($filters['search'] ?? null, fn($q, $search) => $this->applySearchFilter($q, $search))
            ->when($filters['status'] ?? null, fn($q, $status) => $q->where('status', $status))
            ->when($filters['advertiser_id'] ?? null, fn($q, $id) => $q->where('advertiser_id', $id))
            ->when($filters['date_range'] ?? null, fn($q, $range) => $this->applyDateRangeFilter($q, $range))
            ->when($filters['payment_status'] ?? null, fn($q, $status) => $this->applyPaymentStatusFilter($q, $status))
            ->when($filters['coverage_area_ids'] ?? null, fn($q, $ids) => $this->applyCoverageAreaFilter($q, $ids))
            ->orderBy($filters['sort_by'] ?? 'created_at', $filters['sort_order'] ?? 'desc');

        return $query->paginate($filters['per_page'] ?? 15);
    }

    /**
     * Get campaign statistics with role-based filtering
     */
    public function getCampaignStats(?User $user = null): array
    {
        $user = $user ?? Auth::user();
        
        $baseQuery = Campaign::query();
        
        if ($user && $user->role === 'advertiser') {
            $baseQuery->where('advertiser_id', $user->advertiser->id ?? null);
        }

        return [
            'total_campaigns' => (clone $baseQuery)->count(),
            'active_campaigns' => (clone $baseQuery)->where('status', 'active')->count(),
            'draft_campaigns' => (clone $baseQuery)->where('status', 'draft')->count(),
            'pending_payment' => (clone $baseQuery)->where('status', 'pending_payment')->count(),
            'paid_campaigns' => (clone $baseQuery)->where('status', 'paid')->count(),
            'completed_campaigns' => (clone $baseQuery)->where('status', 'completed')->count(),
            'paused_campaigns' => (clone $baseQuery)->where('status', 'paused')->count(),
            'cancelled_campaigns' => (clone $baseQuery)->where('status', 'cancelled')->count(),
            // 'total_revenue' => $this->calculateRevenue($user),
            'coverage_areas_count' => \App\Models\CoverageArea::count(),
        ];
    }

    /**
     * Build the base query with eager loading
     */
    protected function buildBaseQuery(): Builder
    {
        return Campaign::with([
            'advertiser.user',
            'currentCost',
            'coverageAreas'
        ]);
    }

    /**
     * Apply role-based filtering to query
     */
    protected function applyRoleBasedFiltering(Builder $query, User $user): Builder
    {
        return match ($user->role) {
            'advertiser' => $query->where('advertiser_id', $user->advertiser->id ?? null),
            'admin' => $query, // Admins see all campaigns
            default => $query->whereRaw('1 = 0'), // Other roles see nothing
        };
    }

    /**
     * Apply search filter across multiple fields
     */
    protected function applySearchFilter(Builder $query, string $search): Builder
    {
        return $query->where(function (Builder $subQuery) use ($search) {
            $subQuery->where('name', 'like', "%{$search}%")
                ->orWhere('description', 'like', "%{$search}%")
                ->orWhereHas('advertiser', function (Builder $advertiserQuery) use ($search) {
                    $advertiserQuery->where('company_name', 'like', "%{$search}%")
                        ->orWhereHas('user', function (Builder $userQuery) use ($search) {
                            $userQuery->where('name', 'like', "%{$search}%")
                                ->orWhere('email', 'like', "%{$search}%");
                        });
                });
        });
    }

    /**
     * Apply date range filter
     */
    protected function applyDateRangeFilter(Builder $query, array $dateRange): Builder
    {
        if (!empty($dateRange['start'])) {
            $query->whereDate('start_date', '>=', $dateRange['start']);
        }
        
        if (!empty($dateRange['end'])) {
            $query->whereDate('end_date', '<=', $dateRange['end']);
        }

        return $query;
    }

    /**
     * Apply payment status filter
     */
    protected function applyPaymentStatusFilter(Builder $query, string $paymentStatus): Builder
    {
        return match ($paymentStatus) {
            'paid' => $query->where('status', 'paid'),
            'pending' => $query->where('status', 'pending_payment'),
            'unpaid' => $query->where('status', 'draft'),
            default => $query,
        };
    }

    /**
     * Apply coverage area filter
     */
    protected function applyCoverageAreaFilter(Builder $query, array $coverageAreaIds): Builder
    {
        return $query->whereHas('coverageAreas', function (Builder $subQuery) use ($coverageAreaIds) {
            $subQuery->whereIn('coverage_areas.id', $coverageAreaIds);
        });
    }

    /**
     * Calculate total revenue based on user role
     */
    protected function calculateRevenue(?User $user): float
    {
        $query = Transaction::where('type', 'payment')
            ->where('status', 'completed');

        if ($user && $user->role === 'advertiser') {
            $query->whereHas('campaign', function (Builder $q) use ($user) {
                $q->where('advertiser_id', $user->advertiser->id ?? null);
            });
        }

        return $query->sum('amount');
    }

   

    /**
     * Check if user can view campaign
     */
    public function canViewCampaign(Campaign $campaign, User $user): bool
    {
        return match ($user->role) {
            'admin' => true,
            'advertiser' => $campaign->advertiser_id === ($user->advertiser->id ?? null),
            default => false,
        };
    }

    /**
     * Check if user can edit campaign
     */
    public function canEditCampaign(Campaign $campaign, User $user): bool
    {
        if ($user->role === 'admin') {
            return true;
        }

        if ($user->role === 'advertiser' && 
            $campaign->advertiser_id === ($user->advertiser->id ?? null)) {
            return in_array($campaign->status, ['draft', 'pending_payment']);
        }

        return false;
    }

    /**
     * Create a new campaign with normalized data
     */
    public function createCampaign(array $data, ?UploadedFile $designFile = null): Campaign
    {
        return DB::transaction(function () use ($data, $designFile) {
            // Handle design file upload
            $designFilePath = null;
            if ($designFile) {
                $designFilePath = $this->uploadDesignFile($designFile);
            }

            // Create the campaign (without contact info and JSON fields)
            $campaign = Campaign::create([
                'advertiser_id' => $data['advertiser_id'],
                'name' => $data['name'],
                'description' => $data['description'] ?? null,
                'start_date' => $data['start_date'],
                'end_date' => $data['end_date'],
                'helmet_count' => $data['helmet_count'],
                'need_design' => $data['need_design'] ?? false,
                'design_file' => $designFilePath,
                'design_requirements' => $data['design_requirements'] ?? null,
                'business_type' => $data['business_type'] ?? null,
                'require_vat_receipt' => $data['require_vat_receipt'] ?? false,
                'agree_to_terms' => $data['agree_to_terms'] ?? false,
                'status' => 'paid',
                'special_instructions' => $data['special_instructions'] ?? null,
            ]);

            // Sync coverage areas using the new coverage_area_ids
            if (isset($data['coverage_area_ids']) && is_array($data['coverage_area_ids'])) {
                $campaign->coverageAreas()->sync($data['coverage_area_ids']);
            }

            // Create rider demographics if provided
            if (isset($data['rider_demographics']) && is_array($data['rider_demographics'])) {
                $this->createRiderDemographics($campaign, $data['rider_demographics']);
            }

            // Calculate and store campaign costs
            $this->calculateAndStoreCosts($campaign);

            return $campaign->load(['coverageAreas', 'riderDemographics', 'currentCost']);
        });
    }

    /**
     * Update an existing campaign with normalized data
     */
    public function updateCampaign(Campaign $campaign, array $data, ?UploadedFile $designFile = null): Campaign
    {
        return DB::transaction(function () use ($campaign, $data, $designFile) {
            // Handle design file upload
            if ($designFile) {
                // Delete old design file if exists
                if ($campaign->design_file) {
                    Storage::disk('public')->delete($campaign->design_file);
                }
                $data['design_file'] = $this->uploadDesignFile($designFile);
            }

            // Update the campaign
            $campaign->update($data);

            // Update coverage areas
            if (isset($data['coverage_area_ids']) && is_array($data['coverage_area_ids'])) {
                $campaign->coverageAreas()->sync($data['coverage_area_ids']);
            }

            // Update rider demographics if provided
            if (isset($data['rider_demographics']) && is_array($data['rider_demographics'])) {
                $this->createRiderDemographics($campaign, $data['rider_demographics']);
            }

            // Recalculate costs if relevant fields changed
            if ($this->shouldRecalculateCosts($campaign, $data)) {
                $this->calculateAndStoreCosts($campaign);
            }

            return $campaign->fresh(['coverageAreas', 'riderDemographics', 'currentCost']);
        });
    }

    /**
     * Create rider demographics for campaign
     */
    private function createRiderDemographics(Campaign $campaign, array $demographics): void
    {
        // Clear existing demographics
        $campaign->riderDemographics()->delete();

        $demographicsToCreate = [];

        // Extract arrays from the demographics data
        $ageGroups = $demographics['age_groups'] ?? [];
        $genders = $demographics['genders'] ?? [];
        $riderTypes = $demographics['rider_types'] ?? [];

        // If no demographics provided, skip creation
        if (empty($ageGroups) && empty($genders) && empty($riderTypes)) {
            return;
        }

        // Use default values if arrays are empty
        $ageGroups = empty($ageGroups) ? ['any'] : $ageGroups;
        $genders = empty($genders) ? ['any'] : $genders;
        $riderTypes = empty($riderTypes) ? ['courier'] : $riderTypes;

        // Create combinations of demographics
        foreach ($ageGroups as $ageGroup) {
            foreach ($genders as $gender) {
                foreach ($riderTypes as $riderType) {
                    // Validate values against allowed enums
                    if (
                        in_array($ageGroup, CampaignRiderDemographic::AGE_GROUPS) &&
                        in_array($gender, CampaignRiderDemographic::GENDERS) &&
                        in_array($riderType, CampaignRiderDemographic::RIDER_TYPES)
                    ) {

                        $demographicsToCreate[] = [
                            'campaign_id' => $campaign->id,
                            'age_group' => $ageGroup,
                            'gender' => $gender,
                            'rider_type' => $riderType,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ];
                    }
                }
            }
        }

        if (!empty($demographicsToCreate)) {
            // Remove duplicates based on combination of fields
            $uniqueDemographics = [];
            foreach ($demographicsToCreate as $demographic) {
                $key = $demographic['age_group'] . '_' . $demographic['gender'] . '_' . $demographic['rider_type'];
                $uniqueDemographics[$key] = $demographic;
            }

            CampaignRiderDemographic::insert(array_values($uniqueDemographics));
        }
    }

    /**
     * Calculate and store campaign costs
     */
    public function calculateAndStoreCosts(Campaign $campaign): CampaignCost
    {
        $helmetCount = $campaign->helmet_count;
        $durationDays = $campaign->duration_days;
        $needsDesign = $campaign->need_design;
        $dailyRate = 200.00; // Fixed rate per helmet per day
        $designRate = 3000.00; // Fixed design cost
        $vatRate = 16.00; // 16% VAT

        // Calculate costs
        $baseCost = CampaignCost::calculateBaseCost($helmetCount, $durationDays, $dailyRate);
        $designCost = CampaignCost::calculateDesignCost($needsDesign, $designRate);
        $costBreakdown = CampaignCost::calculateTotalCost($baseCost, $designCost, $vatRate);

        // Get next version number
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
     * Get a single campaign with all relationships
     */
    public function getCampaign(int $campaignId): Campaign
    {
        return Campaign::with([
            'advertiser.user',
            'coverageAreas.county',
            'coverageAreas.subCounty',
            'coverageAreas.ward',
            'riderDemographics',
            'currentCost',
            'costs' => function ($query) {
                $query->orderBy('version', 'desc');
            },
            'payments.transactions',
            'assignments.rider.user',
            'assignments.helmet'
        ])->findOrFail($campaignId);
    }

    /**
     * Get campaign for editing with formatted data
     */
    public function getCampaignForEdit(int $campaignId): array
    {
        $campaign = $this->getCampaign($campaignId);

        // Format rider demographics for the form
        $riderDemographics = [
            'age_groups' => $campaign->riderDemographics->pluck('age_group')->unique()->values()->toArray(),
            'genders' => $campaign->riderDemographics->pluck('gender')->unique()->values()->toArray(),
            'rider_types' => $campaign->riderDemographics->pluck('rider_type')->unique()->values()->toArray(),
        ];

        return [
            'campaign' => $campaign,
            'coverage_area_ids' => $campaign->coverageAreas->pluck('id')->toArray(),
            'rider_demographics' => $riderDemographics,
            'cost_breakdown' => $this->getCampaignCostBreakdown($campaign),
            'payment_history' => $this->getPaymentHistory($campaign),
            'demographics_summary' => $this->getCampaignDemographics($campaign),
        ];
    }

    /**
     * Get campaign demographics summary
     */
    public function getCampaignDemographics(Campaign $campaign): array
    {
        $demographics = $campaign->riderDemographics;

        return [
            'age_groups' => $demographics->pluck('age_group')->unique()->values(),
            'genders' => $demographics->pluck('gender')->unique()->values(),
            'rider_types' => $demographics->pluck('rider_type')->unique()->values(),
            'total_combinations' => $demographics->count(),
        ];
    }

    /**
     * Delete a campaign and related data
     */
    public function deleteCampaign(Campaign $campaign): bool
    {
        return DB::transaction(function () use ($campaign) {
            // Delete design file if exists
            if ($campaign->design_file) {
                Storage::disk('public')->delete($campaign->design_file);
            }

            // Delete related records (cascade will handle most, but we want to be explicit)
            $campaign->riderDemographics()->delete();
            $campaign->coverageAreas()->detach();
            $campaign->costs()->delete();

            // Delete the campaign itself
            return $campaign->delete();
        });
    }

    /**
     * Update campaign status
     */
    public function updateCampaignStatus(Campaign $campaign, string $status): Campaign
    {
        // Validate status transition
        $allowedTransitions = [
            'draft' => ['pending_payment', 'cancelled'],
            'pending_payment' => ['paid', 'cancelled'],
            'paid' => ['active', 'cancelled'],
            'active' => ['paused', 'completed'],
            'paused' => ['active', 'cancelled'],
            'completed' => [], // No transitions from completed
            'cancelled' => [], // No transitions from cancelled
        ];

        $currentStatus = $campaign->status;

        if (
            !isset($allowedTransitions[$currentStatus]) ||
            !in_array($status, $allowedTransitions[$currentStatus])
        ) {
            throw new \InvalidArgumentException("Cannot transition from {$currentStatus} to {$status}");
        }

        $campaign->update(['status' => $status]);

        return $campaign->fresh();
    }

    /**
     * Duplicate a campaign
     */
    public function duplicateCampaign(Campaign $originalCampaign, array $overrides = []): Campaign
    {
        return DB::transaction(function () use ($originalCampaign, $overrides) {
            // Prepare campaign data
            $campaignData = array_merge([
                'advertiser_id' => $originalCampaign->advertiser_id,
                'name' => $originalCampaign->name . ' (Copy)',
                'description' => $originalCampaign->description,
                'business_type' => $originalCampaign->business_type,
                'need_design' => $originalCampaign->need_design,
                'design_requirements' => $originalCampaign->design_requirements,
                'require_vat_receipt' => $originalCampaign->require_vat_receipt,
                'special_instructions' => $originalCampaign->special_instructions,
                'status' => 'draft', // Always start as draft
                'agree_to_terms' => false, // Must re-agree
            ], $overrides);

            // Create new campaign
            $newCampaign = Campaign::create($campaignData);

            // Copy coverage areas
            $coverageAreaIds = $originalCampaign->coverageAreas->pluck('id')->toArray();
            $newCampaign->coverageAreas()->sync($coverageAreaIds);

            // Copy rider demographics
            $originalDemographics = [
                'age_groups' => $originalCampaign->riderDemographics->pluck('age_group')->unique()->values()->toArray(),
                'genders' => $originalCampaign->riderDemographics->pluck('gender')->unique()->values()->toArray(),
                'rider_types' => $originalCampaign->riderDemographics->pluck('rider_type')->unique()->values()->toArray(),
            ];
            $this->createRiderDemographics($newCampaign, $originalDemographics);

            // Calculate costs for the new campaign
            $this->calculateAndStoreCosts($newCampaign);

            return $newCampaign->load(['coverageAreas', 'riderDemographics', 'currentCost']);
        });
    }

    // /**
    //  * Get campaigns summary for dashboard
    //  */
    // public function getCampaignsSummary(): array
    // {
    //     $stats = $this->getCampaignStats();
    //     $recentCampaigns = Campaign::with(['advertiser', 'currentCost'])
    //         ->orderBy('created_at', 'desc')
    //         ->limit(5)
    //         ->get();

    //     $upcomingCampaigns = Campaign::where('status', 'paid')
    //         ->where('start_date', '>', now())
    //         ->orderBy('start_date')
    //         ->limit(5)
    //         ->get();

    //     return [
    //         'stats' => $stats,
    //         'recent_campaigns' => $recentCampaigns,
    //         'upcoming_campaigns' => $upcomingCampaigns,
    //         'revenue_this_month' => Transaction::where('type', 'payment')
    //             ->where('status', 'completed')
    //             ->whereYear('created_at', now()->year)
    //             ->whereMonth('created_at', now()->month)
    //             ->sum('amount'),
    //     ];
    // }

    /**
     * Update campaign status
     */
    // public function updateCampaignStatus(Campaign $campaign, string $status): Campaign
    // {
    //     // Validate status transition
    //     $allowedTransitions = [
    //         'draft' => ['pending_payment', 'cancelled'],
    //         'pending_payment' => ['paid', 'cancelled'],
    //         'paid' => ['active', 'cancelled'],
    //         'active' => ['paused', 'completed'],
    //         'paused' => ['active', 'cancelled'],
    //         'completed' => [], // No transitions from completed
    //         'cancelled' => [], // No transitions from cancelled
    //     ];

    //     $currentStatus = $campaign->status;

    //     if (!isset($allowedTransitions[$currentStatus]) || 
    //         !in_array($status, $allowedTransitions[$currentStatus])) {
    //         throw new \InvalidArgumentException("Cannot transition from {$currentStatus} to {$status}");
    //     }

    //     $campaign->update(['status' => $status]);

    //     return $campaign->fresh();
    // }

    /**
     * Duplicate a campaign
     */
    // public function duplicateCampaign(Campaign $originalCampaign, array $overrides = []): Campaign
    // {
    //     return DB::transaction(function () use ($originalCampaign, $overrides) {
    //         // Prepare campaign data
    //         $campaignData = array_merge([
    //             'advertiser_id' => $originalCampaign->advertiser_id,
    //             'name' => $originalCampaign->name . ' (Copy)',
    //             'description' => $originalCampaign->description,
    //             'business_type' => $originalCampaign->business_type,
    //             'need_design' => $originalCampaign->need_design,
    //             'design_requirements' => $originalCampaign->design_requirements,
    //             'require_vat_receipt' => $originalCampaign->require_vat_receipt,
    //             'special_instructions' => $originalCampaign->special_instructions,
    //             'status' => 'draft', // Always start as draft
    //             'agree_to_terms' => false, // Must re-agree
    //         ], $overrides);

    //         // Create new campaign
    //         $newCampaign = Campaign::create($campaignData);

    //         // Copy coverage areas
    //         $coverageAreaIds = $originalCampaign->coverageAreas->pluck('id')->toArray();
    //         $newCampaign->coverageAreas()->sync($coverageAreaIds);

    //         // Copy rider demographics
    //         $originalDemographics = [
    //             'age_groups' => $originalCampaign->riderDemographics->pluck('age_group')->unique()->values()->toArray(),
    //             'genders' => $originalCampaign->riderDemographics->pluck('gender')->unique()->values()->toArray(),
    //             'rider_types' => $originalCampaign->riderDemographics->plunk('rider_type')->unique()->values()->toArray(),
    //         ];
    //         $this->createRiderDemographics($newCampaign, $originalDemographics);

    //         // Calculate costs for the new campaign
    //         $this->calculateAndStoreCosts($newCampaign);

    //         return $newCampaign->load(['coverageAreas', 'riderDemographics', 'currentCost']);
    //     });
    // }

    /**
     * Get campaigns summary for dashboard
     */
    // public function getCampaignsSummary(): array
    // {
    //     $stats = $this->getCampaignStats();
    //     $recentCampaigns = Campaign::with(['advertiser', 'currentCost'])
    //         ->orderBy('created_at', 'desc')
    //         ->limit(5)
    //         ->get();

    //     $upcomingCampaigns = Campaign::where('status', 'paid')
    //         ->where('start_date', '>', now())
    //         ->orderBy('start_date')
    //         ->limit(5)
    //         ->get();

    //     return [
    //         'stats' => $stats,
    //         'recent_campaigns' => $recentCampaigns,
    //         'upcoming_campaigns' => $upcomingCampaigns,
    //         'revenue_this_month' => Transaction::where('type', 'payment')
    //             ->where('status', 'completed')
    //             ->whereYear('created_at', now()->year)
    //             ->whereMonth('created_at', now()->month)
    //             ->sum('amount'),
    //     ];
    // }

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

            // Create corresponding transaction
            $transaction = Transaction::create([
                'payment_id' => $payment->id,
                'campaign_id' => $campaign->id,
                'advertiser_id' => $campaign->advertiser_id,
                'transaction_reference' => $this->generateTransactionReference(),
                'type' => 'payment',
                'amount' => $paymentData['amount'],
                'currency' => $paymentData['currency'] ?? 'KES',
                'status' => 'pending',
                'description' => "Payment for campaign: {$campaign->name}",
                'fee_amount' => $paymentData['fee_amount'] ?? 0.00,
                'net_amount' => $paymentData['amount'] - ($paymentData['fee_amount'] ?? 0.00),
            ]);

            return $payment;
        });
    }

    /**
     * Get campaign statistics
     */
    // public function getCampaignStats(): array
    // {
    //     return [
    //         'total_campaigns' => Campaign::count(),
    //         'active_campaigns' => Campaign::where('status', 'active')->count(),
    //         'draft_campaigns' => Campaign::where('status', 'draft')->count(),
    //         'pending_payment' => Campaign::where('status', 'pending_payment')->count(),
    //         'paid_campaigns' => Campaign::where('status', 'paid')->count(),
    //         'completed_campaigns' => Campaign::where('status', 'completed')->count(),
    //         'total_revenue' => Transaction::where('type', 'payment')
    //             ->where('status', 'completed')
    //             ->sum('amount'),
    //         'coverage_areas_count' => \App\Models\CoverageArea::count(),
    //     ];
    // }

    /**
     * Get approved advertisers for campaign creation
     */
    public function getApprovedAdvertisers()
    {
        return Advertiser::with('user')
            ->orderBy('company_name')
            ->get();
    }

    /**
     * Get available coverage areas with hierarchical structure
     */
    // public function getAvailableCoverageAreas(): array
    // {
    //     $coverageAreaService = new CoverageAreasService();
    //     return $coverageAreaService->getForSelect();
    // }

    /**
     * Search coverage areas for frontend autocomplete
     */
    // public function searchCoverageAreas(string $search): array
    // {
    //     $coverageAreaService = new CoverageAreaService();
    //     $results = $coverageAreaService->searchWithLocation($search);

    //     return $results->map(function ($area) {
    //         return [
    //             'value' => $area->id,
    //             'label' => $area->full_name,
    //             'area_code' => $area->area_code,
    //             'location_hierarchy' => $area->location_hierarchy,
    //         ];
    //     })->toArray();
    // }

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
            'helmet_count',
            'start_date',
            'end_date',
            'need_design'
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

    /**
     * Get campaigns by coverage area for reporting
     */
    public function getCampaignsByCoverageArea(array $coverageAreaIds): array
    {
        return Campaign::whereHas('coverageAreas', function (Builder $query) use ($coverageAreaIds) {
            $query->whereIn('coverage_areas.id', $coverageAreaIds);
        })
            ->with(['coverageAreas', 'currentCost'])
            ->get()
            ->groupBy(function ($campaign) {
                return $campaign->coverageAreas->pluck('name')->join(', ');
            })
            ->map(function ($campaigns, $areaNames) {
                return [
                    'coverage_areas' => $areaNames,
                    'campaign_count' => $campaigns->count(),
                    'total_cost' => $campaigns->sum(function ($campaign) {
                        return $campaign->currentCost?->total_cost ?? 0;
                    }),
                    'active_campaigns' => $campaigns->where('status', 'active')->count(),
                ];
            })
            ->values()
            ->toArray();
    }

    /**
     * Get a single campaign with all relationships
     */
    // public function getCampaign(int $campaignId): Campaign
    // {
    //     return Campaign::with([
    //         'advertiser.user',
    //         'coverageAreas.county',
    //         'coverageAreas.subCounty', 
    //         'coverageAreas.ward',
    //         'riderDemographics',
    //         'currentCost',
    //         'costs' => function ($query) {
    //             $query->orderBy('version', 'desc');
    //         },
    //         'payments.transactions',
    //         'assignments.rider.user',
    //         'assignments.helmet'
    //     ])->findOrFail($campaignId);
    // }
    // public function getCampaignForEdit(int $campaignId): array
    // {
    //     $campaign = $this->getCampaign($campaignId);

    //     // Format rider demographics for the form
    //     $riderDemographics = [
    //         'age_groups' => $campaign->riderDemographics->pluck('age_group')->unique()->values()->toArray(),
    //         'genders' => $campaign->riderDemographics->pluck('gender')->unique()->values()->toArray(),
    //         'rider_types' => $campaign->riderDemographics->pluck('rider_type')->unique()->values()->toArray(),
    //     ];

    //     return [
    //         'campaign' => $campaign,
    //         'coverage_area_ids' => $campaign->coverageAreas->pluck('id')->toArray(),
    //         'rider_demographics' => $riderDemographics,
    //         'cost_breakdown' => $this->getCampaignCostBreakdown($campaign),
    //         'payment_history' => $this->getPaymentHistory($campaign),
    //         'demographics_summary' => $this->getCampaignDemographics($campaign),
    //     ];
    // }
    /**
     * Get campaign for editing with formatted data
     */
    // public function getCampaignForEdit(int $campaignId): array
    // {
    //     $campaign = $this->getCampaign($campaignId);

    //     // Format rider demographics for the form
    //     $riderDemographics = [
    //         'age_groups' => $campaign->riderDemographics->pluck('age_group')->unique()->values()->toArray(),
    //         'genders' => $campaign->riderDemographics->pluck('gender')->unique()->values()->toArray(),
    //         'rider_types' => $campaign->riderDemographics->pluck('rider_type')->unique()->values()->toArray(),
    //     ];

    //     return [
    //         'campaign' => $campaign,
    //         'coverage_area_ids' => $campaign->coverageAreas->pluck('id')->toArray(),
    //         'rider_demographics' => $riderDemographics,
    //         'cost_breakdown' => $this->getCampaignCostBreakdown($campaign),
    //         'payment_history' => $this->getPaymentHistory($campaign),
    //         'demographics_summary' => $this->getCampaignDemographics($campaign),
    //     ];
    // }
}
