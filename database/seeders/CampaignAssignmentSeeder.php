<?php

namespace Database\Seeders;

use App\Models\Campaign;
use App\Models\CampaignAssignment;
use App\Models\Helmet;
use App\Models\Rider;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class CampaignAssignmentSeeder extends Seeder
{
    public function run(): void
    {
        $campaigns = Campaign::with('coverageAreas')->get()->keyBy('name');
        $riders    = Rider::with('user')->where('status', 'approved')->get();
        $helmets   = Helmet::where('status', 'available')->orWhere('status', 'assigned')->get();

        if ($riders->count() < 8) {
            $this->command->error('Not enough approved riders. Run RiderSeeder first.');
            return;
        }

        if ($helmets->count() < 15) {
            $this->command->error('Not enough helmets. Run HelmetSeeder first.');
            return;
        }

        /**
         * Assignment map:
         *  Campaign 1 (Safaricom, active)   → Riders 1–5,  Helmets 1–5
         *  Campaign 2 (Equity, completed)   → Riders 6–9,  Helmets 6–9
         *  Campaign 3 (Naivas, active)      → Riders 1,3,6–9,10, Helmets 10–15
         *
         * Riders 1 and 3 appear in two campaigns to test multi-campaign visit data.
         */

        $safaricom = $campaigns->get('Safaricom M-PESA Awareness Drive');
        $equity    = $campaigns->get('Equity Bank EazzyApp Campaign');
        $naivas    = $campaigns->get('Naivas Fresh Deals Campaign');

        $helmetList = $helmets->values();
        $riderList  = $riders->values();

        $assignments = [
            // ── Safaricom (active) ──────────────────────────────────────────
            ['campaign' => $safaricom, 'rider_idx' => 0, 'helmet_idx' => 0, 'status' => 'active',    'days_ago' => 20],
            ['campaign' => $safaricom, 'rider_idx' => 1, 'helmet_idx' => 1, 'status' => 'active',    'days_ago' => 20],
            ['campaign' => $safaricom, 'rider_idx' => 2, 'helmet_idx' => 2, 'status' => 'active',    'days_ago' => 20],
            ['campaign' => $safaricom, 'rider_idx' => 3, 'helmet_idx' => 3, 'status' => 'active',    'days_ago' => 20],
            ['campaign' => $safaricom, 'rider_idx' => 4, 'helmet_idx' => 4, 'status' => 'active',    'days_ago' => 20],

            // ── Equity Bank (completed) ────────────────────────────────────
            ['campaign' => $equity,    'rider_idx' => 5, 'helmet_idx' => 5, 'status' => 'completed', 'days_ago' => 60],
            ['campaign' => $equity,    'rider_idx' => 6, 'helmet_idx' => 6, 'status' => 'completed', 'days_ago' => 60],
            ['campaign' => $equity,    'rider_idx' => 7, 'helmet_idx' => 7, 'status' => 'completed', 'days_ago' => 60],
            ['campaign' => $equity,    'rider_idx' => 8, 'helmet_idx' => 8, 'status' => 'completed', 'days_ago' => 60],

            // ── Naivas (active) — note riders 0 & 2 are shared ────────────
            ['campaign' => $naivas,    'rider_idx' => 0, 'helmet_idx' => 9,  'status' => 'active',   'days_ago' => 10],
            ['campaign' => $naivas,    'rider_idx' => 2, 'helmet_idx' => 10, 'status' => 'active',   'days_ago' => 10],
            ['campaign' => $naivas,    'rider_idx' => 5, 'helmet_idx' => 11, 'status' => 'active',   'days_ago' => 10],
            ['campaign' => $naivas,    'rider_idx' => 6, 'helmet_idx' => 12, 'status' => 'active',   'days_ago' => 10],
            ['campaign' => $naivas,    'rider_idx' => 7, 'helmet_idx' => 13, 'status' => 'active',   'days_ago' => 10],
            ['campaign' => $naivas,    'rider_idx' => 9, 'helmet_idx' => 14, 'status' => 'active',   'days_ago' => 10],
        ];

        foreach ($assignments as $a) {
            if (! $a['campaign']) continue;

            $rider  = $riderList->get($a['rider_idx']);
            $helmet = $helmetList->get($a['helmet_idx']);

            if (! $rider || ! $helmet) continue;

            // Avoid duplicate active assignments per campaign+rider
            $existing = CampaignAssignment::where('campaign_id', $a['campaign']->id)
                ->where('rider_id', $rider->id)
                ->first();

            if ($existing) continue;

            $assignedAt   = Carbon::now()->subDays($a['days_ago']);
            $completedAt  = $a['status'] === 'completed'
                ? Carbon::now()->subDays(5)
                : null;

            CampaignAssignment::create([
                'campaign_id'   => $a['campaign']->id,
                'rider_id'      => $rider->id,
                'helmet_id'     => $helmet->id,
                // 'advertiser_id' => $a['campaign']->advertiser_id,
                'assigned_at'   => $assignedAt,
                'completed_at'  => $completedAt,
                'status'        => $a['status'],
            ]);

            // Sync helmet status
            $helmetStatus = $a['status'] === 'active' ? 'assigned' : 'available';
            $helmet->update(['status' => $helmetStatus]);
        }

        $this->command->info('✅ Campaign assignments seeded (15)');
    }
}