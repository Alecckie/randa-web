<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;

/**
 * TrackingTestSeeder
 *
 * Creates a self-contained, end-to-end dataset for testing the live heatmap
 * and rider tracking features.  Everything needed is created here — no
 * pre-existing rows required.
 *
 * What gets created
 * ─────────────────
 *  • 1 admin user
 *  • 1 advertiser user + advertiser profile (approved)
 *  • 1 active campaign owned by that advertiser
 *  • 8 rider users + rider profiles (approved)
 *  • 8 helmets (one per rider)
 *  • 8 campaign_assignments (one per rider → campaign)
 *  • For each rider × 4 days (3 past + today):
 *      – rider_check_ins   (status: started / ended)
 *      – rider_gps_points  (every 30 s along a Nairobi corridor)
 *      – rider_routes      (summary row)
 *
 * Login credentials
 * ─────────────────
 *  admin      admin@randa.test   / password
 *  advertiser advert@randa.test  / password
 *  riders     rider1@randa.test … rider8@randa.test / password
 */
class TrackingTestSeeder extends Seeder
{
    // ── Nairobi corridors ─────────────────────────────────────────────────────
    // Real road paths used to generate realistic GPS traces.

    private array $corridors = [
        'cbd_westlands' => [
            'name'      => 'CBD → Westlands',
            'waypoints' => [
                [-1.2841, 36.8155], // Kencom / City Hall Way
                [-1.2821, 36.8120], // University Way
                [-1.2795, 36.8072], // Museum Hill roundabout
                [-1.2724, 36.8050], // Chiromo Road
                [-1.2686, 36.8118], // Westlands roundabout
                [-1.2649, 36.8030], // Sarit Centre
            ],
        ],
        'cbd_upperhill' => [
            'name'      => 'CBD → Upper Hill',
            'waypoints' => [
                [-1.2864, 36.8216], // Railways / Haile Selassie
                [-1.2900, 36.8185], // Nyerere Road
                [-1.2942, 36.8170], // Upper Hill Road
                [-1.2988, 36.8148], // Hospital Hill
                [-1.3021, 36.8109], // Ngong Road junction
            ],
        ],
        'cbd_eastleigh' => [
            'name'      => 'CBD → Eastleigh',
            'waypoints' => [
                [-1.2841, 36.8230], // Tom Mboya Street
                [-1.2820, 36.8290], // Ronald Ngala Street
                [-1.2795, 36.8350], // Juja Road
                [-1.2760, 36.8410], // Eastleigh 1st Avenue
                [-1.2730, 36.8480], // Eastleigh Section III
            ],
        ],
        'ngong_road' => [
            'name'      => 'Ngong Road',
            'waypoints' => [
                [-1.2975, 36.7800], // Dagoretti Corner
                [-1.2998, 36.7870], // Kilimani junction
                [-1.3021, 36.7940], // Yaya Centre
                [-1.3044, 36.8010], // Adams Arcade
                [-1.3060, 36.8070], // Prestige Plaza
                [-1.3080, 36.8110], // NHIF Building
            ],
        ],
        'thika_road' => [
            'name'      => 'Thika Road',
            'waypoints' => [
                [-1.2619, 36.8360], // Pangani
                [-1.2540, 36.8410], // Muthaiga roundabout
                [-1.2460, 36.8460], // Garden City Mall
                [-1.2360, 36.8520], // Roysambu
                [-1.2250, 36.8580], // Kahawa West
            ],
        ],
        'mombasa_road' => [
            'name'      => 'Mombasa Road',
            'waypoints' => [
                [-1.3100, 36.8250], // Wilson Airport
                [-1.3180, 36.8200], // South C
                [-1.3260, 36.8150], // Nyayo Stadium
                [-1.3340, 36.8100], // Syokimau junction
                [-1.3420, 36.8050], // JKIA approach
            ],
        ],
        'kiambu_road' => [
            'name'      => 'Kiambu Road',
            'waypoints' => [
                [-1.2500, 36.8050], // Parklands
                [-1.2420, 36.8000], // Karura Forest gate
                [-1.2310, 36.8020], // Kiambu Road / Runda
                [-1.2180, 36.8050], // Kiambu town approach
            ],
        ],
        'langata_road' => [
            'name'      => 'Langata Road',
            'waypoints' => [
                [-1.3050, 36.7950], // Galleria Mall area
                [-1.3120, 36.7880], // Karen Hospital
                [-1.3200, 36.7810], // Karen shopping centre
                [-1.3290, 36.7730], // Hardy roundabout
                [-1.3380, 36.7660], // Ngong town direction
            ],
        ],
    ];

