<?php

namespace App\Support;

/**
 * GPS path simplification and deduplication utilities.
 *
 * Provides two independent layers of point reduction:
 *
 *  1. deduplicateBatch()  — removes near-identical points (same spot,
 *     poor accuracy, stale timestamp) before they are processed further.
 *     This is a cheap O(n) pass that kills noise at the source.
 *
 *  2. simplify()          — Ramer-Douglas-Peucker algorithm that removes
 *     collinear points along straight roads while preserving meaningful
 *     turns and direction changes. Applied after deduplication.
 *
 * Call order inside RiderTrackingService::recordBatchLocations():
 *   raw locations → deduplicateBatch() → simplify() → DB insert
 */
class GpsPathSimplifier
{
    /**
     * Minimum distance (metres) between consecutive points.
     * Points closer than this are considered the same location.
     */
    public const DEDUP_MIN_DISTANCE_M = 5.0;

    /**
     * Maximum GPS accuracy (metres) to accept a point.
     * Readings worse than this are too noisy to be useful.
     */
    public const DEDUP_MAX_ACCURACY_M = 50.0;

    /**
     * RDP simplification tolerance in metres.
     * 15 m removes redundant straight-line points while keeping
     * meaningful turns, stops, and direction changes.
     * Nairobi urban roads: 30–40% reduction on winding streets,
     * 60–70% reduction on straight highway segments.
     */
    public const RDP_EPSILON_METRES = 15.0;

    // ──────────────────────────────────────────────────────────────────────
    // DEDUPLICATION
    // ──────────────────────────────────────────────────────────────────────

    /**
     * Remove near-identical points from a batch before RDP simplification.
     *
     * A point is discarded when ANY of the following is true:
     *   - GPS accuracy is worse than DEDUP_MAX_ACCURACY_M
     *   - It is within DEDUP_MIN_DISTANCE_M of the previous kept point
     *     AND the device reports speed below 0.5 m/s (or speed is absent)
     *   - Its recorded_at timestamp is identical to the previous kept point
     *     (duplicate submission / network retry)
     *
     * The first point in the batch is always kept.
     * Points are expected to be pre-sorted by recorded_at ascending.
     *
     * @param  array  $points  Each element must have 'latitude' and 'longitude'.
     *                         Optional keys: 'accuracy', 'speed', 'recorded_at'.
     * @return array  Filtered subset — same structure, never re-indexed.
     */
    public static function deduplicateBatch(array $points): array
    {
        if (count($points) <= 1) {
            return $points;
        }

        $kept        = [];
        $lastKept    = null;
        $lastKeptAt  = null;

        foreach ($points as $point) {
            // ── Gate 1: accuracy ─────────────────────────────────────────
            if (
                isset($point['accuracy']) &&
                $point['accuracy'] !== null &&
                (float) $point['accuracy'] > self::DEDUP_MAX_ACCURACY_M
            ) {
                continue;
            }

            // First valid point — always keep
            if ($lastKept === null) {
                $kept[]     = $point;
                $lastKept   = $point;
                $lastKeptAt = $point['recorded_at'] ?? null;
                continue;
            }

            // ── Gate 2: duplicate timestamp (network retry / double-send) ─
            $currentAt = $point['recorded_at'] ?? null;
            if ($currentAt !== null && $currentAt === $lastKeptAt) {
                continue;
            }

            // ── Gate 3: near-duplicate location ──────────────────────────
            $dist = self::haversine($lastKept, $point);

            if ($dist < self::DEDUP_MIN_DISTANCE_M) {
                // Only discard if the device also confirms low/no movement.
                // This prevents filtering out a slow-creeping rider.
                $speed = isset($point['speed']) ? (float) $point['speed'] : null;

                $isStationary = $speed === null
                    ? true               // no speed data — trust distance
                    : $speed < 0.5;      // below 0.5 m/s (~1.8 km/h)

                if ($isStationary) {
                    continue;
                }
            }

            $kept[]     = $point;
            $lastKept   = $point;
            $lastKeptAt = $currentAt;
        }

        return $kept;
    }

