<?php

namespace Database\Seeders;

use App\Models\Rider;
use App\Models\RiderLocation;
use App\Models\User;
use App\Models\Ward;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class RiderSeeder extends Seeder
{
    public function run(): void
    {
        $riders = [
            [
                'user' => [
                    'name'     => 'Brian Otieno',
                    'email'    => 'brian.otieno@rider.ke',
                    'phone'    => '0722100001',
                    'role'     => 'rider',
                    'is_active'=> true,
                ],
                'rider' => [
                    'national_id'      => '34567891',
                    'mpesa_number'     => '0722100001',
                    'next_of_kin_name' => 'Mary Otieno',
                    'next_of_kin_phone'=> '0733200001',
                    'status'           => 'approved',
                    'daily_rate'       => 70.00,
                    'wallet_balance'   => 1540.00,
                ],
                'location' => ['stage' => 'Westlands Stage', 'county' => 'Nairobi'],
            ],
            [
                'user' => [
                    'name'     => 'Kevin Muthoni',
                    'email'    => 'kevin.muthoni@rider.ke',
                    'phone'    => '0722100002',
                    'role'     => 'rider',
                    'is_active'=> true,
                ],
                'rider' => [
                    'national_id'      => '34567892',
                    'mpesa_number'     => '0722100002',
                    'next_of_kin_name' => 'Anne Muthoni',
                    'next_of_kin_phone'=> '0733200002',
                    'status'           => 'approved',
                    'daily_rate'       => 70.00,
                    'wallet_balance'   => 2100.00,
                ],
                'location' => ['stage' => 'CBD Bus Station', 'county' => 'Nairobi'],
            ],
            [
                'user' => [
                    'name'     => 'Samuel Kiprono',
                    'email'    => 'samuel.kiprono@rider.ke',
                    'phone'    => '0722100003',
                    'role'     => 'rider',
                    'is_active'=> true,
                ],
                'rider' => [
                    'national_id'      => '34567893',
                    'mpesa_number'     => '0722100003',
                    'next_of_kin_name' => 'Susan Kiprono',
                    'next_of_kin_phone'=> '0733200003',
                    'status'           => 'approved',
                    'daily_rate'       => 70.00,
                    'wallet_balance'   => 980.00,
                ],
                'location' => ['stage' => 'Parklands Roundabout', 'county' => 'Nairobi'],
            ],
            [
                'user' => [
                    'name'     => 'Joseph Waweru',
                    'email'    => 'joseph.waweru@rider.ke',
                    'phone'    => '0722100004',
                    'role'     => 'rider',
                    'is_active'=> true,
                ],
                'rider' => [
                    'national_id'      => '34567894',
                    'mpesa_number'     => '0722100004',
                    'next_of_kin_name' => 'Ruth Waweru',
                    'next_of_kin_phone'=> '0733200004',
                    'status'           => 'approved',
                    'daily_rate'       => 70.00,
                    'wallet_balance'   => 3220.00,
                ],
                'location' => ['stage' => 'Ngara Stage', 'county' => 'Nairobi'],
            ],
            [
                'user' => [
                    'name'     => 'Dennis Odhiambo',
                    'email'    => 'dennis.odhiambo@rider.ke',
                    'phone'    => '0722100005',
                    'role'     => 'rider',
                    'is_active'=> true,
                ],
                'rider' => [
                    'national_id'      => '34567895',
                    'mpesa_number'     => '0722100005',
                    'next_of_kin_name' => 'Janet Odhiambo',
                    'next_of_kin_phone'=> '0733200005',
                    'status'           => 'approved',
                    'daily_rate'       => 70.00,
                    'wallet_balance'   => 700.00,
                ],
                'location' => ['stage' => 'Donholm Stage', 'county' => 'Nairobi'],
            ],
            [
                'user' => [
                    'name'     => 'Alex Mutua',
                    'email'    => 'alex.mutua@rider.ke',
                    'phone'    => '0722100006',
                    'role'     => 'rider',
                    'is_active'=> true,
                ],
                'rider' => [
                    'national_id'      => '34567896',
                    'mpesa_number'     => '0722100006',
                    'next_of_kin_name' => 'Lydia Mutua',
                    'next_of_kin_phone'=> '0733200006',
                    'status'           => 'approved',
                    'daily_rate'       => 70.00,
                    'wallet_balance'   => 1890.00,
                ],
                'location' => ['stage' => 'Langata Road Stage', 'county' => 'Nairobi'],
            ],
            [
                'user' => [
                    'name'     => 'Collins Kipchoge',
                    'email'    => 'collins.kipchoge@rider.ke',
                    'phone'    => '0722100007',
                    'role'     => 'rider',
                    'is_active'=> true,
                ],
                'rider' => [
                    'national_id'      => '34567897',
                    'mpesa_number'     => '0722100007',
                    'next_of_kin_name' => 'Esther Kipchoge',
                    'next_of_kin_phone'=> '0733200007',
                    'status'           => 'approved',
                    'daily_rate'       => 70.00,
                    'wallet_balance'   => 2660.00,
                ],
                'location' => ['stage' => 'Embakasi Stage', 'county' => 'Nairobi'],
            ],
            [
                'user' => [
                    'name'     => 'Mercy Wanjiku',
                    'email'    => 'mercy.wanjiku@rider.ke',
                    'phone'    => '0722100008',
                    'role'     => 'rider',
                    'is_active'=> true,
                ],
                'rider' => [
                    'national_id'      => '34567898',
                    'mpesa_number'     => '0722100008',
                    'next_of_kin_name' => 'Peter Wanjiku',
                    'next_of_kin_phone'=> '0733200008',
                    'status'           => 'approved',
                    'daily_rate'       => 70.00,
                    'wallet_balance'   => 1260.00,
                ],
                'location' => ['stage' => 'CBD Kencom Stage', 'county' => 'Nairobi'],
            ],
            [
                'user' => [
                    'name'     => 'Felix Ndungu',
                    'email'    => 'felix.ndungu@rider.ke',
                    'phone'    => '0722100009',
                    'role'     => 'rider',
                    'is_active'=> true,
                ],
                'rider' => [
                    'national_id'      => '34567899',
                    'mpesa_number'     => '0722100009',
                    'next_of_kin_name' => 'Caroline Ndungu',
                    'next_of_kin_phone'=> '0733200009',
                    'status'           => 'approved',
                    'daily_rate'       => 70.00,
                    'wallet_balance'   => 420.00,
                ],
                'location' => ['stage' => 'Karen Hardy Stage', 'county' => 'Nairobi'],
            ],
            [
                'user' => [
                    'name'     => 'Victor Omondi',
                    'email'    => 'victor.omondi@rider.ke',
                    'phone'    => '0722100010',
                    'role'     => 'rider',
                    'is_active'=> true,
                ],
                'rider' => [
                    'national_id'      => '34567900',
                    'mpesa_number'     => '0722100010',
                    'next_of_kin_name' => 'Diana Omondi',
                    'next_of_kin_phone'=> '0733200010',
                    'status'           => 'approved',
                    'daily_rate'       => 70.00,
                    'wallet_balance'   => 3500.00,
                ],
                'location' => ['stage' => 'South B Stage', 'county' => 'Nairobi'],
            ],
        ];

        // Fetch a Nairobi county_id to attach to locations
        $nairobiCountyId  = DB::table('counties')->where('name', 'Nairobi')->value('id');
        $westlandsSubId   = DB::table('sub_counties')->where('name', 'Westlands')->value('id');
        $starehSubId      = DB::table('sub_counties')->where('name', 'Starehe')->value('id');

        foreach ($riders as $index => $data) {
            $user = User::firstOrCreate(
                ['email' => $data['user']['email']],
                array_merge($data['user'], ['password' => Hash::make('password')])
            );

            $rider = Rider::firstOrCreate(
                ['user_id' => $user->id],
                array_merge($data['rider'], [
                    'user_id'                 => $user->id,
                    'location_changes_count'  => 1,
                    'location_last_updated'   => now()->subDays(rand(1, 30)),
                    'signed_agreement'        => true,
                    'national_id_front_photo' => 'riders/sample_id_front.jpg',
                    'national_id_back_photo'  => 'riders/sample_id_back.jpg',
                    'passport_photo'          => 'riders/sample_passport.jpg',
                    'good_conduct_certificate'=> 'riders/sample_conduct.pdf',
                    'motorbike_license'       => 'riders/sample_license.pdf',
                    'motorbike_registration'  => 'riders/sample_registration.pdf',
                ])
            );

            // Create location if not exists
            if (!RiderLocation::where('rider_id', $rider->id)->where('is_current', true)->exists()) {
                $subCountyId = $index % 2 === 0 ? $westlandsSubId : $starehSubId;
                $ward = Ward::where('sub_county_id',$subCountyId)->first();
                $ward_id = $ward?->id ?? 2;

                RiderLocation::create([
                    'rider_id'      => $rider->id,
                    'county_id'     => $nairobiCountyId,
                    'sub_county_id' => $subCountyId,
                    'ward_id'       => $ward_id,
                    'stage_name'    => $data['location']['stage'],
                    'is_current'    => true,
                    'effective_from'=> now()->subDays(30)->toDateString(),
                    'status'        => 'active',
                ]);
            }
        }

        $this->command->info('✅ Riders seeded (10)');
    }
}