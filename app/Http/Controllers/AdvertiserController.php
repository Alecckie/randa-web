<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreAdvertiserRequest;
use App\Models\Advertiser;
use App\Models\User;
use App\Services\AdvertiserService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AdvertiserController extends Controller
{

    protected $advertiserService;

    public function __construct(AdvertiserService $advertiserService)
    {
        $this->advertiserService = $advertiserService;
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $advertisers = $this->advertiserService->getAdvertisers($request->all());
        $stats = $this->advertiserService->getStats();
        $users = User::where('role', 'advertiser')->get(['id', 'name']);

        return Inertia::render('Advertisers/Index', [
            'advertisers' => $advertisers,
            'stats' => $stats,
            'filters' => $request->only(['search', 'status', 'user_id']),
            'users' => $users,
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
         $users = User::whereDoesntHave('advertiser')
                    ->where('role', 'advertiser')
                    ->orWhereNull('role')
                    ->get(['id', 'name', 'email']);

        return Inertia::render('Advertisers/Create', [
            'users' => $users,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreAdvertiserRequest $request)
    {
          $this->advertiserService->createAdvertiser($request->validated());

        return redirect()->route('advertisers.index')
                        ->with('success', 'Advertiser application submitted successfully!');
    }

    /**
     * Display the specified resource.
     */
    public function show(Advertiser $advertiser)
    {
         $advertiser->load('user', 'campaigns');
        
        return Inertia::render('Advertisers/Show', [
            'advertiser' => $advertiser,
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Advertiser $advertiser)
    {
         $advertiser->load('user');
        $users = User::where('role', 'advertiser')
                    ->orWhere('id', $advertiser->user_id)
                    ->get(['id', 'name', 'email']);

        return Inertia::render('Advertisers/Edit', [
            'advertiser' => $advertiser,
            'users' => $users,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Advertiser $advertiser)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Advertiser $advertiser)
    {
        //
    }
}
