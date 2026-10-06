<?php

namespace App\Http\Controllers;

use App\Models\HelmetReport;
use App\Services\HelmetReportService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class AdminHelmetReportController extends Controller
{
    public function __construct(
        private HelmetReportService $helmetReportService,
    ) {}

    public function index(Request $request): Response
    {
        $filters = $request->only(['priority_level', 'report_status', 'rider_id', 'helmet_id']);

        $reports = $this->helmetReportService->getAllReports($filters);
        $reports->setCollection(
            $reports->getCollection()->map(fn (HelmetReport $r) => $this->helmetReportService->formatReport($r))
        );

        return Inertia::render('Admin/HelmetReports/Index', [
            'reports' => $reports,
            'stats'   => $this->helmetReportService->getReportStats(),
            'filters' => $filters,
        ]);
    }

    public function resolve(Request $request, HelmetReport $report)
    {
        $validated = $request->validate([
            'resolution_notes' => ['required', 'string', 'min:5'],
        ]);

        if ($report->isResolved()) {
            return back()->with('error', 'This report has already been resolved.');
        }

        $this->helmetReportService->resolveReport($report, Auth::id(), $validated['resolution_notes']);

        return back()->with('success', 'Helmet report resolved.');
    }
}
