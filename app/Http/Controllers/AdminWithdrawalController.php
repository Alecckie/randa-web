<?php

namespace App\Http\Controllers;

use App\Models\Rider;
use App\Models\RiderWithdrawalRequest;
use App\Services\NotificationService;
use App\Services\Shift\RiderPayoutService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class AdminWithdrawalController extends Controller
{
    public function __construct(
        private RiderPayoutService $payoutService,
        private NotificationService $notificationService,
    ) {}

    /**
     * Withdrawal request queue + a reconciliation summary — how much is
     * currently owed across all pending requests, and how much has been
     * paid out this month.
     */
    public function index(Request $request)
    {
        $status = $request->query('status');

        $withdrawals = RiderWithdrawalRequest::with(['rider.user', 'reviewedBy'])
            ->when($status, fn ($q) => $q->where('status', $status))
            ->orderByDesc('created_at')
            ->paginate(20)
            ->withQueryString();

        $summary = [
            'pending_count'  => RiderWithdrawalRequest::pending()->count(),
            'pending_amount' => round((float) RiderWithdrawalRequest::pending()->sum('amount_requested'), 2),
            'settled_this_month_count'  => RiderWithdrawalRequest::where('status', RiderWithdrawalRequest::STATUS_SETTLED)
                ->whereMonth('reviewed_at', now()->month)
                ->whereYear('reviewed_at', now()->year)
                ->count(),
            'settled_this_month_amount' => round((float) RiderWithdrawalRequest::where('status', RiderWithdrawalRequest::STATUS_SETTLED)
                ->whereMonth('reviewed_at', now()->month)
                ->whereYear('reviewed_at', now()->year)
                ->sum('amount_settled'), 2),
        ];

        return Inertia::render('Admin/Withdrawals/Index', [
            'withdrawals' => $withdrawals,
            'summary'     => $summary,
            'filters'     => ['status' => $status],
        ]);
    }

    public function settle(Request $request, RiderWithdrawalRequest $withdrawal)
    {
        $validated = $request->validate([
            'amount_settled' => ['required', 'numeric', 'min:0.01'],
            'mpesa_confirmation_code' => ['required', 'string', 'max:50'],
        ]);

        try {
            $withdrawal = $this->payoutService->settleWithdrawal(
                $withdrawal,
                Auth::id(),
                (float) $validated['amount_settled'],
                $validated['mpesa_confirmation_code'],
            );
            $this->notificationService->notifyRiderWithdrawalSettled($withdrawal);

            return back()->with('success', 'Withdrawal marked settled — KSh ' . number_format((float) $withdrawal->amount_settled, 2) . ' paid out.');
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    public function reject(Request $request, RiderWithdrawalRequest $withdrawal)
    {
        $request->validate([
            'reason' => 'nullable|string|max:500',
        ]);

        try {
            $withdrawal = $this->payoutService->rejectWithdrawal($withdrawal, Auth::id(), $request->input('reason'));
            $this->notificationService->notifyRiderWithdrawalRejected($withdrawal);

            return back()->with('success', 'Withdrawal request rejected.');
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    /**
     * Audit trail for one rider — every withdrawal request they've ever made
     * plus their all-time earnings breakdown (day-by-day, settled vs owed),
     * so an admin can see how amount_requested (frozen at request time)
     * relates to what's actually been earned and settled since.
     */
    public function riderHistory(Rider $rider): JsonResponse
    {
        $rider->load('user');

        $withdrawals = RiderWithdrawalRequest::where('rider_id', $rider->id)
            ->with('reviewedBy')
            ->orderByDesc('created_at')
            ->get();

        $earnings = $this->payoutService->periodSummary($rider->id, Carbon::create(2000, 1, 1), now());

        return response()->json([
            'rider' => [
                'id' => $rider->id,
                'name' => $rider->user->name,
                'current_owed' => round((float) $rider->wallet_balance, 2),
            ],
            'withdrawals' => $withdrawals,
            'earnings' => $earnings,
        ]);
    }
}
