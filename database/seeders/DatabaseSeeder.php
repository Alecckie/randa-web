<?php

namespace Database\Seeders;

use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        // User::factory()->create([
        //     'name' => 'admin4',
        //     'email' => 'admin3@gmail.com',
        //     'password' => Hash::make('password')
        // ]);

        //  LocationSeeder::class;
        // $this->call(CoverageAreasSeeder::class);
         $this->call([
            // 1. Reference data (counties/sub-counties/wards must already exist)
            // CoverageAreasSeeder::class,          // existing seeder — your 48 areas
 
            // 2. Users, advertisers, riders
            AdvertiserSeeder::class,
            RiderSeeder::class,
 
            // 3. Helmets
            HelmetSeeder::class,
 
            // 4. Campaigns + assignments
            CampaignSeeder::class,
            CampaignAssignmentSeeder::class,
 
            // 5. GPS history — check-ins, points, area visits
            RiderCheckInSeeder::class,
        ]);
    }
}
