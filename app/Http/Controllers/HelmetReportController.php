<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\Api\StoreHelmetReportRequest;
use App\Models\HelmetReport;
use App\Services\HelmetReportService;
use App\Services\RiderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class HelmetReportController extends BaseApiController
{
    public function __construct(
        private HelmetReportService $helmetReportService,
        private RiderService        $riderService,
    ) {}

    
     
    public function store(StoreHelmetReportRequest $request): JsonResponse
    {
        try {
            $rider = $this->riderService->getRiderByUserId(Auth::id());

            if (!$rider) {
                return $this->sendError('Rider profile not found.', [], 404);
            }

            // if (!$rider->canWork()) {
            //     return $this->sendError('Your account is not active.', [], 403);
            // }

            $report = $this->helmetReportService->createReport(
                $rider,
                array_merge(
                    $request->validated(),
                    ['helmet_image' => $request->file('helmet_image')]
                )
            );

            return $this->sendResponse(
                ['report' => $this->helmetReportService->formatReport($report)],
                'Helmet report submitted successfully.',
                201
            );
        } catch (\Exception $e) {
            return $this->sendError('Failed to submit helmet report: ' . $e->getMessage(), [], 500);
        }
    }


    /**
     * GET /api/rider/helmet-reports
     */
    public function index(): JsonResponse
    {
        try {
            $rider = $this->riderService->getRiderByUserId(Auth::id());

            if (!$rider) {
                return $this->sendError('Rider profile not found.', [], 404);
            }

            $reports = $this->helmetReportService->getReportsForRider($rider, request()->all());

            return $this->sendResponse($reports, 'Helmet reports retrieved.');
        } catch (\Exception $e) {
            return $this->sendError($e->getMessage(), [], 500);
        }
    }


    /**
     * GET /api/rider/helmet-reports/{report}
     */
    public function show(HelmetReport $report): JsonResponse
    {
        try {
            if ($report->user_id !== Auth::id()) {
                return $this->sendError('Unauthorized.', [], 403);
            }

            $report->load(['helmet', 'resolvedBy']);

            return $this->sendResponse(
                ['report' => $this->helmetReportService->formatReport($report)],
                'Helmet report retrieved.'
            );
        } catch (\Exception $e) {
            return $this->sendError($e->getMessage(), [], 500);
        }
    }


    /**
     * GET /api/admin/helmet-reports
     */
    public function adminIndex(): JsonResponse
    {
        try {
            $reports = $this->helmetReportService->getAllReports(request()->all());
            $stats   = $this->helmetReportService->getReportStats();

            return $this->sendResponse(
                ['reports' => $reports, 'stats' => $stats],
                'All helmet reports retrieved.'
            );
        } catch (\Exception $e) {
            return $this->sendError($e->getMessage(), [], 500);
        }
    }

    // ─── Admin: Resolve a report ──────────────────────────────────────────────

    /**
     * PATCH /api/admin/helmet-reports/{report}/resolve
     *
     * Body: { resolution_notes }
     */
    public function resolve(HelmetReport $report): JsonResponse
    {
        try {
            request()->validate([
                'resolution_notes' => ['required', 'string', 'min:5'],
            ]);

            if ($report->isResolved()) {
                return $this->sendError('This report has already been resolved.', [], 422);
            }

            $report = $this->helmetReportService->resolveReport(
                $report,
                Auth::id(),
                request('resolution_notes')
            );

            return $this->sendResponse(
                ['report' => $this->helmetReportService->formatReport($report)],
                'Helmet report resolved.'
            );
        } catch (\Exception $e) {
            return $this->sendError($e->getMessage(), [], 500);
        }
    }
}