    // ──────────────────────────────────────────────────────────────────────
    // RDP SIMPLIFICATION
    // ──────────────────────────────────────────────────────────────────────

    /**
     * Ramer-Douglas-Peucker path simplification.
     *
     * Reduces GPS points that are nearly collinear (straight-road segments)
     * while preserving points at meaningful turns, stops, and detours.
     *
     * @param  array  $points   Each item must have 'latitude' and 'longitude'.
     * @param  float  $epsilon  Tolerance in metres. Defaults to RDP_EPSILON_METRES.
     * @return array  Simplified subset of the original points array.
     */
    public static function simplify(array $points, float $epsilon = self::RDP_EPSILON_METRES): array
    {
        if (count($points) < 3) {
            return $points;
        }

        $maxDistance = 0.0;
        $index       = 0;
        $end         = count($points) - 1;

        for ($i = 1; $i < $end; $i++) {
            $distance = self::perpendicularDistance(
                $points[$i],
                $points[0],
                $points[$end]
            );

            if ($distance > $maxDistance) {
                $maxDistance = $distance;
                $index       = $i;
            }
        }

        if ($maxDistance > $epsilon) {
            $left  = self::simplify(array_slice($points, 0, $index + 1), $epsilon);
            $right = self::simplify(array_slice($points, $index), $epsilon);

            // Merge — drop the duplicate junction point
            return array_merge(array_slice($left, 0, -1), $right);
        }

        return [$points[0], $points[$end]];
    }

    // ──────────────────────────────────────────────────────────────────────
    // GEOMETRY HELPERS
    // ──────────────────────────────────────────────────────────────────────

    /**
     * Perpendicular distance (metres) from $point to the line $lineStart→$lineEnd.
     * Uses triangle area via Heron's formula for geographic accuracy.
     */
    private static function perpendicularDistance(
        array $point,
        array $lineStart,
        array $lineEnd
    ): float {
        $d13 = self::haversine($lineStart, $point);
        $d12 = self::haversine($lineStart, $lineEnd);
        $d23 = self::haversine($point,     $lineEnd);

        if ($d12 < 0.0001) {
            return $d13;
        }

        $s    = ($d13 + $d23 + $d12) / 2.0;
        $area = sqrt(max(0.0, $s * ($s - $d13) * ($s - $d23) * ($s - $d12)));

        return (2.0 * $area) / $d12;
    }

    /**
     * Haversine distance in metres between two lat/lng coordinate arrays.
     * Each array must contain 'latitude' and 'longitude' keys.
     */
    public static function haversine(array $a, array $b): float
    {
        $earthRadius = 6_371_000.0;

        $latA = deg2rad((float) $a['latitude']);
        $latB = deg2rad((float) $b['latitude']);
        $dLat = deg2rad((float) $b['latitude']  - (float) $a['latitude']);
        $dLng = deg2rad((float) $b['longitude'] - (float) $a['longitude']);

        $h = sin($dLat / 2) ** 2
           + cos($latA) * cos($latB) * sin($dLng / 2) ** 2;

        return 2.0 * $earthRadius * asin(sqrt($h));
    }

    /**
     * Calculate total path distance in kilometres for an ordered set of points.
     * Used by RiderTrackingService to update route total_distance.
     *
     * @param  array  $points  Ordered array of ['latitude' => ..., 'longitude' => ...].
     * @return float  Distance in kilometres, rounded to 3 decimal places.
     */
    public static function totalDistanceKm(array $points): float
    {
        if (count($points) < 2) {
            return 0.0;
        }

        $total = 0.0;

        for ($i = 1; $i < count($points); $i++) {
            $total += self::haversine($points[$i - 1], $points[$i]);
        }

        return round($total / 1000.0, 3);
    }
}