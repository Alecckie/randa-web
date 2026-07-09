<?php

namespace App\Console\Commands;

use App\Models\Campaign;
use App\Models\CampaignStatusHistory;
use App\Services\CampaignService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class CompleteExpiredCampaigns extends Command
{
    protected $signature = 'campaigns:complete-expired';
    protected $description = 'Mark active campaigns whose end date has passed as completed';

    public function handle(CampaignService $campaignService): int
    {
        $campaigns = Campaign::where('status', 'active')
            ->whereDate('end_date', '<', now())
            ->get();

        if ($campaigns->isEmpty()) {
            $this->info('No expired active campaigns found.');
            return Command::SUCCESS;
        }

        foreach ($campaigns as $campaign) {
            try {
                $campaignService->updateCampaignStatus($campaign, 'completed');

                CampaignStatusHistory::create([
                    'campaign_id' => $campaign->id,
                    'user_id' => null,
                    'old_status' => 'active',
                    'new_status' => 'completed',
                    'notes' => 'Auto-completed: campaign end date reached',
                ]);

                $this->info("Campaign #{$campaign->id} marked as completed.");
            } catch (\Exception $e) {
                Log::error('Failed to auto-complete campaign', [
                    'campaign_id' => $campaign->id,
                    'error' => $e->getMessage(),
                ]);
                $this->error("Campaign #{$campaign->id} could not be auto-completed: {$e->getMessage()}");
            }
        }

        return Command::SUCCESS;
    }
}
