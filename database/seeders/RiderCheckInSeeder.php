<?php

namespace Database\Seeders;

use App\Models\CampaignAssignment;
use App\Models\CoverageArea;
use App\Models\Rider;
use App\Models\RiderCheckIn;
use App\Models\RiderGpsPoint;
use App\Models\RiderRoute;
use App\Services\AreaVisitService;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Seeds check-ins, GPS points, and area visits.
 *
 * The GPS points are carefully positioned so they pass through the
 * seeded coverage areas (Westlands, CBD, Parklands, Ngara, etc.) and
 * trigger realistic enter → exit transitions when AreaVisitService runs.
 *
 * Route simulation for each rider:
 *   - Starts near their home stage
 *   - Passes through 2–4 coverage areas during the day
 *   - Returns to start (completing the round trip)
 *
 * Check-ins are created for the last 14 days so reports have range.
 */
class RiderCheckInSeeder extends Seeder
{
    // Area center coordinates copied from the data migration
    private array $areaCenters = [
        'Westlands'   => ['lat' => -1.2635, 'lng' => 36.8025, 'radius' => 2000],
        'Nairobi CBD' => ['lat' => -1.2864, 'lng' => 36.8172, 'radius' => 1500],
        'Parklands'   => ['lat' => -1.2603, 'lng' => 36.8154, 'radius' => 1500],
        'Ngara'       => ['lat' => -1.2756, 'lng' => 36.8317, 'radius' => 1200],
        'Donholm'     => ['lat' => -1.2956, 'lng' => 36.8817, 'radius' => 1800],
        'Langata'     => ['lat' => -1.3331, 'lng' => 36.7700, 'radius' => 2500],
        'South B'     => ['lat' => -1.3053, 'lng' => 36.8217, 'radius' => 1500],
        'Embakasi'    => ['lat' => -1.3197, 'lng' => 36.9028, 'radius' => 3000],
        'Karen'       => ['lat' => -1.3181, 'lng' => 36.7172, 'radius' => 2500],
    ];

