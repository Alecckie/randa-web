<?php

namespace App\Http\Controllers\Api;

use App\Models\RiderWithdrawalRequest;
use App\Services\NotificationService;
use App\Services\RiderService;
use App\Services\Shift\RiderPayoutService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class RiderWithdrawalController extends BaseApiController
{
    public function __construct(
        private RiderService $riderService,
        private RiderPayoutService $payoutService,
        private NotificationService $notificationService,
    ) {}

    /**
     * GET /api/v1/rider/withdrawals
     *
     * Available balance + this rider's withdrawal request history. One call
     * is enough to drive a wallet screen: show available_balance next to a
     * "Withdraw" button (disabled if has_pending_request is true or
     * available_balance is 0), and the list below it as history.
     */
    public function index(Request $request): JsonResponse
    {
        $rider = $this->riderService->getRiderByUserId(Auth::id());

        if (!$rider) {
            return $this->sendError('Rider profile not found.', [], 404);
        }

        $withdrawals = RiderWithdrawalRequest::where('rider_id', $rider->id)
            ->orderByDesc('created_at')
            ->paginate($request->integer('per_page', 15));

        $withdrawals->getCollection()->transform(fn (RiderWithdrawalRequest $w) => $this->format($w));

        return $this->sendResponse([
            'available_balance'   => $this->payoutService->owedTotal($rider->id),
            'has_pending_request' => RiderWithdrawalRequest::where('rider_id', $rider->id)->pending()->exists(),
            'withdrawals'         => $withdrawals,
        ], 'Withdrawals retrieved.');
    }

    /**
     * GET /api/v1/rider/withdrawals/{withdrawal}
     */
    public function show(RiderWithdrawalRequest $withdrawal): JsonResponse
    {
        $rider = $this->riderService->getRiderByUserId(Auth::id());

        if (!$rider) {
            return $this->sendError('Rider profile not found.', [], 404);
        }

        if ($withdrawal->rider_id !== $rider->id) {
            return $this->sendError('You are not authorized to access this withdrawal request.', [], 403);
        }

        return $this->sendResponse(['withdrawal' => $this->format($withdrawal)], 'Withdrawal retrieved.');
    }

    /**
     * POST /api/v1/rider/withdrawals
     *
     * Requests a cash-out of the rider's full current unsettled balance —
     * there's no amount field, the whole owed balance is requested. Admin
     * pays the rider manually (e.g. M-Pesa) outside the system, then marks
     * the request settled via the admin dashboard.
     */
    public function store(): JsonResponse
    {
        $rider = $this->riderService->getRiderByUserId(Auth::id());

        if (!$rider) {
            return $this->sendError('Rider profile not found.', [], 404);
        }

        try {
            $withdrawal = $this->payoutService->requestWithdrawal($rider);
            $this->notificationService->notifyAdminsWithdrawalRequested($withdrawal);

            return $this->sendResponse(
                ['withdrawal' => $this->format($withdrawal)],
                'Withdrawal request submitted.',
                201
            );
        } catch (\RuntimeException $e) {
            return $this->sendError($e->getMessage(), [], 422);
        }
    }

    private function format(RiderWithdrawalRequest $withdrawal): array
    {
        return [
            'id'                => $withdrawal->id,
            'amount_requested'  => (float) $withdrawal->amount_requested,
            'amount_settled'    => $withdrawal->amount_settled !== null ? (float) $withdrawal->amount_settled : null,
            'status'            => $withdrawal->status,
            'rejection_reason'  => $withdrawal->rejection_reason,
            'requested_at'      => $withdrawal->created_at?->toIso8601String(),
            'reviewed_at'       => $withdrawal->reviewed_at?->toIso8601String(),
        ];
    }
}
