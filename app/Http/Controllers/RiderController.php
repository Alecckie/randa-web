<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreRiderRequest;
use App\Models\CampaignAssignment;
use App\Models\Rider;
use App\Models\RiderCheckIn;
use App\Models\User;
use App\Services\CheckInService;
use App\Services\LocationService;
use App\Services\NotificationService;
use App\Services\RiderService;
use App\Services\Shift\RiderPayoutService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class RiderController extends Controller
{

    protected RiderService $riderService;
    protected LocationService $locationService;
    protected NotificationService $notificationService;
    protected CheckInService $checkInService;

    public function __construct(
        RiderService $riderService,
        LocationService $locationService,
        NotificationService $notificationService,
        CheckInService $checkInService
    ) {
        $this->riderService = $riderService;
        $this->locationService = $locationService;
        $this->notificationService = $notificationService;
        $this->checkInService = $checkInService;
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
                'current_campaign_name' => $user->rider?->currentAssignment?->campaign?->name,
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
        $tripStats = $this->checkInService->getCheckInStats($rider->id);

            return Inertia::render('Riders/Show', [
                'rider' => $riderDetails->toArray(),
                'tripStats' => $tripStats,
                'activityTimeline' => $this->buildActivityTimeline($rider),
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
        try {
            $this->riderService->deleteRider($rider);

            return redirect()
                ->route('riders.index')
                ->with('success', 'Rider deleted successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }

    /**
     * A unified, chronological log of what this rider has actually done —
     * application submitted/approved/rejected, campaign assignments, and
     * every shift start/end — for the Activity tab on Riders/Show.
     */
    private function buildActivityTimeline(Rider $rider): array
    {
        $events = collect();

        $events->push([
            'type' => 'application_submitted',
            'title' => 'Application Submitted',
            'description' => 'Rider application was submitted for review.',
            'timestamp' => $rider->created_at,
        ]);

        if (in_array($rider->status, ['approved', 'rejected'])) {
            $latestRejection = $rider->status === 'rejected'
                ? $rider->rejectionReasons()->latest()->first()
                : null;

            $events->push([
                'type' => $rider->status === 'approved' ? 'application_approved' : 'application_rejected',
                'title' => $rider->status === 'approved' ? 'Application Approved' : 'Application Rejected',
                'description' => $latestRejection?->reason
                    ?? ($rider->status === 'approved'
                        ? 'Rider was approved and can now be assigned to campaigns.'
                        : 'No reason recorded.'),
                'timestamp' => $rider->updated_at,
            ]);
        }

        $assignments = CampaignAssignment::where('rider_id', $rider->id)
            ->with('campaign')
            ->get();

        foreach ($assignments as $assignment) {
            $campaignName = $assignment->campaign->name ?? 'Deleted campaign';

            $events->push([
                'type' => 'campaign_assigned',
                'title' => 'Assigned to Campaign',
                'description' => $campaignName,
                'timestamp' => $assignment->assigned_at,
            ]);

            if ($assignment->completed_at) {
                $events->push([
                    'type' => 'campaign_assignment_completed',
                    'title' => 'Completed Campaign Assignment',
                    'description' => $campaignName,
                    'timestamp' => $assignment->completed_at,
                ]);
            }
        }

        $checkIns = RiderCheckIn::where('rider_id', $rider->id)
            ->orderByDesc('check_in_date')
            ->take(100)
            ->get();

        foreach ($checkIns as $checkIn) {
            $events->push([
                'type' => 'shift_started',
                'title' => 'Started Shift',
                'description' => $checkIn->check_in_date->format('M j, Y'),
                'timestamp' => $checkIn->check_in_time,
            ]);

            if ($checkIn->status === RiderCheckIn::STATUS_ENDED && $checkIn->check_out_time) {
                $isAutoClosed = $checkIn->end_reason === RiderCheckIn::END_REASON_AUTO_CLOSED;

                $events->push([
                    'type' => $isAutoClosed ? 'shift_auto_closed' : 'shift_ended',
                    'title' => $isAutoClosed ? 'Shift Auto-Closed' : 'Ended Shift',
                    'description' => sprintf(
                        '%.2fh worked, KSh %.2f earned',
                        (float) $checkIn->worked_hours,
                        (float) $checkIn->daily_earning
                    ),
                    'timestamp' => $checkIn->check_out_time,
                ]);
            }
        }

        return $events
            ->sortByDesc('timestamp')
            ->values()
            ->map(fn (array $event) => [
                ...$event,
                'timestamp' => $event['timestamp']->toIso8601String(),
                'time_human' => $event['timestamp']->diffForHumans(),
            ])
            ->all();
    }

    /**
     * Per-day earnings audit for a rider over a date range (defaults to
     * this week), plus running totals owed/settled.
     */
    public function payoutAudit(Request $request, Rider $rider, RiderPayoutService $payoutService)
    {
        $from = $request->filled('from')
            ? Carbon::parse($request->query('from'))->startOfDay()
            : Carbon::now()->startOfWeek();

        $to = $request->filled('to')
            ? Carbon::parse($request->query('to'))->endOfDay()
            : Carbon::now()->endOfDay();

        return response()->json([
            'success' => true,
            'data' => $payoutService->periodSummary($rider->id, $from, $to),
            'owed_all_time' => $payoutService->owedTotal($rider->id),
        ]);
    }

    /**
     * Mark all outstanding qualifying shifts for a rider as settled (paid
     * out) and bring their wallet_balance down by that amount.
     */
    public function settleDues(Request $request, Rider $rider, RiderPayoutService $payoutService)
    {
        $upTo = $request->filled('up_to') ? Carbon::parse($request->query('up_to')) : null;

        $result = $payoutService->settle($rider, Auth::id(), $upTo);

        if ($result['settled_count'] === 0) {
            return redirect()->back()->with('info', 'No outstanding dues to settle for this rider.');
        }

        return redirect()->back()->with(
            'success',
            "Settled KSh " . number_format($result['settled_total'], 2) . " across {$result['settled_count']} day(s)."
        );
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