    public function run(): void
    {
        $areaVisitService = app(AreaVisitService::class);

        // Only seed riders who have active assignments
        $assignments = CampaignAssignment::with(['rider.user', 'campaign'])
            ->whereIn('status', ['active', 'completed'])
            ->get()
            ->groupBy('rider_id');

        if ($assignments->isEmpty()) {
            $this->command->error('No assignments found. Run CampaignAssignmentSeeder first.');
            return;
        }

        $coverageAreas = CoverageArea::withGeometry()->get()->keyBy('name');

        // Load coverage area IDs by name so we can reference them below
        $areaIds = $coverageAreas->pluck('id', 'name');

        /**
         * Define routes per rider (by index 0–9).
         * Each entry is a list of area names the rider passes through.
         * The seeder will generate GPS point paths between these areas.
         *
         * Rider 0 (Brian)   → Westlands → CBD → Parklands  (Safaricom + Naivas)
         * Rider 1 (Kevin)   → CBD → Ngara → CBD            (Safaricom)
         * Rider 2 (Samuel)  → Parklands → Westlands → CBD  (Safaricom + Naivas)
         * Rider 3 (Joseph)  → Ngara → CBD → South B        (Safaricom)
         * Rider 4 (Dennis)  → Donholm → CBD → Ngara        (Safaricom)
         * Rider 5 (Alex)    → Langata → CBD → South B      (Equity + Naivas)
         * Rider 6 (Collins) → Embakasi → CBD → Donholm     (Equity + Naivas)
         * Rider 7 (Mercy)   → CBD → Ngara → CBD            (Equity + Naivas)
         * Rider 8 (Felix)   → Karen → Langata → CBD        (Equity)
         * Rider 9 (Victor)  → South B → CBD → Ngara        (Naivas)
         */
        $riderRoutes = [
            0 => ['Westlands', 'Nairobi CBD', 'Parklands'],
            1 => ['Nairobi CBD', 'Ngara', 'Nairobi CBD'],
            2 => ['Parklands', 'Westlands', 'Nairobi CBD'],
            3 => ['Ngara', 'Nairobi CBD', 'South B'],
            4 => ['Donholm', 'Nairobi CBD', 'Ngara'],
            5 => ['Langata', 'Nairobi CBD', 'South B'],
            6 => ['Embakasi', 'Nairobi CBD', 'Donholm'],
            7 => ['Nairobi CBD', 'Ngara', 'Nairobi CBD'],
            8 => ['Karen', 'Langata', 'Nairobi CBD'],
            9 => ['South B', 'Nairobi CBD', 'Ngara'],
        ];

        $riders      = Rider::where('status', 'approved')->get()->values();
        $checkInCount = 0;
        $gpsCount     = 0;
        $visitCount   = 0;

        foreach ($riders as $riderIndex => $rider) {
            $riderAssignments = $assignments->get($rider->id);
            if (! $riderAssignments) continue;

            // Use the first assignment for this rider
            $assignment = $riderAssignments->first();
            $routeAreas = $riderRoutes[$riderIndex] ?? ['Nairobi CBD'];

            // Generate check-ins for the last 14 days
            // Skip days where the campaign wasn't active
            for ($daysAgo = 13; $daysAgo >= 0; $daysAgo--) {
                $date = Carbon::today()->subDays($daysAgo);

                // Skip if campaign wasn't active on this date
                $campaign = $assignment->campaign;
                if ($date->lt($campaign->start_date) || $date->gt($campaign->end_date)) {
                    continue;
                }

                // 80% attendance rate — skip some days randomly (seeded, not truly random)
                if (($riderIndex + $daysAgo) % 5 === 0) continue;

                // Skip if check-in already exists
                if (RiderCheckIn::where('rider_id', $rider->id)
                    ->whereDate('check_in_date', $date)->exists()) {
                    continue;
                }

                DB::transaction(function () use (
                    $rider, $assignment, $date, $routeAreas,
                    &$checkInCount, &$gpsCount, &$visitCount,
                    $areaVisitService
                ) {
                    $checkInTime  = $date->copy()->setHour(6)->setMinute(rand(0, 30));
                    $checkOutTime = $date->copy()->setHour(18)->setMinute(rand(30, 59));

                    $checkIn = RiderCheckIn::create([
                        'rider_id'               => $rider->id,
                        'campaign_assignment_id' => $assignment->id,
                        'check_in_date'          => $date->toDateString(),
                        'check_in_time'          => $checkInTime,
                        'check_out_time'         => $checkOutTime,
                        'status'                 => RiderCheckIn::STATUS_ENDED,
                        'daily_earning'          => round(
                            $checkInTime->diffInMinutes($checkOutTime) / 60 * RiderCheckIn::HOURLY_RATE,
                            2
                        ),
                        'check_in_latitude'      => $this->areaCenter($routeAreas[0])['lat'],
                        'check_in_longitude'     => $this->areaCenter($routeAreas[0])['lng'],
                        'check_out_latitude'     => $this->areaCenter($routeAreas[0])['lat'],
                        'check_out_longitude'    => $this->areaCenter($routeAreas[0])['lng'],
                    ]);

                    $checkInCount++;

                    // ── Generate GPS points ──────────────────────────────────────
                    $points = $this->generateRoutePoints(
                        $routeAreas,
                        $checkInTime,
                        $checkOutTime,
                        $checkIn->id,
                        $rider->id,
                        $assignment->id
                    );

                    RiderGpsPoint::insert($points);
                    $gpsCount += count($points);

                    // ── Create route summary ─────────────────────────────────────
                    $totalMinutes  = $checkInTime->diffInMinutes($checkOutTime);
                    $totalDistance = $this->estimateDistance($routeAreas);

                    RiderRoute::firstOrCreate(
                        ['rider_id' => $rider->id, 'check_in_id' => $checkIn->id, 'route_date' => $date->toDateString()],
                        [
                            'campaign_assignment_id' => $assignment->id,
                            'started_at'             => $checkInTime,
                            'ended_at'               => $checkOutTime,
                            // 'status'                 => 'completed',
                            // 'tracking_status'        => 'completed',
                            'total_distance'         => $totalDistance,
                            'total_duration'         => $totalMinutes,
                            'total_pause_duration'   => rand(10, 40),
                            'pause_count'            => rand(1, 4),
                            'location_points_count'  => count($points),
                            'avg_speed'              => round($totalDistance / ($totalMinutes / 60), 2),
                            'max_speed'              => round($totalDistance / ($totalMinutes / 60) * 1.4, 2),
                        ]
                    );

                    // ── Detect area visits ───────────────────────────────────────
                    try {
                        $detected = $areaVisitService->processCheckInVisits($checkIn->id);
                        $visitCount += $detected;
                    } catch (\Throwable $e) {
                        // Don't stop seeding if detection fails for one check-in
                    }
                });
            }
        }

        $this->command->info("✅ Check-ins seeded ({$checkInCount}) with {$gpsCount} GPS points and {$visitCount} area visits detected");
    }

    // ──────────────────────────────────────────────────────────────────────
    // GPS point generation
    // ──────────────────────────────────────────────────────────────────────

