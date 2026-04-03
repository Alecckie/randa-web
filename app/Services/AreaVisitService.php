<?php

namespace App\Services;

use App\Models\CampaignAssignment;
use App\Models\CoverageArea;
use App\Models\RiderAreaVisit;
use App\Models\RiderCheckIn;
use App\Models\RiderGpsPoint;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Detects and reports rider visits to coverage areas.
 *
 * ── Visit detection algorithm ────────────────────────────────────────────────
 *
 * Given an ordered sequence of GPS points for one check-in, the service runs a
 * state machine per coverage area:
 *
 *   State: OUTSIDE
 *     GPS point inside area  →  record entry, transition to INSIDE
 *     GPS point outside area →  stay OUTSIDE
 *
 *   State: INSIDE
 *     GPS point outside area →  record exit, save visit row, transition to OUTSIDE
 *     GPS point inside area  →  increment gps_points_inside, stay INSIDE
 *
 * A rider who is still inside an area at check-out time produces a visit row
 * with exited_at = null (partial visit). The visit is still counted in reports
 * so advertisers can see coverage even for ongoing or abruptly-ended sessions.
 *
 * ── When is detection triggered? ─────────────────────────────────────────────
 *
 *  1. Automatically at check-out time via CheckInService::checkOut()
 *  2. On-demand via the artisan command: php artisan gps:detect-area-visits
 *  3. On-demand via the admin API: POST /admin/tracking/detect-visits
 *
 * Running detection multiple times on the same check-in is safe — existing
 * visit rows for that check-in are deleted and rebuilt from the GPS points.
 */
class AreaVisitService
{
    // ──────────────────────────────────────────────────────────────────────
    // PUBLIC API
    // ──────────────────────────────────────────────────────────────────────

    /**
     * Process all GPS points for a single check-in and persist visit rows.
     *
     * This is the main entry point called at check-out time.
     *
     * @return int  Number of complete visits detected.
     */
    public function processCheckInVisits(int $checkInId): int
    {
        $checkIn = RiderCheckIn::with('campaignAssignment')->findOrFail($checkInId);

        $assignment = $checkIn->campaignAssignment;

        if (! $assignment) {
            Log::warning('AreaVisitService: check-in has no campaign assignment', [
                'check_in_id' => $checkInId,
            ]);
            return 0;
        }

        // Load GPS points chronologically — do NOT paginate, we need the full sequence
        $points = RiderGpsPoint::where('check_in_id', $checkInId)
            ->orderBy('recorded_at')
            ->get(['id', 'latitude', 'longitude', 'recorded_at']);

        if ($points->isEmpty()) {
            return 0;
        }

        // Load only areas that have geometry AND belong to this campaign
        $areas = CoverageArea::withGeometry()
            ->whereHas('campaigns', fn ($q) =>
                $q->where('campaigns.id', $assignment->campaign_id)
            )
            ->get();

        if ($areas->isEmpty()) {
            return 0;
        }

        return DB::transaction(function () use ($checkIn, $assignment, $points, $areas) {
            // Delete any previously detected visits for this check-in
            // so re-processing is always safe
            RiderAreaVisit::where('check_in_id', $checkIn->id)->delete();

            $totalComplete = 0;

            foreach ($areas as $area) {
                $visits = $this->detectVisitsForArea($checkIn, $assignment, $points, $area);
                $totalComplete += $visits->where('is_complete', true)->count();
            }

            Log::info('AreaVisitService: detection complete', [
                'check_in_id'     => $checkIn->id,
                'rider_id'        => $checkIn->rider_id,
                'areas_checked'   => $areas->count(),
                'complete_visits' => $totalComplete,
            ]);

            return $totalComplete;
        });
    }

