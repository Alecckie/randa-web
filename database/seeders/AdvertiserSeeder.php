<?php

namespace Database\Seeders;

use App\Models\Advertiser;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdvertiserSeeder extends Seeder
{
    public function run(): void
    {
        $advertisers = [
            [
                'user' => [
                    'name'     => 'James Mwangi',
                    'email'    => 'james.mwangi@safaricomads.co.ke',
                    'phone'    => '0712345001',
                    'role'     => 'advertiser',
                    'is_active'=> true,
                ],
                'advertiser' => [
                    'company_name'            => 'Safaricom Ads',
                    'business_registration'   => 'BRS/2019/001234',
                    'address'                 => 'Safaricom House, Waiyaki Way, Westlands, Nairobi',
                    'status'                  => 'approved',
                ],
            ],
            [
                'user' => [
                    'name'     => 'Grace Njeri',
                    'email'    => 'grace.njeri@equitybank.co.ke',
                    'phone'    => '0712345002',
                    'role'     => 'advertiser',
                    'is_active'=> true,
                ],
                'advertiser' => [
                    'company_name'            => 'Equity Bank Kenya',
                    'business_registration'   => 'BRS/2005/005678',
                    'address'                 => 'Equity Centre, Hospital Road, Upper Hill, Nairobi',
                    'status'                  => 'approved',
                ],
            ],
            [
                'user' => [
                    'name'     => 'Peter Kamau',
                    'email'    => 'peter.kamau@naivas.co.ke',
                    'phone'    => '0712345003',
                    'role'     => 'advertiser',
                    'is_active'=> true,
                ],
                'advertiser' => [
                    'company_name'            => 'Naivas Supermarket',
                    'business_registration'   => 'BRS/2010/009012',
                    'address'                 => 'Naivas House, Thika Road, Nairobi',
                    'status'                  => 'approved',
                ],
            ],
            [
                'user' => [
                    'name'     => 'Amina Hassan',
                    'email'    => 'amina.hassan@jubileeinsurance.com',
                    'phone'    => '0712345004',
                    'role'     => 'advertiser',
                    'is_active'=> true,
                ],
                'advertiser' => [
                    'company_name'            => 'Jubilee Insurance',
                    'business_registration'   => 'BRS/2001/003456',
                    'address'                 => 'Jubilee Insurance House, Wabera Street, CBD, Nairobi',
                    'status'                  => 'approved',
                ],
            ],
        ];

        foreach ($advertisers as $data) {
            $user = User::firstOrCreate(
                ['email' => $data['user']['email']],
                array_merge($data['user'], [
                    'password' => Hash::make('password'),
                ])
            );

            Advertiser::firstOrCreate(
                ['user_id' => $user->id],
                array_merge($data['advertiser'], ['user_id' => $user->id])
            );
        }

        $this->command->info('✅ Advertisers seeded (4)');
    }
}