    // ── Rider profiles (name, email, corridor key) ────────────────────────────

    private array $riderProfiles = [
        ['name' => 'James Mwangi',    'corridor' => 'cbd_westlands'],
        ['name' => 'Grace Wanjiku',   'corridor' => 'cbd_upperhill'],
        ['name' => 'Peter Otieno',    'corridor' => 'cbd_eastleigh'],
        ['name' => 'Mary Njoroge',    'corridor' => 'ngong_road'],
        ['name' => 'Samuel Kiprono',  'corridor' => 'thika_road'],
        ['name' => 'Faith Akinyi',    'corridor' => 'mombasa_road'],
        ['name' => 'David Kamau',     'corridor' => 'kiambu_road'],
        ['name' => 'Esther Mutua',    'corridor' => 'langata_road'],
    ];

    // ─────────────────────────────────────────────────────────────────────────

    public function run(): void
    {
        $this->command->info('');
        $this->command->info('TrackingTestSeeder — creating test dataset...');

        DB::statement('SET FOREIGN_KEY_CHECKS=0');

        // Wipe previous seed data so this seeder is safely re-runnable
        $this->truncateSeedTables();

        // ── 1. Admin ─────────────────────────────────────────────────────────
        $adminId = DB::table('users')->insertGetId([
            'name'              => 'Admin User',
            'first_name'        => 'Admin',
            'last_name'         => 'User',
            'email'             => 'admin@randa.test',
            'password'          => Hash::make('password'),
            'role'              => 'admin',
            'phone'             => '0700000001',
            'email_verified_at' => now(),
            'is_active'         => true,
            'created_at'        => now(),
            'updated_at'        => now(),
        ]);
        $this->command->line("  ✓ Admin user created  (admin@randa.test / password)");

        // ── 2. Advertiser ─────────────────────────────────────────────────────
        $advertiserUserId = DB::table('users')->insertGetId([
            'name'              => 'Randa Brands Ltd',
            'first_name'        => 'Randa',
            'last_name'         => 'Brands',
            'email'             => 'advert@randa.test',
            'password'          => Hash::make('password'),
            'role'              => 'advertiser',
            'phone'             => '0700000002',
            'email_verified_at' => now(),
            'is_active'         => true,
            'created_at'        => now(),
            'updated_at'        => now(),
        ]);

        $advertiserId = DB::table('advertisers')->insertGetId([
            'user_id'               => $advertiserUserId,
            'company_name'          => 'Randa Brands Ltd',
            'business_registration' => 'BRN-2024-001',
            'address'               => 'Westlands, Nairobi',
            'status'                => 'approved',
            'created_at'            => now(),
            'updated_at'            => now(),
        ]);
        $this->command->line("  ✓ Advertiser created   (advert@randa.test / password)");

        // ── 3. Campaign ───────────────────────────────────────────────────────
        $campaignId = DB::table('campaigns')->insertGetId([
            'advertiser_id'      => $advertiserId,
            'name'               => 'Nairobi City Brand Blitz',
            'description'        => 'Test campaign covering all major Nairobi corridors.',
            'start_date'         => Carbon::today()->subDays(30)->toDateString(),
            'end_date'           => Carbon::today()->addDays(30)->toDateString(),
            'helmet_count'       => count($this->riderProfiles),
            'need_design'        => false,
            'business_type'      => 'FMCG',
            'require_vat_receipt' => false,
            'agree_to_terms'     => true,
            'status'             => 'active',
            'created_at'         => now(),
            'updated_at'         => now(),
        ]);
        $this->command->line("  ✓ Campaign created     (ID {$campaignId})");

        // ── 4. Riders + Helmets + Assignments ─────────────────────────────────
        $assignments = []; // ['rider_id' => ..., 'assignment_id' => ..., 'corridor' => ...]

        foreach ($this->riderProfiles as $index => $profile) {
            $num   = $index + 1;
            $email = "rider{$num}@randa.test";
            $phone = "07011" . str_pad($num, 5, '0', STR_PAD_LEFT);

            // User
            $userId = DB::table('users')->insertGetId([
                'name'              => $profile['name'],
                'first_name'        => explode(' ', $profile['name'])[0],
                'last_name'         => explode(' ', $profile['name'])[1] ?? '',
                'email'             => $email,
                'password'          => Hash::make('password'),
                'role'              => 'rider',
                'phone'             => $phone,
                'email_verified_at' => now(),
                'is_active'         => true,
                'created_at'        => now(),
                'updated_at'        => now(),
            ]);

            // Rider profile
            $riderId = DB::table('riders')->insertGetId([
                'user_id'                 => $userId,
                'national_id'             => '3' . str_pad($num * 1000000, 7, '0', STR_PAD_LEFT),
                'national_id_front_photo' => 'seeded/id_front.jpg',
                'national_id_back_photo'  => 'seeded/id_back.jpg',
                'passport_photo'          => 'seeded/passport.jpg',
                'good_conduct_certificate' => 'seeded/goc.pdf',
                'motorbike_license'       => 'seeded/license.pdf',
                'motorbike_registration'  => 'KAA ' . str_pad($num * 111, 4, '0', STR_PAD_LEFT) . 'Z',
                'mpesa_number'            => $phone,
                'next_of_kin_name'        => 'Kin of ' . $profile['name'],
                'next_of_kin_phone'       => '07099' . str_pad($num, 5, '0', STR_PAD_LEFT),
                'signed_agreement'        => 'seeded/agreement.pdf',
                'status'                  => 'approved',
                'daily_rate'              => 70.00,
                'wallet_balance'          => rand(500, 5000) / 100 * 100,
                'created_at'              => now(),
                'updated_at'              => now(),
            ]);

            // Helmet
            $helmetId = DB::table('helmets')->insertGetId([
                'helmet_code'     => 'HLM-' . str_pad($num, 4, '0', STR_PAD_LEFT),
                'qr_code'         => 'QR-' . strtoupper(substr(md5($riderId), 0, 8)),
                'status'          => 'assigned',
                'current_branding' => 'Nairobi City Brand Blitz',
                'created_at'      => now(),
                'updated_at'      => now(),
            ]);

            // Campaign assignment
            $assignmentId = DB::table('campaign_assignments')->insertGetId([
                'campaign_id'  => $campaignId,
                'rider_id'     => $riderId,
                'helmet_id'    => $helmetId,
                'tracking_tag' => 'TRK-' . strtoupper(substr(md5($riderId . $campaignId), 0, 10)),
                'assigned_at'  => Carbon::today()->subDays(30)->toDateTimeString(),
                'status'       => 'active',
                'created_at'   => now(),
                'updated_at'   => now(),
            ]);

            $assignments[] = [
                'rider_id'      => $riderId,
                'assignment_id' => $assignmentId,
                'corridor'      => $profile['corridor'],
                'name'          => $profile['name'],
                'email'         => $email,
            ];
        }

        $this->command->line("  ✓ " . count($assignments) . " riders + helmets + assignments created");

        // ── 5. Tracking data (3 past days + today) ────────────────────────────
        $dates = [
            Carbon::today()->subDays(3),
            Carbon::today()->subDays(2),
            Carbon::today()->subDays(1),
            Carbon::today(),
        ];

        $totalGpsPoints = 0;

        foreach ($assignments as $assignment) {
            foreach ($dates as $date) {
                $count = $this->seedRiderDay($assignment, $date);
                $totalGpsPoints += $count;
            }
        }

        DB::statement('SET FOREIGN_KEY_CHECKS=1');

        // ── Summary ───────────────────────────────────────────────────────────
        $this->command->info('');
        $this->command->info('  Dataset ready:');
        $this->command->table(
            ['Table', 'Rows'],
            [
                ['users',                   DB::table('users')->count()],
                ['advertisers',             DB::table('advertisers')->count()],
                ['campaigns',               DB::table('campaigns')->count()],
                ['riders',                  DB::table('riders')->count()],
                ['helmets',                 DB::table('helmets')->count()],
                ['campaign_assignments',    DB::table('campaign_assignments')->count()],
                ['rider_check_ins',         DB::table('rider_check_ins')->count()],
                ['rider_routes',            DB::table('rider_routes')->count()],
                ['rider_gps_points',        DB::table('rider_gps_points')->count()],
            ]
        );
        $this->command->info('');
        $this->command->info('  Login credentials (password: password)');
        $this->command->info('    Admin      → admin@randa.test');
        $this->command->info('    Advertiser → advert@randa.test');
        $this->command->info('    Riders     → rider1@randa.test … rider8@randa.test');
        $this->command->info('');
    }

