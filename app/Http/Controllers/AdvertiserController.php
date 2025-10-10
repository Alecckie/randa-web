<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreAdvertiserRequest;
use App\Models\Advertiser;
use App\Models\RejectionReason;
use App\Models\User;
use App\Services\AdvertiserService;
use Illuminate\Http\Request;
use Barryvdh\DomPDF\Facade\Pdf;
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
        $advertiser->load(['user']);

        // Get rejection reasons if any
        $rejectionReasons = RejectionReason::where('rejectable_type', Advertiser::class)
            ->where('rejectable_id', $advertiser->id)
            ->with('rejectedBy:id,name')
            ->latest()
            ->get()
            ->map(function ($reason) {
                return [
                    'id' => $reason->id,
                    'reason' => $reason->reason,
                    'rejected_by' => $reason->rejected_by,
                    'created_at' => $reason->created_at->toISOString(),
                    'rejected_by_user' => $reason->rejectedBy ? [
                        'name' => $reason->rejectedBy->name
                    ] : null,
                ];
            });

        // Get campaigns for this advertiser
        $campaigns = $advertiser->campaigns()
            ->latest()
            ->get()
            ->map(function ($campaign) {
                return [
                    'id' => $campaign->id,
                    'name' => $campaign->name,
                    'status' => $campaign->status,
                    'start_date' => $campaign->start_date->format('Y-m-d'),
                    'end_date' => $campaign->end_date->format('Y-m-d'),
                    'helmet_count' => $campaign->helmet_count,
                    'duration_days' => $campaign->duration_days,
                    'is_active' => $campaign->is_active,
                    'is_expired' => $campaign->is_expired,
                    'created_at' => $campaign->created_at->toISOString(),
                ];
            });

        return Inertia::render('Advertisers/Show', [
            'advertiser' => [
                'id' => $advertiser->id,
                'user_id' => $advertiser->user_id,
                'company_name' => $advertiser->company_name,
                'business_registration' => $advertiser->business_registration,
                'address' => $advertiser->address,
                'status' => $advertiser->status,
                'created_at' => $advertiser->created_at->toISOString(),
                'updated_at' => $advertiser->updated_at->toISOString(),
                'user' => [
                    'id' => $advertiser->user->id,
                    'first_name' => $advertiser->user->first_name,
                    'last_name' => $advertiser->user->last_name,
                    'name' => $advertiser->user->name,
                    'email' => $advertiser->user->email,
                    'phone' => $advertiser->user->phone,
                    'is_active' => $advertiser->user->is_active,
                ],
            ],
            'campaigns' => $campaigns,
            'rejectionReasons' => $rejectionReasons,
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

    /**
     * Approve an advertiser application.
     */
    public function approve($id)
    {
        $advertiser = Advertiser::find($id);
        if ($advertiser->status === 'approved') {
            return back()->with('error', 'Advertiser is already approved.');
        }

        $this->advertiserService->updateStatus($advertiser, 'approved');

        return back()->with('success', 'Advertiser approved successfully.');
    }

    /**
     * Reject an advertiser application.
     */
    public function reject(Request $request, $id)
    {
        $advertiser = Advertiser::find($id);
        $validated = $request->validate([
            'reason' => 'required|string|min:10',
        ]);

        $this->advertiserService->updateStatus($advertiser, 'rejected', $validated['reason']);

        RejectionReason::create([
            'rejected_by' => auth()->id(),
            'rejectable_type' => Advertiser::class,
            'rejectable_id' => $advertiser->id,
            'reason' => $validated['reason'],
        ]);

        return back()->with('success', 'Advertiser rejected successfully.');
    }

    /**
     * Download advertiser details as PDF.
     */
    public function downloadPdf($id)
    {
        $advertiser = Advertiser::find($id);
        $advertiser->load(['user', 'campaigns']);

        $rejectionReasons = RejectionReason::where('rejectable_type', Advertiser::class)
            ->where('rejectable_id', $advertiser->id)
            ->with('rejectedBy:id,name')
            ->latest()
            ->get();

        $pdf = Pdf::loadView('pdf.advertiser', [
            'advertiser' => $advertiser,
            'campaigns' => $advertiser->campaigns,
            'rejectionReasons' => $rejectionReasons,
        ]);

        return $pdf->download('advertiser-' . '-' . now()->format('Y-m-d') . '.pdf');
    }
}