    /**
     * Get visit counts per area for a campaign, optionally filtered by rider.
     *
     * Returns one row per area, summarising:
     *  - total_visits (complete enter+exit visits)
     *  - unique_riders who visited
     *  - avg_duration_minutes
     *  - total_gps_points recorded inside
     *  - per-rider breakdown
     *
     * @param  int        $campaignId
     * @param  int|null   $riderId     If set, restricts to one rider
     * @param  string|null $dateFrom
     * @param  string|null $dateTo
     */
    public function getVisitSummaryByCampaign(
        int     $campaignId,
        ?int    $riderId   = null,
        ?string $dateFrom  = null,
        ?string $dateTo    = null
    ): Collection {
        $query = RiderAreaVisit::query()
            ->with(['coverageArea', 'rider.user'])
            ->where('campaign_id', $campaignId)
            ->whereNotNull('exited_at');   // only complete visits

        if ($riderId) {
            $query->where('rider_id', $riderId);
        }

        if ($dateFrom) {
            $query->whereDate('visit_date', '>=', $dateFrom);
        }

        if ($dateTo) {
            $query->whereDate('visit_date', '<=', $dateTo);
        }

        $visits = $query->orderBy('entered_at')->get();

        // Group by area and build summary
        return $visits
            ->groupBy('coverage_area_id')
            ->map(function (Collection $areaVisits) {
                $area = $areaVisits->first()->coverageArea;

                $avgDuration = $areaVisits
                    ->whereNotNull('duration_seconds')
                    ->avg('duration_seconds');

                // Per-rider breakdown
                $byRider = $areaVisits
                    ->groupBy('rider_id')
                    ->map(fn (Collection $rv) => [
                        'rider_id'      => $rv->first()->rider_id,
                        'rider_name'    => $rv->first()->rider?->user?->name ?? 'Unknown',
                        'visit_count'   => $rv->count(),
                        'total_minutes' => round(
                            $rv->sum('duration_seconds') / 60, 1
                        ),
                        'avg_minutes'   => round(
                            ($rv->avg('duration_seconds') ?? 0) / 60, 1
                        ),
                        'last_visit'    => $rv->max('entered_at'),
                    ])
                    ->values();

                return [
                    'coverage_area_id'    => $area?->id,
                    'area_name'           => $area?->name ?? 'Unknown Area',
                    'area_full_name'      => $area?->full_name ?? 'Unknown Area',
                    'total_visits'        => $areaVisits->count(),
                    'unique_riders'       => $areaVisits->pluck('rider_id')->unique()->count(),
                    'total_gps_points'    => $areaVisits->sum('gps_points_inside'),
                    'avg_duration_minutes'=> $avgDuration
                        ? round($avgDuration / 60, 1)
                        : null,
                    'first_visit'         => $areaVisits->min('entered_at'),
                    'last_visit'          => $areaVisits->max('entered_at'),
                    'by_rider'            => $byRider,
                ];
            })
            ->sortByDesc('total_visits')
            ->values();
    }

    /**
     * Get day-by-day visit timeline for a specific rider + area + campaign.
     * Used to power the "visits over time" chart in the UI.
     */
    public function getVisitTimeline(
        int    $campaignId,
        int    $coverageAreaId,
        ?int   $riderId  = null,
        ?string $dateFrom = null,
        ?string $dateTo   = null
    ): Collection {
        $query = RiderAreaVisit::query()
            ->where('campaign_id', $campaignId)
            ->where('coverage_area_id', $coverageAreaId)
            ->whereNotNull('exited_at')
            ->select(
                'visit_date',
                'rider_id',
                DB::raw('COUNT(*) as visit_count'),
                DB::raw('SUM(duration_seconds) as total_seconds'),
                DB::raw('AVG(duration_seconds) as avg_seconds')
            )
            ->groupBy('visit_date', 'rider_id')
            ->orderBy('visit_date');

        if ($riderId) {
            $query->where('rider_id', $riderId);
        }

        if ($dateFrom) {
            $query->whereDate('visit_date', '>=', $dateFrom);
        }

        if ($dateTo) {
            $query->whereDate('visit_date', '<=', $dateTo);
        }

        return $query->get()->map(fn ($row) => [
            'date'          => $row->visit_date,
            'rider_id'      => $row->rider_id,
            'visit_count'   => (int) $row->visit_count,
            'total_minutes' => round($row->total_seconds / 60, 1),
            'avg_minutes'   => round($row->avg_seconds / 60, 1),
        ]);
    }

