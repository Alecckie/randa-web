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
        // Demo admin account
        User::updateOrCreate(
            ['email' => 'admin@randa.co.ke'],
            [
                'first_name' => 'Admin',
                'last_name'  => 'RANDA',
                'name'       => 'Admin RANDA',
                'email'      => 'admin@randa.co.ke',
                'password'   => Hash::make('password'),
                'role'       => 'admin',
                'is_active'  => true,
                'email_verified_at' => now(),
            ]
        );

        // Demo advertiser account
        $advertiserUser = User::updateOrCreate(
            ['email' => 'advertiser@randa.co.ke'],
            [
                'first_name' => 'Demo',
                'last_name'  => 'Advertiser',
                'name'       => 'Demo Advertiser',
                'email'      => 'advertiser@randa.co.ke',
                'password'   => Hash::make('password'),
                'role'       => 'advertiser',
                'is_active'  => true,
                'email_verified_at' => now(),
            ]
        );

        // Ensure demo advertiser has an advertiser profile
        \App\Models\Advertiser::updateOrCreate(
            ['user_id' => $advertiserUser->id],
            [
                'company_name' => 'Demo Company Ltd.',
                'address'      => 'Nairobi, Kenya',
                'status'       => 'approved',
            ]
        );

        $this->call(KenyaLocationSeeder::class);
        $this->call(CoverageAreasSeeder::class);
        $this->call(TrackingTestSeeder::class);
    }
}
