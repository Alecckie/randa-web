<?php

namespace App\Services\Shift;

use App\Models\RiderGpsPoint;
use Carbon\Carbon;

/**
 * Turns a shift's raw GPS trail into movement facts: how long the rider was
 * genuinely stationary (to be deducted from worked_hours, same as a
 * declared pause) and distance/speed stats for display.
 *
 * Detection method: walk consecutive GPS points, compute the speed implied
 * by the distance and time between each pair. A run of consecutive
 * below-threshold gaps is a "stationary segment"; a segment only counts
 * against pay once it's sustained past stationary_min_minutes (grace for
 * traffic lights, junctions, brief stops).
 *
 * Fairness rule: with fewer than 2 GPS points in the window, there isn't
 * enough data to conclude the rider was stationary, so this returns zero
 * deduction rather than penalizing a shift with sparse/missing GPS (a
 * technical failure, not evidence of not working).
 */
class RiderMovementAnalyzer
{
    private const EARTH_RADIUS_KM = 6371.0;

    /**
     * @return array{
     *     has_sufficient_data: bool,
     *     stationary_minutes: float,
     *     total_distance_km: float,
     *     avg_speed_kmh: float,
     *     max_speed_kmh: float,
     * }
     */
    public function analyze(int $checkInId, Carbon $from, Carbon $to): array
    {
        $points = RiderGpsPoint::where('check_in_id', $checkInId)
            ->whereBetween('recorded_at', [$from, $to])
            ->orderBy('recorded_at')
            ->get(['latitude', 'longitude', 'recorded_at']);

        if ($points->count() < 2) {
            return [
                'has_sufficient_data' => false,
                'stationary_minutes' => 0.0,
                'total_distance_km' => 0.0,
                'avg_speed_kmh' => 0.0,
                'max_speed_kmh' => 0.0,
            ];
        }

        $speedThreshold = (float) config('rider_shift.stationary_speed_threshold_kmh');
        $minStationaryMinutes = (float) config('rider_shift.stationary_min_minutes');

        $stationaryMinutes = 0.0;
        $totalDistanceKm = 0.0;
        $maxSpeedKmh = 0.0;
        $segmentStart = null;
        $segmentEnd = null;

        $flushSegment = function () use (&$segmentStart, &$segmentEnd, &$stationaryMinutes, $minStationaryMinutes) {
            if ($segmentStart === null) {
                return;
            }
            $duration = $segmentStart->diffInMinutes($segmentEnd, false);
            if ($duration >= $minStationaryMinutes) {
                $stationaryMinutes += $duration;
            }
            $segmentStart = null;
        };

        $previous = null;
        foreach ($points as $point) {
            if ($previous === null) {
                $previous = $point;
                continue;
            }

            $minutes = $previous->recorded_at->diffInMinutes($point->recorded_at, false);
            if ($minutes <= 0) {
                $previous = $point;
                continue;
            }

            $distanceKm = self::haversineKm(
                $previous->latitude,
                $previous->longitude,
                $point->latitude,
                $point->longitude
            );
            $totalDistanceKm += $distanceKm;

            $speedKmh = $distanceKm / ($minutes / 60);
            $maxSpeedKmh = max($maxSpeedKmh, $speedKmh);

            if ($speedKmh < $speedThreshold) {
                $segmentStart ??= $previous->recorded_at;
                $segmentEnd = $point->recorded_at;
            } else {
                $flushSegment();
            }

            $previous = $point;
        }
        $flushSegment();

        $elapsedMinutes = max(1, $points->first()->recorded_at->diffInMinutes($points->last()->recorded_at, false));
        $avgSpeedKmh = $totalDistanceKm > 0 ? $totalDistanceKm / ($elapsedMinutes / 60) : 0.0;

        return [
            'has_sufficient_data' => true,
            'stationary_minutes' => round(max(0, $stationaryMinutes), 2),
            'total_distance_km' => round($totalDistanceKm, 3),
            'avg_speed_kmh' => round($avgSpeedKmh, 2),
            'max_speed_kmh' => round($maxSpeedKmh, 2),
        ];
    }

    public static function haversineKm(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);

        $a = sin($dLat / 2) ** 2
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLon / 2) ** 2;

        return self::EARTH_RADIUS_KM * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }
}