    /**
     * Get all individual visit records for a specific rider + area.
     * Used for the visit log table shown on drill-down.
     */
    public function getRiderVisitsForArea(
        int    $riderId,
        int    $campaignId,
        int    $coverageAreaId,
        ?string $dateFrom = null,
        ?string $dateTo   = null
    ): Collection {
        $query = RiderAreaVisit::query()
            ->with('coverageArea')
            ->where('rider_id', $riderId)
            ->where('campaign_id', $campaignId)
            ->where('coverage_area_id', $coverageAreaId)
            ->orderBy('entered_at');

        if ($dateFrom) {
            $query->whereDate('visit_date', '>=', $dateFrom);
        }

        if ($dateTo) {
            $query->whereDate('visit_date', '<=', $dateTo);
        }

        return $query->get()->map(fn ($v) => [
            'id'               => $v->id,
            'visit_date'       => $v->visit_date?->toDateString(),
            'entered_at'       => $v->entered_at?->toIso8601String(),
            'exited_at'        => $v->exited_at?->toIso8601String(),
            'duration'         => $v->formatted_duration,
            'duration_seconds' => $v->duration_seconds,
            'gps_points_inside'=> $v->gps_points_inside,
            'is_complete'      => $v->is_complete,
            'entry_coords'     => $v->entry_latitude ? [
                'lat' => $v->entry_latitude,
                'lng' => $v->entry_longitude,
            ] : null,
        ]);
    }

    // ──────────────────────────────────────────────────────────────────────
    // PRIVATE — visit detection state machine
    // ──────────────────────────────────────────────────────────────────────

    /**
     * Run the enter/exit state machine for one area over a sequence of GPS points.
     * Saves visit rows to the DB and returns them as a Collection.
     */
    private function detectVisitsForArea(
        RiderCheckIn       $checkIn,
        CampaignAssignment $assignment,
        Collection         $points,
        CoverageArea       $area
    ): Collection {
        $visits  = collect();
        $inside  = false;

        // Active visit state — reset when a visit completes
        $enteredAt      = null;
        $entryLat       = null;
        $entryLng       = null;
        $pointsInside   = 0;

        foreach ($points as $point) {
            $isInside = $area->containsPoint(
                (float) $point->latitude,
                (float) $point->longitude
            );

            if (! $inside && $isInside) {
                // ── Transition: OUTSIDE → INSIDE ─────────────────────────
                $inside       = true;
                $enteredAt    = $point->recorded_at;
                $entryLat     = (float) $point->latitude;
                $entryLng     = (float) $point->longitude;
                $pointsInside = 1;

            } elseif ($inside && $isInside) {
                // ── Stay INSIDE ───────────────────────────────────────────
                $pointsInside++;

            } elseif ($inside && ! $isInside) {
                // ── Transition: INSIDE → OUTSIDE ─────────────────────────
                $exitedAt = $point->recorded_at;
                $duration = $enteredAt->diffInSeconds($exitedAt);

                $visit = RiderAreaVisit::create([
                    'rider_id'               => $checkIn->rider_id,
                    'campaign_id'            => $assignment->campaign_id,
                    'campaign_assignment_id' => $assignment->id,
                    'check_in_id'            => $checkIn->id,
                    'coverage_area_id'       => $area->id,
                    'entered_at'             => $enteredAt,
                    'exited_at'              => $exitedAt,
                    'duration_seconds'       => $duration,
                    'gps_points_inside'      => $pointsInside,
                    'entry_latitude'         => $entryLat,
                    'entry_longitude'        => $entryLng,
                    'exit_latitude'          => (float) $point->latitude,
                    'exit_longitude'         => (float) $point->longitude,
                    'visit_date'             => Carbon::parse($enteredAt)->toDateString(),
                ]);

                $visits->push($visit);

                // Reset state
                $inside       = false;
                $enteredAt    = null;
                $entryLat     = null;
                $entryLng     = null;
                $pointsInside = 0;
            }
        }

        // ── Rider still inside at end of GPS sequence (partial visit) ─────
        if ($inside && $enteredAt !== null) {
            $lastPoint = $points->last();
            $duration  = $enteredAt->diffInSeconds($lastPoint->recorded_at);

            $visit = RiderAreaVisit::create([
                'rider_id'               => $checkIn->rider_id,
                'campaign_id'            => $assignment->campaign_id,
                'campaign_assignment_id' => $assignment->id,
                'check_in_id'            => $checkIn->id,
                'coverage_area_id'       => $area->id,
                'entered_at'             => $enteredAt,
                'exited_at'              => null,    // incomplete
                'duration_seconds'       => $duration,
                'gps_points_inside'      => $pointsInside,
                'entry_latitude'         => $entryLat,
                'entry_longitude'        => $entryLng,
                'exit_latitude'          => null,
                'exit_longitude'         => null,
                'visit_date'             => Carbon::parse($enteredAt)->toDateString(),
            ]);

            $visits->push($visit);
        }

        return $visits;
    }
}