<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Campaign;
use App\Models\CoverageArea;
use App\Models\Rider;
use App\Services\AreaVisitService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Exception;

/**
 * Area Visit Controller (Admin API)
 *
 * All endpoints are prefixed /api/admin/area-visits
 */
class AreaVisitController extends Controller
{
    public function __construct(
        private AreaVisitService $visitService
    ) {}

    // ──────────────────────────────────────────────────────────────────────
    // GET /api/admin/area-visits/campaign/{campaignId}
    //
    // Returns visit counts per area for a campaign.
    // Optional query params: rider_id, date_from, date_to
    // ──────────────────────────────────────────────────────────────────────

    public function byCampaign(Request $request, int $campaignId): JsonResponse
    {
        try {
            Campaign::findOrFail($campaignId);

            $validator = Validator::make($request->all(), [
                'rider_id'  => 'nullable|exists:riders,id',
                'date_from' => 'nullable|date',
                'date_to'   => 'nullable|date|after_or_equal:date_from',
            ]);

            if ($validator->fails()) {
                return $this->validationError($validator);
            }

            $summary = $this->visitService->getVisitSummaryByCampaign(
                campaignId: $campaignId,
                riderId:    $request->rider_id,
                dateFrom:   $request->date_from,
                dateTo:     $request->date_to,
            );

            return response()->json([
                'success' => true,
                'message' => 'Area visit summary retrieved successfully.',
                'data'    => [
                    'campaign_id'   => $campaignId,
                    'total_areas'   => $summary->count(),
                    'total_visits'  => $summary->sum('total_visits'),
                    'areas'         => $summary,
                ],
            ]);
        } catch (Exception $e) {
            return $this->serverError($e);
        }
    }

    // ──────────────────────────────────────────────────────────────────────
    // GET /api/admin/area-visits/campaign/{campaignId}/area/{areaId}
    //
    // Drill-down: visit timeline + individual visit log for one area.
    // Optional query params: rider_id, date_from, date_to
    // ──────────────────────────────────────────────────────────────────────

    public function areaDetail(Request $request, int $campaignId, int $areaId): JsonResponse
    {
        try {
            Campaign::findOrFail($campaignId);
            $area = CoverageArea::findOrFail($areaId);

            $validator = Validator::make($request->all(), [
                'rider_id'  => 'nullable|exists:riders,id',
                'date_from' => 'nullable|date',
                'date_to'   => 'nullable|date|after_or_equal:date_from',
            ]);

            if ($validator->fails()) {
                return $this->validationError($validator);
            }

            $timeline = $this->visitService->getVisitTimeline(
                campaignId:     $campaignId,
                coverageAreaId: $areaId,
                riderId:        $request->rider_id,
                dateFrom:       $request->date_from,
                dateTo:         $request->date_to,
            );

            // If a specific rider is requested, include their individual visit log
            $visitLog = null;
            if ($request->rider_id) {
                $visitLog = $this->visitService->getRiderVisitsForArea(
                    riderId:        $request->rider_id,
                    campaignId:     $campaignId,
                    coverageAreaId: $areaId,
                    dateFrom:       $request->date_from,
                    dateTo:         $request->date_to,
                );
            }

            return response()->json([
                'success' => true,
                'message' => 'Area detail retrieved successfully.',
                'data'    => [
                    'area' => [
                        'id'        => $area->id,
                        'name'      => $area->name,
                        'full_name' => $area->full_name,
                        'county'    => $area->county?->name,
                        'radius_metres' => $area->radius_metres,
                    ],
                    'timeline'  => $timeline,
                    'visit_log' => $visitLog,
                ],
            ]);
        } catch (Exception $e) {
            return $this->serverError($e);
        }
    }

    // ──────────────────────────────────────────────────────────────────────
    // GET /api/admin/area-visits/rider/{riderId}
    //
    // All visits for a rider across all campaigns and areas.
    // Optional query params: campaign_id, coverage_area_id, date_from, date_to
    // ──────────────────────────────────────────────────────────────────────

    public function byRider(Request $request, int $riderId): JsonResponse
    {
        try {
            $rider = Rider::with('user')->findOrFail($riderId);

            $validator = Validator::make($request->all(), [
                'campaign_id'      => 'nullable|exists:campaigns,id',
                'coverage_area_id' => 'nullable|exists:coverage_areas,id',
                'date_from'        => 'nullable|date',
                'date_to'          => 'nullable|date|after_or_equal:date_from',
            ]);

            if ($validator->fails()) {
                return $this->validationError($validator);
            }

            // Use the general summary filtered to this rider
            // If a campaign is specified, scope to it; otherwise aggregate all
            $campaignId = $request->campaign_id;

            if ($campaignId) {
                $summary = $this->visitService->getVisitSummaryByCampaign(
                    campaignId: $campaignId,
                    riderId:    $riderId,
                    dateFrom:   $request->date_from,
                    dateTo:     $request->date_to,
                );
            } else {
                // No campaign filter — aggregate across all campaigns for this rider
                $summary = collect();
            }

            // Individual visit log if an area is specified
            $visitLog = null;
            if ($request->campaign_id && $request->coverage_area_id) {
                $visitLog = $this->visitService->getRiderVisitsForArea(
                    riderId:        $riderId,
                    campaignId:     $request->campaign_id,
                    coverageAreaId: $request->coverage_area_id,
                    dateFrom:       $request->date_from,
                    dateTo:         $request->date_to,
                );
            }

            return response()->json([
                'success' => true,
                'message' => 'Rider visit data retrieved successfully.',
                'data'    => [
                    'rider' => [
                        'id'    => $rider->id,
                        'name'  => $rider->user->name,
                        'email' => $rider->user->email,
                    ],
                    'area_summary' => $summary,
                    'visit_log'    => $visitLog,
                ],
            ]);
        } catch (Exception $e) {
            return $this->serverError($e);
        }
    }

    // ──────────────────────────────────────────────────────────────────────
    // POST /api/admin/area-visits/reprocess/{checkInId}
    //
    // Re-run visit detection for a single check-in.
    // Useful after updating coverage area geometry.
    // ──────────────────────────────────────────────────────────────────────

    public function reprocess(int $checkInId): JsonResponse
    {
        try {
            $count = $this->visitService->processCheckInVisits($checkInId);

            return response()->json([
                'success' => true,
                'message' => "Visit detection complete. {$count} complete visit(s) detected.",
                'data'    => ['complete_visits' => $count],
            ]);
        } catch (Exception $e) {
            return $this->serverError($e);
        }
    }

    // ──────────────────────────────────────────────────────────────────────
    // Private helpers
    // ──────────────────────────────────────────────────────────────────────

    private function validationError(\Illuminate\Validation\Validator $v): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => 'Validation failed.',
            'errors'  => $v->errors(),
        ], 422);
    }

    private function serverError(Exception $e): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => $e->getMessage(),
        ], $e->getCode() >= 400 ? $e->getCode() : 500);
    }
}