    // ── Per-rider, per-day logic ──────────────────────────────────────────────

    private function seedRiderDay(array $assignment, Carbon $date): int
    {
        $riderId      = $assignment['rider_id'];
        $assignmentId = $assignment['assignment_id'];
        $corridor     = $this->corridors[$assignment['corridor']];
        $isToday      = $date->isToday();

        // Work hours: check-in 07:00–08:30, work 6–10 hours
        $checkInTime  = $date->copy()->setHour(rand(7, 8))->setMinute(rand(0, 30))->setSecond(0);
        $workMinutes  = rand(360, 600);
        $checkOutTime = $checkInTime->copy()->addMinutes($workMinutes);

        $startWp = $corridor['waypoints'][0];
        $endWp   = end($corridor['waypoints']);

        // ── Check-in ──────────────────────────────────────────────────────────
        // Status enum is: started | paused | resumed | ended
        // For today keep it 'started' so the tracking service sees an active check-in.
        $checkInId = DB::table('rider_check_ins')->insertGetId([
            'rider_id'               => $riderId,
            'campaign_assignment_id' => $assignmentId,
            'check_in_date'          => $date->toDateString(),
            'check_in_time'          => $checkInTime->toDateTimeString(),
            'check_out_time'         => $isToday ? null : $checkOutTime->toDateTimeString(),
            'daily_earning'          => round(rand(80, 150) * 10) / 10,
            'status'                 => $isToday ? 'started' : 'ended',
            'check_in_latitude'      => round($startWp[0] + $this->jitter(0.0005), 8),
            'check_in_longitude'     => round($startWp[1] + $this->jitter(0.0005), 8),
            'check_out_latitude'     => $isToday ? null : round($endWp[0] + $this->jitter(0.0005), 8),
            'check_out_longitude'    => $isToday ? null : round($endWp[1] + $this->jitter(0.0005), 8),
            'created_at'             => $checkInTime->toDateTimeString(),
            'updated_at'             => ($isToday ? $checkInTime : $checkOutTime)->toDateTimeString(),
        ]);

        // ── GPS points ────────────────────────────────────────────────────────
        [
            'gpsRows'        => $gpsRows,
            'totalDistance'  => $totalDistance,
            'avgSpeed'       => $avgSpeed,
            'maxSpeed'       => $maxSpeed,
            'pauseHistory'   => $pauseHistory,
            'totalPauseMins' => $totalPauseMins,
        ] = $this->buildGpsPoints(
            riderId:      $riderId,
            checkInId:    $checkInId,
            assignmentId: $assignmentId,
            corridor:     $corridor,
            startTime:    $checkInTime,
            endTime:      $checkOutTime,
        );

        foreach (array_chunk($gpsRows, 300) as $chunk) {
            DB::table('rider_gps_points')->insert($chunk);
        }

        $pointCount = count($gpsRows);

        // ── Route summary ─────────────────────────────────────────────────────
        DB::table('rider_routes')->insert([
            'rider_id'               => $riderId,
            'check_in_id'            => $checkInId,
            'campaign_assignment_id' => $assignmentId,
            'route_date'             => $date->toDateString(),
            'started_at'             => $checkInTime->toDateTimeString(),
            'ended_at'               => $isToday ? null : $checkOutTime->toDateTimeString(),
            'total_pause_duration'   => $totalPauseMins,
            'pause_count'            => count($pauseHistory),
            'total_distance'         => round($totalDistance, 2),
            'total_duration'         => $workMinutes - $totalPauseMins,
            'location_points_count'  => $pointCount,
            'avg_speed'              => round($avgSpeed, 2),
            'max_speed'              => round($maxSpeed, 2),
            'statistics'             => json_encode([
                'corridor'          => $corridor['name'],
                'total_waypoints'   => count($corridor['waypoints']),
                'effective_minutes' => $workMinutes - $totalPauseMins,
            ]),
            'metadata'               => json_encode(['seeded' => true]),
            'created_at'             => $checkInTime->toDateTimeString(),
            'updated_at'             => ($isToday ? now() : $checkOutTime)->toDateTimeString(),
        ]);

        return $pointCount;
    }

