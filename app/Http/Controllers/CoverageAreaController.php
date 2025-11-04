<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCoverageAreaRequest;
use App\Http\Requests\UpdateCoverageAreaRequest;
use App\Models\CoverageArea;
use App\Models\County;
use App\Models\SubCounty;
use App\Models\Ward;
use App\Services\CoverageAreasService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CoverageAreaController extends Controller
{
    protected CoverageAreasService $coverageAreasService;

    public function __construct(CoverageAreasService $coverageAreasService)
    {
        $this->coverageAreasService = $coverageAreasService;
    }

    /**
     * Display a listing of coverage areas.
     */
    public function index(Request $request): Response
    {
        $query = CoverageArea::with(['county', 'subCounty', 'ward'])
            ->withCount('campaigns');

        // Apply search filter
        if ($request->filled('search')) {
            $query->search($request->search);
        }

        // Apply location filters
        if ($request->filled('county_id')) {
            $query->byCounty($request->county_id);
        }

        if ($request->filled('sub_county_id')) {
            $query->bySubCounty($request->sub_county_id);
        }

        if ($request->filled('ward_id')) {
            $query->byWard($request->ward_id);
        }

        $coverageAreas = $query->latest()->paginate(15);

        // Calculate stats
        $stats = [
            'total_coverage_areas' => CoverageArea::count(),
            'by_county' => CoverageArea::whereNotNull('county_id')->whereNull('sub_county_id')->count(),
            'by_sub_county' => CoverageArea::whereNotNull('sub_county_id')->whereNull('ward_id')->count(),
            'by_ward' => CoverageArea::whereNotNull('ward_id')->count(),
        ];

        return Inertia::render('CoverageAreas/Index', [
            'coverageAreas' => $coverageAreas,
            'stats' => $stats,
            'filters' => [
                'search' => $request->search,
                'county_id' => $request->county_id,
                'sub_county_id' => $request->sub_county_id,
                'ward_id' => $request->ward_id,
            ],
            'counties' => County::orderBy('name')->get(),
            'subCounties' => SubCounty::orderBy('name')->get(),
            'wards' => Ward::orderBy('name')->get(),
        ]);
    }

    /**
     * Show the form for creating a new coverage area.
     */
    public function create(): Response
    {
        return Inertia::render('CoverageAreas/Create', [
            'counties' => County::orderBy('name')->get(),
            'subCounties' => SubCounty::orderBy('name')->get(),
            'wards' => Ward::orderBy('name')->get(),
        ]);
    }

    /**
     * Store a newly created coverage area.
     */
    public function store(StoreCoverageAreaRequest $request): RedirectResponse
    {
        try {
            $this->coverageAreasService->create($request->validated());

            return redirect()
                ->route('coverage-areas.index')
                ->with('success', 'Coverage area created successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->withInput()
                ->with('error', 'Failed to create coverage area: ' . $e->getMessage());
        }
    }

    /**
     * Display the specified coverage area.
     */
    public function show(CoverageArea $coverageArea): Response
    {
        $coverageArea->load(['county', 'subCounty', 'ward', 'campaigns']);
        
        $stats = $coverageArea->getCampaignStats();

        return Inertia::render('CoverageAreas/Show', [
            'coverageArea' => $coverageArea,
            'stats' => $stats,
        ]);
    }

    /**
     * Show the form for editing the specified coverage area.
     */
    public function edit(CoverageArea $coverageArea): Response
    {
        $coverageArea->load(['county', 'subCounty', 'ward']);

        return Inertia::render('CoverageAreas/Edit', [
            'coverageArea' => $coverageArea,
            'counties' => County::orderBy('name')->get(),
            'subCounties' => SubCounty::orderBy('name')->get(),
            'wards' => Ward::orderBy('name')->get(),
        ]);
    }

    /**
     * Update the specified coverage area.
     */
    public function update(UpdateCoverageAreaRequest $request, CoverageArea $coverageArea): RedirectResponse
    {
        try {
            $this->coverageAreasService->update($coverageArea, $request->validated());

            return redirect()
                ->route('coverage-areas.index')
                ->with('success', 'Coverage area updated successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->withInput()
                ->with('error', 'Failed to update coverage area: ' . $e->getMessage());
        }
    }

    /**
     * Remove the specified coverage area.
     */
    public function destroy(CoverageArea $coverageArea): RedirectResponse
    {
        try {
            // Check if can be deleted
            if (!$coverageArea->canBeDeleted()) {
                return redirect()
                    ->back()
                    ->with('error', 'Cannot delete coverage area with active campaigns.');
            }

            $this->coverageAreasService->delete($coverageArea);

            return redirect()
                ->route('coverage-areas.index')
                ->with('success', 'Coverage area deleted successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', 'Failed to delete coverage area: ' . $e->getMessage());
        }
    }
}