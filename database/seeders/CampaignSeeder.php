<?php

namespace Database\Seeders;

use App\Models\Advertiser;
use App\Models\Campaign;
use App\Models\CampaignCost;
use App\Models\CoverageArea;
use Illuminate\Database\Seeder;

class CampaignSeeder extends Seeder
{
    public function run(): void
    {
        $advertisers = Advertiser::with('user')->get()->keyBy('company_name');

        if ($advertisers->isEmpty()) {
            $this->command->error('No advertisers found. Run AdvertiserSeeder first.');
            return;
        }

        // Fetch coverage area IDs for Nairobi areas that have geometry
        $nairobiAreas = CoverageArea::whereIn('name', [
            'Westlands', 'Nairobi CBD', 'Parklands', 'Ngara',
            'Donholm', 'Langata', 'South B', 'Embakasi', 'Karen',
        ])->pluck('id', 'name');

        $campaigns = [
            // ── Campaign 1: Safaricom — 30-day active campaign ──────────────────
            [
                'data' => [
                    'name'                => 'Safaricom M-PESA Awareness Drive',
                    'description'         => 'Promoting M-PESA mobile money services across Nairobi with branded helmet advertising.',
                    'start_date'          => now()->subDays(20)->toDateString(),
                    'end_date'            => now()->addDays(10)->toDateString(),
                    'helmet_count'        => 5,
                    'need_design'         => false,
                    'business_type'       => 'Telecommunications',
                    'require_vat_receipt' => true,
                    'agree_to_terms'      => true,
                    'status'              => 'active',
                    'special_instructions'=> 'Riders must maintain helmet cleanliness. Branding should be visible at all times.',
                ],
                'advertiser'    => 'Safaricom Ads',
                'coverage_areas'=> ['Westlands', 'Nairobi CBD', 'Parklands', 'Ngara'],
            ],

            // ── Campaign 2: Equity Bank — completed campaign ────────────────────
            [
                'data' => [
                    'name'                => 'Equity Bank EazzyApp Campaign',
                    'description'         => 'Raising awareness for Equity Bank\'s EazzyApp mobile banking across key Nairobi zones.',
                    'start_date'          => now()->subDays(60)->toDateString(),
                    'end_date'            => now()->subDays(5)->toDateString(),
                    'helmet_count'        => 4,
                    'need_design'         => true,
                    'design_requirements' => 'Use Equity Bank blue (#0066CC) and green (#00A651). Logo must be centered.',
                    'business_type'       => 'Banking & Finance',
                    'require_vat_receipt' => true,
                    'agree_to_terms'      => true,
                    'status'              => 'completed',
                    'special_instructions'=> 'Prioritise high-traffic routes near bank branches.',
                ],
                'advertiser'    => 'Equity Bank Kenya',
                'coverage_areas'=> ['Nairobi CBD', 'Donholm', 'Langata', 'South B'],
            ],

            // ── Campaign 3: Naivas — active campaign ────────────────────────────
            [
                'data' => [
                    'name'                => 'Naivas Fresh Deals Campaign',
                    'description'         => 'Promoting weekly fresh produce deals at Naivas supermarkets across Nairobi.',
                    'start_date'          => now()->subDays(10)->toDateString(),
                    'end_date'            => now()->addDays(20)->toDateString(),
                    'helmet_count'        => 6,
                    'need_design'         => false,
                    'business_type'       => 'Retail & Supermarket',
                    'require_vat_receipt' => false,
                    'agree_to_terms'      => true,
                    'status'              => 'active',
                    'special_instructions'=> 'Ensure coverage near Naivas branches. Westlands and Karen are priority.',
                ],
                'advertiser'    => 'Naivas Supermarket',
                'coverage_areas'=> ['Westlands', 'Karen', 'Embakasi', 'Parklands', 'Langata'],
            ],
        ];

        foreach ($campaigns as $campaignData) {
            $advertiser = $advertisers->get($campaignData['advertiser']);

            if (! $advertiser) {
                $this->command->warn("Advertiser not found: {$campaignData['advertiser']}");
                continue;
            }

            $campaign = Campaign::firstOrCreate(
                [
                    'name'          => $campaignData['data']['name'],
                    'advertiser_id' => $advertiser->id,
                ],
                array_merge($campaignData['data'], ['advertiser_id' => $advertiser->id])
            );

            // Attach coverage areas
            $areaIds = collect($campaignData['coverage_areas'])
                ->map(fn ($name) => $nairobiAreas->get($name))
                ->filter()
                ->values()
                ->toArray();

            $campaign->coverageAreas()->sync($areaIds);

            // Create campaign cost if missing
            if (! $campaign->costs()->exists()) {
                $helmetCount  = $campaign->helmet_count;
                $durationDays = $campaign->start_date->diffInDays($campaign->end_date) + 1;
                $baseCost     = $helmetCount * $durationDays * 1.00;
                $vatRate      = $campaign->require_vat_receipt ? 16.00 : 0.00;
                $vatAmount    = round($baseCost * ($vatRate / 100), 2);

                CampaignCost::create([
                    'campaign_id'       => $campaign->id,
                    'helmet_count'      => $helmetCount,
                    'duration_days'     => $durationDays,
                    'helmet_daily_rate' => 1.00,
                    'base_cost'         => $baseCost,
                    'includes_design'   => $campaign->need_design,
                    'design_cost'       => $campaign->need_design ? 5000.00 : 0.00,
                    'subtotal'          => $baseCost + ($campaign->need_design ? 5000.00 : 0.00),
                    'vat_rate'          => $vatRate,
                    'vat_amount'        => $vatAmount,
                    'total_cost'        => $baseCost + ($campaign->need_design ? 5000.00 : 0.00) + $vatAmount,
                    'status'            => 'confirmed',
                    'version'           => 1,
                ]);
            }
        }

        $this->command->info('✅ Campaigns seeded (3)');
    }
}