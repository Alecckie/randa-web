<?php

namespace App\Services;

use App\Models\Campaign;
use App\Models\Advertiser;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;

class CampaignService
{
    /**
     * Get campaigns with filters and pagination
     */
    public function getCampaigns(array $filters = []): LengthAwarePaginator
    {
        $query = Campaign::with(['advertiser.user'])
            ->when($filters['search'] ?? null, function (Builder $query, string $search) {
                $query->where(function (Builder $subQuery) use ($search) {
                    $subQuery->where('name', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%")
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
            ->orderBy('created_at', 'desc');

        return $query->paginate(15);
    }

    /**
     * Create a new campaign
     */
    public function createCampaign(array $data): Campaign
    {
        return Campaign::create([
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'start_date' => $data['start_date'],
            'end_date' => $data['end_date'],
            'coverage_areas' => $data['coverage_areas'],
            'helmet_count' => $data['helmet_count'],
            'budget' => $data['budget'],
            'status' => $data['status'] ?? 'draft',
        ]);
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
            'completed_campaigns' => Campaign::where('status', 'completed')->count(),
            'total_budget' => Campaign::sum('budget'),
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
     * Validate campaign dates
     */
    public function validateCampaignDates(string $startDate, string $endDate): bool
    {
        return strtotime($startDate) <= strtotime($endDate);
    }

    /**
     * Get available coverage areas (this would typically come from a config or database)
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
}