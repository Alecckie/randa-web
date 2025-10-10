<?php

// app/Services/CampaignAssignmentService.php

namespace App\Services;

use App\Models\Campaign;
use App\Models\CampaignAssignment;
use App\Models\Rider;
use App\Models\Helmet;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class CampaignAssignmentService
{
    /**
     * Get available riders for a campaign based on demographics
     */
    public function getAvailableRiders(Campaign $campaign): \Illuminate\Database\Eloquent\Collection
    {
        $demographics = $campaign->riderDemographics;
        
        $query = Rider::with('user')
            ->where('status', 'approved')
            ->whereDoesntHave('assignments', function ($q) use ($campaign) {
                $q->where('campaign_id', $campaign->id)
                  ->where('status', 'active');
            });

        if ($demographics->count() > 0) {
            $ageGroups = $demographics->pluck('age_group')->unique()->toArray();
            $genders = $demographics->pluck('gender')->unique()->toArray();
            $riderTypes = $demographics->pluck('rider_type')->unique()->toArray();

            if (!in_array('any', $ageGroups)) {
            }
            
            if (!in_array('any', $genders)) {
            }
            
            if (!in_array('any', $riderTypes)) {
            }
        }

        return $query->get();
    }

   
    public function getAvailableHelmets(): \Illuminate\Database\Eloquent\Collection
    {
        return Helmet::whereDoesntHave('assignments', function ($q) {
            $q->where('status', 'active');
        })
        ->where('status', 'available') 
        ->orderBy('helmet_code')
        ->get();
    }

    /**
     * Assign a rider to a campaign
     */
    public function assignRider(Campaign $campaign, int $riderId, int $helmetId): CampaignAssignment
    {
        return DB::transaction(function () use ($campaign, $riderId, $helmetId) {
            
            Rider::where('id', $riderId)
                ->where('status', 'approved')
                ->firstOrFail();

            Helmet::findOrFail($helmetId);

            $existingAssignment = CampaignAssignment::where('campaign_id', $campaign->id)
                ->where('rider_id', $riderId)
                ->where('status', 'active')
                ->first();

            if ($existingAssignment) {
                throw new \Exception('Rider is already assigned to this campaign.');
            }

            $helmetAssigned = CampaignAssignment::where('helmet_id', $helmetId)
                ->where('status', 'active')
                ->first();

            if ($helmetAssigned) {
                throw new \Exception('Helmet is already assigned to another campaign.');
            }

            $activeAssignments = $campaign->assignments()
                ->where('status', 'active')
                ->count();

            if ($activeAssignments >= $campaign->helmet_count) {
                throw new \Exception('Campaign has reached maximum helmet count.');
            }

            $assignment = CampaignAssignment::create([
                'campaign_id' => $campaign->id,
                'rider_id' => $riderId,
                'helmet_id' => $helmetId,
                'advertiser_id' => $campaign->advertiser_id,
                'assigned_at' => Carbon::now(),
                'status' => 'active',
            ]);

            // Update helmet status if you have a status column
            // $helmet->update(['status' => 'assigned']);

            return $assignment->load(['rider.user', 'helmet']);
        });
    }

    /**
     * Assign multiple riders to a campaign
     */
    public function assignMultipleRiders(
        Campaign $campaign, 
        array $riderIds, 
        array $helmetIds
    ): array {
        $assignments = [];
        $errors = [];

        DB::beginTransaction();
        
        try {
            foreach ($riderIds as $index => $riderId) {
                $helmetId = $helmetIds[$index] ?? null;
                
                if (!$helmetId) {
                    $errors[] = "No helmet specified for rider ID: {$riderId}";
                    continue;
                }

                try {
                    $assignments[] = $this->assignRider($campaign, $riderId, $helmetId);
                } catch (\Exception $e) {
                    $errors[] = "Failed to assign rider ID {$riderId}: " . $e->getMessage();
                }
            }

            if (empty($assignments)) {
                DB::rollBack();
                throw new \Exception('No riders were assigned. Errors: ' . implode(', ', $errors));
            }

            DB::commit();
            
            return [
                'success' => true,
                'assignments' => $assignments,
                'errors' => $errors,
            ];
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Remove a rider assignment
     */
    public function removeAssignment(CampaignAssignment $assignment): bool
    {
        return DB::transaction(function () use ($assignment) {
            // Update helmet status back to available if you have status column
            // $assignment->helmet->update(['status' => 'available']);

            // Update assignment status
            $assignment->update([
                'status' => 'cancelled',
                'completed_at' => Carbon::now(),
            ]);

            return true;
        });
    }

    /**
     * Complete a rider assignment
     */
    public function completeAssignment(CampaignAssignment $assignment): bool
    {
        return DB::transaction(function () use ($assignment) {
            $assignment->update([
                'status' => 'completed',
                'completed_at' => Carbon::now(),
            ]);

            // Update helmet status back to available
            // $assignment->helmet->update(['status' => 'available']);

            return true;
        });
    }

    /**
     * Get assignment statistics for a campaign
     */
    public function getAssignmentStats(Campaign $campaign): array
    {
        $assignments = $campaign->assignments;

        return [
            'total_assigned' => $assignments->where('status', 'active')->count(),
            'total_completed' => $assignments->where('status', 'completed')->count(),
            'total_cancelled' => $assignments->where('status', 'cancelled')->count(),
            'available_slots' => $campaign->helmet_count - $assignments->where('status', 'active')->count(),
            'assignment_percentage' => ($assignments->where('status', 'active')->count() / $campaign->helmet_count) * 100,
        ];
    }

    /**
     * Validate rider eligibility for campaign
     */
    public function isRiderEligible(Campaign $campaign, Rider $rider): bool
    {
        // Check if rider is approved
        if ($rider->status !== 'approved') {
            return false;
        }

        // Check if rider is already assigned to this campaign
        $existingAssignment = CampaignAssignment::where('campaign_id', $campaign->id)
            ->where('rider_id', $rider->id)
            ->where('status', 'active')
            ->exists();

        if ($existingAssignment) {
            return false;
        }

        // Add more eligibility checks based on demographics, location, etc.
        
        return true;
    }

    /**
     * Get campaigns for a specific rider
     */
    public function getRiderCampaigns(Rider $rider): \Illuminate\Database\Eloquent\Collection
    {
        return Campaign::whereHas('assignments', function ($q) use ($rider) {
            $q->where('rider_id', $rider->id);
        })
        ->with(['advertiser', 'currentCost', 'assignments' => function ($q) use ($rider) {
            $q->where('rider_id', $rider->id);
        }])
        ->get();
    }

    /**
     * Bulk assign riders based on campaign criteria
     */
    public function autoAssignRiders(Campaign $campaign, int $count): array
    {
        $availableRiders = $this->getAvailableRiders($campaign)->take($count);
        $availableHelmets = $this->getAvailableHelmets()->take($count);

        if ($availableRiders->count() < $count) {
            throw new \Exception("Not enough available riders. Found: {$availableRiders->count()}, Required: {$count}");
        }

        if ($availableHelmets->count() < $count) {
            throw new \Exception("Not enough available helmets. Found: {$availableHelmets->count()}, Required: {$count}");
        }

        $riderIds = $availableRiders->pluck('id')->toArray();
        $helmetIds = $availableHelmets->pluck('id')->toArray();

        return $this->assignMultipleRiders($campaign, $riderIds, $helmetIds);
    }
}