    // ── GPS trace builder ─────────────────────────────────────────────────────

    private function buildGpsPoints(
        int $riderId,
        int $checkInId,
        int $assignmentId,
        array $corridor,
        Carbon $startTime,
        Carbon $endTime,
    ): array {
        $waypoints    = $corridor['waypoints'];
        $wpCount      = count($waypoints);
        $totalMinutes = max($startTime->diffInMinutes($endTime), 1);
        $totalSecs    = $totalMinutes * 60;
        $intervalSecs = 30; // one GPS ping every 30 seconds

        // ── Pause windows (1–2 breaks per day) ───────────────────────────────
        $pauseHistory   = [];
        $pausedRanges   = [];

        $numberOfPauses = rand(1, 2);
        for ($p = 0; $p < $numberOfPauses; $p++) {
            $pauseStartMin = rand((int)($totalMinutes * 0.2), (int)($totalMinutes * 0.7));
            $pauseLen      = rand(10, 25);

            // Avoid overlapping pauses
            foreach ($pausedRanges as [$ps, $pe]) {
                if ($pauseStartMin < $pe && ($pauseStartMin + $pauseLen) > $ps) {
                    continue 2;
                }
            }

            $pausedRanges[] = [$pauseStartMin, $pauseStartMin + $pauseLen];

            $pausedAt  = $startTime->copy()->addMinutes($pauseStartMin);
            $resumedAt = $pausedAt->copy()->addMinutes($pauseLen);

            $wpIdx = min((int)(($pauseStartMin / $totalMinutes) * ($wpCount - 1)), $wpCount - 1);

            $pauseHistory[] = [
                'paused_at'        => $pausedAt->toIso8601String(),
                'resumed_at'       => $resumedAt->toIso8601String(),
                'duration_minutes' => $pauseLen,
                'location'         => [
                    'latitude'  => $waypoints[$wpIdx][0],
                    'longitude' => $waypoints[$wpIdx][1],
                ],
            ];
        }

        $totalPauseMins = (int) array_sum(array_column($pauseHistory, 'duration_minutes'));

        // ── Build rows ────────────────────────────────────────────────────────
        $gpsRows     = [];
        $speeds      = [];
        $currentTime = $startTime->copy();
        $prevLat     = $waypoints[0][0];
        $prevLng     = $waypoints[0][1];

        for ($elapsed = 0; $elapsed <= $totalSecs; $elapsed += $intervalSecs) {
            $elapsedMin = $elapsed / 60;

            // Skip points inside a pause window
            foreach ($pausedRanges as [$ps, $pe]) {
                if ($elapsedMin >= $ps && $elapsedMin <= $pe) {
                    $currentTime->addSeconds($intervalSecs);
                    continue 2;
                }
            }

            // Interpolate position along waypoints
            $progress  = min($elapsed / $totalSecs, 1.0);
            $wpIndex   = min((int)($progress * ($wpCount - 1)), $wpCount - 2);
            $wpProg    = ($progress * ($wpCount - 1)) - $wpIndex;

            $lat = $waypoints[$wpIndex][0]
                + ($waypoints[$wpIndex + 1][0] - $waypoints[$wpIndex][0]) * $wpProg
                + $this->jitter(0.0002); // ±22 m GPS noise

            $lng = $waypoints[$wpIndex][1]
                + ($waypoints[$wpIndex + 1][1] - $waypoints[$wpIndex][1]) * $wpProg
                + $this->jitter(0.0002);

            // Estimate speed from distance delta, clamp to realistic range
            $dist  = $this->haversine($prevLat, $prevLng, $lat, $lng);
            $speed = $elapsed === 0
                ? 0.0
                : min(max($dist / ($intervalSecs / 3600), 3), 50);

            $speeds[] = $speed;

            $gpsRows[] = [
                'rider_id'               => $riderId,
                'check_in_id'            => $checkInId,
                'campaign_assignment_id' => $assignmentId,
                'latitude'               => round($lat, 8),
                'longitude'              => round($lng, 8),
                'accuracy'               => round(rand(3, 15) + lcg_value(), 2),
                'altitude'               => round(1600 + rand(-30, 80), 2), // Nairobi ~1600 m
                'speed'                  => round($speed, 2),
                'heading'                => round(fmod(rand(0, 360) + lcg_value() * 10, 360), 2),
                'recorded_at'            => $currentTime->toDateTimeString(),
                'source'                 => 'mobile',
                'metadata'               => json_encode([
                    'battery'     => rand(20, 100),
                    'network'     => rand(0, 1) ? '4G' : '3G',
                    'app_version' => '2.1.0',
                ]),
                'created_at'             => $currentTime->toDateTimeString(),
                'updated_at'             => $currentTime->toDateTimeString(),
            ];

            $prevLat = $lat;
            $prevLng = $lng;
            $currentTime->addSeconds($intervalSecs);
        }

        // Total distance via haversine
        $totalDistance = 0.0;
        for ($i = 1; $i < count($gpsRows); $i++) {
            $totalDistance += $this->haversine(
                $gpsRows[$i - 1]['latitude'], $gpsRows[$i - 1]['longitude'],
                $gpsRows[$i]['latitude'],     $gpsRows[$i]['longitude'],
            );
        }

        $avgSpeed = count($speeds) > 0 ? array_sum($speeds) / count($speeds) : 0.0;
        $maxSpeed = count($speeds) > 0 ? max($speeds) : 0.0;

        return compact('gpsRows', 'totalDistance', 'avgSpeed', 'maxSpeed', 'pauseHistory', 'totalPauseMins');
    }

