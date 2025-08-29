<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreRiderRequest;
use App\Models\Rider;
use App\Models\User;
use App\Services\RiderService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class RiderController extends Controller
{

    protected RiderService $riderService;

    public function __construct(RiderService $riderService)
    {
        $this->riderService = $riderService;
    }
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
         $filters = $request->only([
            'status', 'search', 'user_id', 'date_from', 'date_to', 
            'daily_rate_min', 'daily_rate_max'
        ]);

        $riders = $this->riderService->getRidersPaginated($filters, $request->get('per_page', 15));
        $stats = $this->riderService->getRiderStats();
        $users = User::select('id', 'name', 'email')->get();

        return Inertia::render('Riders/Index', [
            'riders' => $riders,
            'stats' => $stats,
            'filters' => $filters,
            'users' => $users,
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        $users = User::whereDoesntHave('rider')
            ->select('id', 'name', 'email')
            ->get();

        return Inertia::render('Riders/Create', [
            'users' => $users,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreRiderRequest $request)
    {
        try {
             $this->riderService->createRider($request->validated());

            return redirect()
                ->route('riders.index')
                ->with('success', 'Rider application submitted successfully. Pending approval.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->withInput()
                ->with('error', 'Failed to create rider application: ' . $e->getMessage());
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(Rider $rider)
    {
         try {
        // Load the rider details with all necessary relationships
        $riderDetails = $this->riderService->loadRiderDetailsForShow($rider);

        return Inertia::render('Riders/Show', [
            'rider' => $riderDetails,
        ]);
    } catch (\Exception $e) {
        return redirect()
            ->route('riders.index')
            ->with('error', 'Failed to load rider details: ' . $e->getMessage());
    }
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Rider $rider)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Rider $rider)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Rider $rider)
    {
        //
    }
}
