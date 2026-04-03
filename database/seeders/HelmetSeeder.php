<?php

namespace Database\Seeders;

use App\Models\Helmet;
use Illuminate\Database\Seeder;

class HelmetSeeder extends Seeder
{
    public function run(): void
    {
        $helmets = [];

        for ($i = 1; $i <= 20; $i++) {
            $code = 'HLM-' . str_pad($i, 4, '0', STR_PAD_LEFT);

            $helmets[] = [
                'helmet_code'     => $code,
                'qr_code'         => 'QR_' . strtoupper($code) . '_' . substr(md5($code), 0, 8),
                'status'          => 'available', // Will be updated by CampaignAssignmentSeeder
                'current_branding'=> null,
                'created_at'      => now()->subDays(rand(30, 90)),
                'updated_at'      => now(),
            ];
        }

        foreach ($helmets as $helmet) {
            Helmet::firstOrCreate(
                ['helmet_code' => $helmet['helmet_code']],
                $helmet
            );
        }

        $this->command->info('✅ Helmets seeded (20)');
    }
}