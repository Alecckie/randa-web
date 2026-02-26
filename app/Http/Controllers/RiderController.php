<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreRiderRequest;
use App\Models\Rider;
use App\Models\User;
use App\Services\LocationService;
use App\Services\NotificationService;
use App\Services\RiderService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class RiderController extends Controller
{

    protected RiderService $riderService;
    protected LocationService $locationService;
    protected NotificationService $notificationService;

    public function __construct(
        RiderService $riderService, 
        LocationService $locationService,
        NotificationService $notificationService
    ) {
        $this->riderService = $riderService;
        $this->locationService = $locationService;
        $this->notificationService = $notificationService;
    }
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $filters = $request->only([
            'status',
            'search',
            'user_id',
            'date_from',
            'date_to',
            'daily_rate_min',
            'daily_rate_max'
        ]);

        $riders = $this->riderService->getRidersPaginated($filters, $request->get('per_page', 15));
        $stats = $this->riderService->getRiderStats();
        $users = User::select('id', 'name', 'email')->get();

        // Transform the data to match frontend expectations
        $transformedRiders = $riders->getCollection()->map(function ($user) {
            return [
                'id' => $user->rider_id ?? null,
                'user_id' => $user->id,
                'national_id' => $user->national_id,
                'mpesa_number' => $user->mpesa_number,
                'status' => $user->rider_status,
                'daily_rate' => $user->daily_rate,
                'wallet_balance' => $user->wallet_balance ?? '0.00',
                'created_at' => $user->rider_created_at ?? $user->created_at,
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                ],
            ];
        });

        $riders->setCollection($transformedRiders);

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

        $counties = $this->locationService->getAllCounties();

        $users = User::whereDoesntHave('rider')
            ->select('id', 'name', 'email')
            ->get();

        return Inertia::render('Riders/Create', [
            'counties' => $counties,
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
        $riderDetails = $this->riderService->loadRiderDetailsForShow($rider);
        // dd($riderDetails->toArray());

            return Inertia::render('Riders/Show', [
                'rider' => $riderDetails->toArray(),
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

    /**
     * Notify rider to complete profile
     */
    public function notifyRider(User $user)
    {
        try {
            $results = $this->notificationService->sendProfileCompletionReminder($user);
            
            return redirect()
                ->back()
                ->with('success', 'Notification sent to rider successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', 'Failed to send notification: ' . $e->getMessage());
        }
    }
}