    // ── Utilities ─────────────────────────────────────────────────────────────

    private function haversine(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $R    = 6371;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a    = sin($dLat / 2) ** 2
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;
        return $R * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }

    private function jitter(float $magnitude = 0.0005): float
    {
        return (lcg_value() - 0.5) * 2 * $magnitude;
    }

    /**
     * Wipe only the rows created by this seeder so it can be re-run safely
     * without affecting any real production data that might exist.
     * Identifies seeded users by their @randa.test email domain.
     */
    private function truncateSeedTables(): void
    {
        // Find seed user IDs first
        $seedUserIds = DB::table('users')
            ->where('email', 'like', '%@randa.test')
            ->pluck('id');

        if ($seedUserIds->isNotEmpty()) {
            // Riders from seed users
            $seedRiderIds = DB::table('riders')
                ->whereIn('user_id', $seedUserIds)
                ->pluck('id');

            // Assignments for seed riders
            $seedAssignmentIds = DB::table('campaign_assignments')
                ->whereIn('rider_id', $seedRiderIds)
                ->pluck('id');

            // Check-ins for seed riders
            $seedCheckInIds = DB::table('rider_check_ins')
                ->whereIn('rider_id', $seedRiderIds)
                ->pluck('id');

            DB::table('rider_gps_points')->whereIn('rider_id', $seedRiderIds)->delete();
            DB::table('rider_routes')->whereIn('rider_id', $seedRiderIds)->delete();
            DB::table('rider_check_ins')->whereIn('rider_id', $seedRiderIds)->delete();
            DB::table('helmets')->whereIn('id',
                DB::table('campaign_assignments')->whereIn('rider_id', $seedRiderIds)->pluck('helmet_id')
            )->delete();
            DB::table('campaign_assignments')->whereIn('rider_id', $seedRiderIds)->delete();
            DB::table('riders')->whereIn('id', $seedRiderIds)->delete();

            // Seed advertisers + campaigns
            $seedAdvertiserUserIds = DB::table('users')
                ->where('role', 'advertiser')
                ->whereIn('id', $seedUserIds)
                ->pluck('id');

            $seedAdvertiserIds = DB::table('advertisers')
                ->whereIn('user_id', $seedAdvertiserUserIds)
                ->pluck('id');

            DB::table('campaigns')->whereIn('advertiser_id', $seedAdvertiserIds)->delete();
            DB::table('advertisers')->whereIn('id', $seedAdvertiserIds)->delete();
            DB::table('users')->whereIn('id', $seedUserIds)->delete();
        }

        $this->command->line('  ↺ Previous seed data cleared');
    }
}