    /**
     * Generate an array of GPS point rows that travel through the given areas.
     *
     * Strategy:
     *  - Split the working day into segments (one per area pair)
     *  - For each segment: approach the area center, spend time inside, leave
     *  - Add slight noise to each point so they're not all identical
     */
    private function generateRoutePoints(
        array  $areaNames,
        Carbon $startTime,
        Carbon $endTime,
        int    $checkInId,
        int    $riderId,
        int    $assignmentId
    ): array {
        $points          = [];
        $totalMinutes    = $startTime->diffInMinutes($endTime);
        $minutesPerArea  = (int) ($totalMinutes / count($areaNames));
        $now             = now();

        foreach ($areaNames as $segIndex => $areaName) {
            $center      = $this->areaCenter($areaName);
            $segStart    = $startTime->copy()->addMinutes($segIndex * $minutesPerArea);
            $segEnd      = $segStart->copy()->addMinutes($minutesPerArea);

            // 1. Approach points (outside the area, trending toward center)
            $approachPoints = 8;
            for ($i = 0; $i < $approachPoints; $i++) {
                $progress     = $i / $approachPoints;
                // Start ~2.5 km from center, converge to ~800 m
                $offsetMetres = 2500 - ($progress * 1700);
                [$lat, $lng]  = $this->offsetPoint($center['lat'], $center['lng'], $offsetMetres, 90 + ($segIndex * 45));

                $points[] = $this->buildPoint(
                    $riderId, $checkInId, $assignmentId,
                    $lat, $lng,
                    $segStart->copy()->addMinutes((int) ($i * ($minutesPerArea * 0.3) / $approachPoints)),
                    $now
                );
            }

            // 2. Inside-area points (within the radius — these trigger the visit)
            $insidePoints = 12;
            for ($i = 0; $i < $insidePoints; $i++) {
                // Small random offset within the area (max 60% of radius)
                $jitterM  = rand(0, (int) ($center['radius'] * 0.6));
                $jitterBearing = rand(0, 360);
                [$lat, $lng] = $this->offsetPoint($center['lat'], $center['lng'], $jitterM, $jitterBearing);

                $points[] = $this->buildPoint(
                    $riderId, $checkInId, $assignmentId,
                    $lat, $lng,
                    $segStart->copy()->addMinutes(
                        (int) ($minutesPerArea * 0.3) + (int) ($i * ($minutesPerArea * 0.5) / $insidePoints)
                    ),
                    $now
                );
            }

            // 3. Departure points (moving away from center)
            $departPoints = 6;
            for ($i = 0; $i < $departPoints; $i++) {
                $progress     = ($i + 1) / $departPoints;
                $offsetMetres = 800 + ($progress * 1700);
                [$lat, $lng]  = $this->offsetPoint($center['lat'], $center['lng'], $offsetMetres, 270 + ($segIndex * 45));

                $points[] = $this->buildPoint(
                    $riderId, $checkInId, $assignmentId,
                    $lat, $lng,
                    $segEnd->copy()->subMinutes((int) (($departPoints - $i) * ($minutesPerArea * 0.2) / $departPoints)),
                    $now
                );
            }
        }

        // Sort by recorded_at (some segments may interleave due to addMinutes calculations)
        usort($points, fn ($a, $b) => strcmp($a['recorded_at'], $b['recorded_at']));

        return $points;
    }

    private function buildPoint(
        int    $riderId,
        int    $checkInId,
        int    $assignmentId,
        float  $lat,
        float  $lng,
        Carbon $recordedAt,
        Carbon $now
    ): array {
        return [
            'rider_id'               => $riderId,
            'check_in_id'            => $checkInId,
            'campaign_assignment_id' => $assignmentId,
            'latitude'               => round($lat, 8),
            'longitude'              => round($lng, 8),
            'accuracy'               => rand(5, 20),
            'altitude'               => rand(1660, 1700),   // Nairobi altitude range
            'speed'                  => round(rand(0, 60) / 2, 1),
            'heading'                => rand(0, 359),
            'recorded_at'            => $recordedAt->toDateTimeString(),
            'source'                 => 'mobile',
            'metadata'               => null,
            'created_at'             => $now->toDateTimeString(),
            'updated_at'             => $now->toDateTimeString(),
        ];
    }

    // ──────────────────────────────────────────────────────────────────────
    // Geometry helpers
    // ──────────────────────────────────────────────────────────────────────

    /**
     * Offset a lat/lng point by distanceMetres in a given bearing (degrees).
     * Returns [lat, lng].
     */
    private function offsetPoint(float $lat, float $lng, float $distanceMetres, float $bearing): array
    {
        $earthRadius = 6_371_000.0;
        $bearingRad  = deg2rad($bearing);
        $latRad      = deg2rad($lat);
        $lngRad      = deg2rad($lng);
        $d           = $distanceMetres / $earthRadius;

        $newLatRad = asin(
            sin($latRad) * cos($d) +
            cos($latRad) * sin($d) * cos($bearingRad)
        );

        $newLngRad = $lngRad + atan2(
            sin($bearingRad) * sin($d) * cos($latRad),
            cos($d) - sin($latRad) * sin($newLatRad)
        );

        return [rad2deg($newLatRad), rad2deg($newLngRad)];
    }

    private function areaCenter(string $areaName): array
    {
        return $this->areaCenters[$areaName] ?? [
            'lat'    => -1.2864,
            'lng'    => 36.8172,
            'radius' => 1500,
        ];
    }

    private function estimateDistance(array $areaNames): float
    {
        // Rough estimate: ~5 km between each pair of Nairobi areas
        return count($areaNames) * 5.0 + rand(2, 8);
    }
}