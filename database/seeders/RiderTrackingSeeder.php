<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class RiderTrackingSeeder extends Seeder
{
    /**
     * Nairobi-area route corridors.
     * Each corridor is a sequence of [lat, lng] waypoints along a real road.
     * GPS points are interpolated between waypoints to simulate movement.
     */
    private array $routeCorridors = [
        'cbd_to_westlands' => [
            'name'       => 'CBD → Westlands',
            'waypoints'  => [
                [-1.2841, 36.8155], // Kencom / City Hall Way
                [-1.2821, 36.8120], // University Way
                [-1.2795, 36.8072], // Museum Hill roundabout
                [-1.2724, 36.8050], // Chiromo Road
                [-1.2686, 36.8118], // Westlands roundabout
                [-1.2649, 36.8030], // Sarit Centre area
            ],
        ],
        'cbd_to_upperhill' => [
            'name'      => 'CBD → Upper Hill',
            'waypoints' => [
                [-1.2864, 36.8216], // Railways / Haile Selassie
                [-1.2900, 36.8185], // Nyerere Road
                [-1.2942, 36.8170], // Upper Hill Road
                [-1.2988, 36.8148], // Hospital Hill
                [-1.3021, 36.8109], // Ngong Road junction
            ],
        ],
        'cbd_to_eastleigh' => [
            'name'      => 'CBD → Eastleigh',
            'waypoints' => [
                [-1.2841, 36.8230], // Tom Mboya Street
                [-1.2820, 36.8290], // Ronald Ngala Street
                [-1.2795, 36.8350], // Juja Road
                [-1.2760, 36.8410], // Eastleigh 1st Avenue
                [-1.2730, 36.8480], // Eastleigh Section III
            ],
        ],
        'ngong_road_corridor' => [
            'name'      => 'Ngong Road Corridor',
            'waypoints' => [
                [-1.2975, 36.7800], // Dagoretti Corner
                [-1.2998, 36.7870], // Kilimani junction
                [-1.3021, 36.7940], // Yaya Centre
                [-1.3044, 36.8010], // Adams Arcade
                [-1.3060, 36.8070], // Prestige Plaza
                [-1.3080, 36.8110], // NHIF Building
            ],
        ],
        'thika_road_corridor' => [
            'name'      => 'Thika Road Corridor',
            'waypoints' => [
                [-1.2619, 36.8360], // Pangani
                [-1.2540, 36.8410], // Muthaiga roundabout
                [-1.2460, 36.8460], // Garden City Mall area
                [-1.2360, 36.8520], // Roysambu
                [-1.2250, 36.8580], // Kahawa West junction
            ],
        ],
        'mombasa_road_corridor' => [
            'name'      => 'Mombasa Road Corridor',
            'waypoints' => [
                [-1.3100, 36.8250], // Wilson Airport area
                [-1.3180, 36.8200], // South C
                [-1.3260, 36.8150], // Nyayo Stadium
                [-1.3340, 36.8100], // Syokimau junction
                [-1.3420, 36.8050], // JKIA approach
            ],
        ],
    ];

    /** Ward IDs around Nairobi (fictional but realistic IDs) */
    private array $nairobiWardIds = [101, 102, 103, 104, 105, 106, 107, 108, 109, 110];

    /**
     * Riders with their assigned corridors.
     * IDs are arbitrary — replace with real IDs from your riders table.
     */
    private array $riders = [
        ['rider_id' => 1, 'campaign_assignment_id' => 10, 'corridor' => 'cbd_to_westlands'],
        ['rider_id' => 2, 'campaign_assignment_id' => 11, 'corridor' => 'cbd_to_upperhill'],
        ['rider_id' => 3, 'campaign_assignment_id' => 12, 'corridor' => 'cbd_to_eastleigh'],
        ['rider_id' => 4, 'campaign_assignment_id' => 13, 'corridor' => 'ngong_road_corridor'],
        ['rider_id' => 5, 'campaign_assignment_id' => 14, 'corridor' => 'thika_road_corridor'],
        ['rider_id' => 6, 'campaign_assignment_id' => 15, 'corridor' => 'mombasa_road_corridor'],
    ];

    // ──────────────────────────────────────────────────────────────────────────

    public function run(): void
    {
        $this->command->info('Seeding rider tracking data (Nairobi area)...');

        // Seed 3 days of data: 2 past days + today
        $dates = [
            Carbon::today()->subDays(2),
            Carbon::today()->subDays(1),
            Carbon::today(),
        ];

        foreach ($this->riders as $riderConfig) {
            foreach ($dates as $date) {
                $this->seedRiderDay($riderConfig, $date);
            }
        }

        $this->command->info('✓ Tracking seed complete.');
        $this->command->table(
            ['Table', 'Rows inserted'],
            [
                ['rider_check_ins',  DB::table('rider_check_ins')->count()],
                ['rider_routes',     DB::table('rider_routes')->count()],
                ['rider_gps_points', DB::table('rider_gps_points')->count()],
            ]
        );
    }

    // ──────────────────────────────────────────────────────────────────────────
    // PER-RIDER, PER-DAY LOGIC
    // ──────────────────────────────────────────────────────────────────────────

    private function seedRiderDay(array $riderConfig, Carbon $date): void
    {
        $riderId            = $riderConfig['rider_id'];
        $campaignAssignmentId = $riderConfig['campaign_assignment_id'];
        $corridor           = $this->routeCorridors[$riderConfig['corridor']];

        // Work hours: check in between 07:00–08:30, work 6–9 hours
        $checkInTime  = $date->copy()->setHour(rand(7, 8))->setMinute(rand(0, 30))->setSecond(0);
        $workDuration = rand(360, 540); // minutes
        $checkOutTime = $checkInTime->copy()->addMinutes($workDuration);

        // ── 1. Check-in ──────────────────────────────────────────────────────
        $startWaypoint = $corridor['waypoints'][0];

        $checkInId = DB::table('rider_check_ins')->insertGetId([
            'rider_id'               => $riderId,
            'campaign_assignment_id' => $campaignAssignmentId,
            'check_in_date'          => $date->toDateString(),
            'check_in_time'          => $checkInTime,
            'check_out_time'         => $checkOutTime,
            'daily_earning'          => rand(800, 1500) / 10 * 10, // KSh 800–1500
            'status'                 => $date->isToday() ? 'active' : 'completed',
            'check_in_latitude'      => $startWaypoint[0] + $this->jitter(),
            'check_in_longitude'     => $startWaypoint[1] + $this->jitter(),
            'check_out_latitude'     => end($corridor['waypoints'])[0] + $this->jitter(),
            'check_out_longitude'    => end($corridor['waypoints'])[1] + $this->jitter(),
            'created_at'             => $checkInTime,
            'updated_at'             => $checkOutTime,
        ]);

        // ── 2. GPS points ────────────────────────────────────────────────────
        [
            'gpsRows'        => $gpsRows,
            'totalDistance'  => $totalDistance,
            'avgSpeed'       => $avgSpeed,
            'maxSpeed'       => $maxSpeed,
            'pauseHistory'   => $pauseHistory,
            'totalPauseMins' => $totalPauseMins,
        ] = $this->buildGpsPoints(
            riderId: $riderId,
            checkInId: $checkInId,
            campaignAssignmentId: $campaignAssignmentId,
            corridor: $corridor,
            startTime: $checkInTime,
            endTime: $checkOutTime,
            date: $date,
        );

        // Chunk insert to avoid packet-size issues
        foreach (array_chunk($gpsRows, 200) as $chunk) {
            DB::table('rider_gps_points')->insert($chunk);
        }

        $pointCount = count($gpsRows);

        // ── 3. Route ─────────────────────────────────────────────────────────
        $coverageWards = $this->randomSubset($this->nairobiWardIds, rand(2, 5));

        DB::table('rider_routes')->insert([
            'rider_id'               => $riderId,
            'check_in_id'            => $checkInId,
            'campaign_assignment_id' => $campaignAssignmentId,
            'route_date'             => $date->toDateString(),
            'status'                 => $date->isToday() ? 'active' : 'completed',
            'tracking_status'        => $date->isToday() ? 'active' : 'completed',
            'started_at'             => $checkInTime,
            'ended_at'               => $date->isToday() ? null : $checkOutTime,
            'last_paused_at'         => !empty($pauseHistory) ? $pauseHistory[count($pauseHistory) - 1]['paused_at'] : null,
            'last_resumed_at'        => !empty($pauseHistory) ? ($pauseHistory[count($pauseHistory) - 1]['resumed_at'] ?? null) : null,
            'total_pause_duration'   => $totalPauseMins,
            'total_distance'         => round($totalDistance, 2),
            'total_duration'         => $workDuration - $totalPauseMins,
            'location_points_count'  => $pointCount,
            'avg_speed'              => round($avgSpeed, 2),
            'max_speed'              => round($maxSpeed, 2),
            'coverage_areas'         => json_encode($coverageWards),
            'route_polyline'         => null, // encode with Google's algorithm in production
            'pause_history'          => json_encode($pauseHistory),
            'statistics'             => json_encode([
                'total_waypoints'   => count($corridor['waypoints']),
                'corridor'          => $corridor['name'],
                'effective_minutes' => $workDuration - $totalPauseMins,
            ]),
            'metadata'               => json_encode(['seeded' => true]),
            'created_at'             => $checkInTime,
            'updated_at'             => $checkOutTime,
        ]);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // GPS POINT BUILDER
    // Interpolates points between waypoints, adds realistic jitter & speed,
    // and inserts 1–2 pause windows per route.
    // ──────────────────────────────────────────────────────────────────────────

    private function buildGpsPoints(
        int $riderId,
        int $checkInId,
        int $campaignAssignmentId,
        array $corridor,
        Carbon $startTime,
        Carbon $endTime,
        Carbon $date,
    ): array {
        $waypoints       = $corridor['waypoints'];
        $waypointCount   = count($waypoints);
        $totalMinutes    = $startTime->diffInMinutes($endTime);

        // ── Pause windows (1–2 breaks) ────────────────────────────────────────
        $pauseHistory   = [];
        $pausedMinutes  = [];
        $numberOfPauses = rand(1, 2);

        for ($p = 0; $p < $numberOfPauses; $p++) {
            $pauseStart = rand((int)($totalMinutes * 0.2), (int)($totalMinutes * 0.7));
            $pauseLen   = rand(10, 25); // 10–25 min break

            // Avoid overlapping pauses
            $conflicts = false;
            foreach ($pausedMinutes as [$ps, $pe]) {
                if ($pauseStart < $pe && ($pauseStart + $pauseLen) > $ps) {
                    $conflicts = true;
                    break;
                }
            }
            if ($conflicts) continue;

            $pausedMinutes[] = [$pauseStart, $pauseStart + $pauseLen];

            $pausedAt   = $startTime->copy()->addMinutes($pauseStart);
            $resumedAt  = $pausedAt->copy()->addMinutes($pauseLen);

            $pauseHistory[] = [
                'paused_at'        => $pausedAt->toIso8601String(),
                'resumed_at'       => $resumedAt->toIso8601String(),
                'duration_minutes' => $pauseLen,
                'location'         => [
                    'latitude'  => $waypoints[(int)($waypointCount * ($pauseStart / $totalMinutes))][0],
                    'longitude' => $waypoints[(int)($waypointCount * ($pauseStart / $totalMinutes))][1],
                ],
            ];
        }

        $totalPauseMins = array_sum(array_column($pauseHistory, 'duration_minutes'));

        // ── Generate GPS records every 30 seconds ────────────────────────────
        $gpsRows       = [];
        $intervalSecs  = 30;
        $totalSecs     = $totalMinutes * 60;
        $speeds        = [];

        $currentTime   = $startTime->copy();
        $prevLat       = $waypoints[0][0];
        $prevLng       = $waypoints[0][1];

        for ($elapsed = 0; $elapsed <= $totalSecs; $elapsed += $intervalSecs) {
            $elapsedMinutes = $elapsed / 60;

            // Skip points that fall inside a pause window
            $inPause = false;
            foreach ($pausedMinutes as [$ps, $pe]) {
                if ($elapsedMinutes >= $ps && $elapsedMinutes <= $pe) {
                    $inPause = true;
                    break;
                }
            }

            if ($inPause) {
                $currentTime->addSeconds($intervalSecs);
                continue;
            }

            // Interpolate position along waypoints
            $progress   = min($elapsed / max($totalSecs, 1), 1.0);
            $wpIndex    = min((int)($progress * ($waypointCount - 1)), $waypointCount - 2);
            $wpProgress = ($progress * ($waypointCount - 1)) - $wpIndex;

            $lat = $waypoints[$wpIndex][0] + ($waypoints[$wpIndex + 1][0] - $waypoints[$wpIndex][0]) * $wpProgress;
            $lng = $waypoints[$wpIndex][1] + ($waypoints[$wpIndex + 1][1] - $waypoints[$wpIndex][1]) * $wpProgress;

            // Add realistic GPS jitter (±0.0002° ≈ ±22 m)
            $lat += $this->jitter(0.0002);
            $lng += $this->jitter(0.0002);

            // Speed: estimate from distance delta (km/h), clamp 5–45
            $distDelta = $this->haversine($prevLat, $prevLng, $lat, $lng);
            $speed     = $elapsed === 0 ? 0.0 : min(max($distDelta / ($intervalSecs / 3600), 5), 45);
            $speeds[]  = $speed;

            $gpsRows[] = [
                'rider_id'               => $riderId,
                'check_in_id'            => $checkInId,
                'campaign_assignment_id' => $campaignAssignmentId,
                'latitude'               => round($lat, 8),
                'longitude'              => round($lng, 8),
                'accuracy'               => round(rand(3, 15) + lcg_value(), 2),
                'altitude'               => round(1600 + rand(-30, 80) + lcg_value(), 2), // Nairobi ~1600 m
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

        $avgSpeed = count($speeds) > 0 ? array_sum($speeds) / count($speeds) : 0;
        $maxSpeed = count($speeds) > 0 ? max($speeds) : 0;

        // Total distance: sum of haversine between consecutive points
        $totalDistance = 0;
        for ($i = 1; $i < count($gpsRows); $i++) {
            $totalDistance += $this->haversine(
                $gpsRows[$i - 1]['latitude'], $gpsRows[$i - 1]['longitude'],
                $gpsRows[$i]['latitude'],     $gpsRows[$i]['longitude'],
            );
        }

        return compact('gpsRows', 'totalDistance', 'avgSpeed', 'maxSpeed', 'pauseHistory', 'totalPauseMins');
    }

    // ──────────────────────────────────────────────────────────────────────────
    // UTILITIES
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Haversine distance between two coordinates (returns km).
     */
    private function haversine(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $R   = 6371; // Earth radius in km
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);

        $a = sin($dLat / 2) ** 2
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;

        return $R * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }

    /**
     * Random jitter in decimal degrees.
     * Default ±0.0005° ≈ ±55 m — realistic for a check-in point.
     */
    private function jitter(float $magnitude = 0.0005): float
    {
        return (lcg_value() - 0.5) * 2 * $magnitude;
    }

    /**
     * Return a random subset of $count items from $array.
     */
    private function randomSubset(array $array, int $count): array
    {
        shuffle($array);
        return array_slice($array, 0, min($count, count($array)));
    }
}