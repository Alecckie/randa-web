<?php

namespace App\Http\Controllers;

use App\Models\Helmet;
use App\Services\HelmetService;
use App\Http\Requests\StoreHelmetRequest;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;

class HelmetController extends Controller
{
    protected $helmetService;

    public function __construct(HelmetService $helmetService)
    {
        $this->helmetService = $helmetService;
    }

    /**
     * Display a listing of helmets.
     */
    public function index(Request $request): Response
    {
        $filters = $request->only(['search', 'status']);
        
        $helmets = $this->helmetService->getAllHelmets($filters);
        $stats = $this->helmetService->getHelmetStats();

        return Inertia::render('Helmets/Index', [
            'helmets' => $helmets,
            'stats' => $stats,
            'filters' => $filters,
        ]);
    }

    /**
     * Show the form for creating a new helmet.
     */
    public function create(): Response
    {
        return Inertia::render('Helmets/Create');
    }

    /**
     * Store a newly created helmet in storage.
     */
    public function store(StoreHelmetRequest $request): RedirectResponse
    {
        try {
            $this->helmetService->createHelmet($request->validated());

            return redirect()->route('helmets.index')->with([
                'message' => 'Helmet created successfully!',
                'type' => 'success'
            ]);
        } catch (\Exception $e) {
            return redirect()->back()->withErrors([
                'error' => 'Failed to create helmet: ' . $e->getMessage()
            ])->withInput();
        }
    }

    /**
     * Display the specified helmet.
     */
    public function show(Helmet $helmet): Response
    {
        $helmet->load(['currentAssignment.campaign', 'currentAssignment.rider', 'assignments.campaign']);

        return Inertia::render('Helmets/Show', [
            'helmet' => $helmet,
        ]);
    }

    /**
     * Show the form for editing the specified helmet.
     */
    public function edit(Helmet $helmet): Response
    {
        return Inertia::render('Helmets/Edit', [
            'helmet' => $helmet,
        ]);
    }

    /**
     * Update the specified helmet in storage.
     */
    public function update(StoreHelmetRequest $request, Helmet $helmet): RedirectResponse
    {
        try {
            $this->helmetService->updateHelmet($helmet, $request->validated());

            return redirect()->route('helmets.index')->with([
                'message' => 'Helmet updated successfully!',
                'type' => 'success'
            ]);
        } catch (\Exception $e) {
            return redirect()->back()->withErrors([
                'error' => 'Failed to update helmet: ' . $e->getMessage()
            ])->withInput();
        }
    }

    /**
     * Remove the specified helmet from storage.
     */
    public function destroy(Helmet $helmet): RedirectResponse
    {
        try {
            $this->helmetService->deleteHelmet($helmet);

            return redirect()->route('helmets.index')->with([
                'message' => 'Helmet deleted successfully!',
                'type' => 'success'
            ]);
        } catch (\Exception $e) {
            return redirect()->back()->withErrors([
                'error' => 'Failed to delete helmet: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Get available helmets for assignments.
     */
    public function available(): \Illuminate\Http\JsonResponse
    {
        $helmets = $this->helmetService->getAvailableHelmets();

        return response()->json($helmets);
    }

    /**
     * Bulk update helmet status.
     */
    public function bulkUpdateStatus(Request $request): RedirectResponse
    {
        $request->validate([
            'helmet_ids' => 'required|array',
            'helmet_ids.*' => 'exists:helmets,id',
            'status' => 'required|in:available,assigned,maintenance,retired',
        ]);

        try {
            $updated = $this->helmetService->bulkUpdateStatus(
                $request->helmet_ids,
                $request->status
            );

            return redirect()->back()->with([
                'message' => "{$updated} helmet(s) status updated successfully!",
                'type' => 'success'
            ]);
        } catch (\Exception $e) {
            return redirect()->back()->withErrors([
                'error' => 'Failed to update helmet status: ' . $e->getMessage()
            ]);
        }
    }
}