<?php

namespace App\Http\Controllers\Payment;

use App\Http\Controllers\Controller;
use App\Http\Requests\Payment\WebInitiatePaymentRequest;
use App\Services\Payments\MpesaService;
use App\Services\NotificationService;
use App\Models\Payment;
use App\Models\Campaign;
use App\Events\PaymentStatusUpdated;
use App\Traits\HandlesPayment;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class PaymentController extends Controller
{
    use HandlesPayment;

    protected MpesaService $mpesaService;
    protected NotificationService $notificationService;

    public function __construct(MpesaService $mpesaService, NotificationService $notificationService)
    {
        $this->mpesaService = $mpesaService;
        $this->notificationService = $notificationService;
    }

    /**
     * Initiate M-Pesa STK Push payment
     */
    public function initiateStkPush(WebInitiatePaymentRequest $request)
    {
        try {
            Log::info('🚀 Payment initiation started', [
                'advertiser_id' => $request->getAdvertiserId(),
                'phone' => $request->input('phone_number'),
                'amount' => $request->input('amount')
            ]);

            $advertiserId = $request->getAdvertiserId();

            $result = $this->mpesaService->initiateStkPush([
                'phone_number' => $request->input('phone_number'),
                'amount' => $request->input('amount'),
                'advertiser_id' => $advertiserId,
                'campaign_id' => $request->input('campaign_id'),
                'campaign_data' => $request->input('campaign_data'),
                'description' => $request->input('description', 'Campaign Payment')
            ]);

            Log::info('📦 M-Pesa service result', [
                'success' => $result['success'] ?? false,
                'message' => $result['message'] ?? 'No message'
            ]);

            // ✨ FIX: For Inertia requests - spread the result directly into flash
            if ($request->header('X-Inertia')) {
                return back()->with($result); // ✅ CHANGED: Spread result directly, not nested in 'flash'
            }

            return response()->json($result, $result['success'] ? 200 : 400);
            
        } catch (\Exception $e) {
            Log::error('❌ Payment initiation exception', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            if ($request->header('X-Inertia')) {
                // ✨ FIX: Return error data directly
                return back()->with([
                    'success' => false,
                    'message' => 'An error occurred while processing your payment request.'
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'An error occurred while processing your payment request.'
            ], 500);
        }
    }

    /**
     * Query payment status via M-Pesa Query API
     */
    public function queryPaymentStatus(Request $request)
    {
        $request->validate([
            'payment_id' => 'required|integer|exists:payments,id',
            'checkout_request_id' => 'required|string'
        ]);

        try {
            $payment = Payment::find($request->input('payment_id'));
            
            // Verify user owns this payment
            if ($payment->advertiser_id !== $request->getAdvertiserId()) {
                if ($request->header('X-Inertia')) {
                    return back()->with([
                        'success' => false,
                        'message' => 'Unauthorized'
                    ]);
                }
                
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized'
                ], 403);
            }

            // Check rate limiting
            if (!$payment->can_query_status) {
                if ($request->header('X-Inertia')) {
                    return back()->with([
                        'success' => false,
                        'message' => 'Please wait 30 seconds before querying again'
                    ]);
                }
                
                return response()->json([
                    'success' => false,
                    'message' => 'Please wait 30 seconds before querying again'
                ], 429);
            }

            $result = $this->mpesaService->queryPaymentStatus(
                $request->input('checkout_request_id'),
                $request->input('payment_id')
            );

            // ✨ FIX: Spread result directly
            if ($request->header('X-Inertia')) {
                return back()->with($result);
            }

            return response()->json($result);

        } catch (\Exception $e) {
            Log::error('Query payment status error', [
                'error' => $e->getMessage()
            ]);

            if ($request->header('X-Inertia')) {
                return back()->with([
                    'success' => false,
                    'message' => 'Error querying payment status'
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Error querying payment status'
            ], 500);
        }
    }

    /**
     * Retry STK Push
     */
    public function retryStkPush(Request $request)
    {
        $request->validate([
            'payment_id' => 'required|integer|exists:payments,id'
        ]);

        try {
            $payment = Payment::find($request->input('payment_id'));
            
            // Verify ownership
            if ($payment->advertiser_id !== $request->getAdvertiserId()) {
                if ($request->header('X-Inertia')) {
                    return back()->with([
                        'success' => false,
                        'message' => 'Unauthorized'
                    ]);
                }
                
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized'
                ], 403);
            }

            // Check if retry is allowed
            if (!$payment->can_retry_stk) {
                if ($request->header('X-Inertia')) {
                    return back()->with([
                        'success' => false,
                        'message' => 'Cannot retry STK push. Maximum attempts reached or retry too soon.'
                    ]);
                }
                
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot retry STK push. Maximum attempts reached or retry too soon.'
                ], 400);
            }

            // Initiate new STK push with same details
            $result = $this->mpesaService->initiateStkPush([
                'phone_number' => $payment->phone_number,
                'amount' => $payment->amount,
                'advertiser_id' => $payment->advertiser_id,
                'campaign_id' => $payment->campaign_id,
                'campaign_data' => $payment->metadata['campaign_data'] ?? null,
                'description' => 'Campaign Payment (Retry)'
            ]);

            // ✨ FIX: Spread result directly
            if ($request->header('X-Inertia')) {
                return back()->with($result);
            }

            return response()->json($result);

        } catch (\Exception $e) {
            Log::error('Retry STK push error', [
                'error' => $e->getMessage()
            ]);

            if ($request->header('X-Inertia')) {
                return back()->with([
                    'success' => false,
                    'message' => 'Error retrying payment'
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Error retrying payment'
            ], 500);
        }
    }

    /**
     * Verify manual M-Pesa receipt - requires admin approval
     */
    public function verifyReceipt(Request $request)
    {
        $request->validate([
            'advertiser_id' => 'required|integer|exists:advertisers,id',
            'receipt_number' => 'required|string|min:6|max:20',
            'amount' => 'required|numeric|min:1',
            'phone_number' => 'nullable|string',
            'campaign_data' => 'nullable|array'
        ]);

        try {
            $advertiserId = $request->input('advertiser_id');

            $result = $this->mpesaService->verifyManualReceipt([
                'receipt_number' => strtoupper($request->input('receipt_number')),
                'amount' => $request->input('amount'),
                'phone_number' => $request->input('phone_number'),
                'advertiser_id' => $advertiserId,
                'campaign_id' => $request->input('campaign_id'),
                'campaign_data' => $request->input('campaign_data')
            ]);

            if (!empty($result['success']) && !empty($result['payment_id'])) {
                $payment = Payment::find($result['payment_id']);
                if ($payment) {
                    $this->notificationService->notifyPaymentSubmitted($payment);
                }
            }

            if ($request->header('X-Inertia')) {
                return back()->with($result);
            }

            return response()->json($result, $result['success'] ? 200 : 400);
            
        } catch (\Exception $e) {
            Log::error('Receipt verification error', [
                'error' => $e->getMessage()
            ]);

            if ($request->header('X-Inertia')) {
                return back()->with([
                    'success' => false,
                    'message' => 'An error occurred while verifying your receipt.'
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'An error occurred while verifying your receipt.'
            ], 500);
        }
    }

    /**
     * Get paybill payment instructions
     */
    public function getPaybillInstructions(Request $request)
    {
        $request->validate([
            'payment_id' => 'required|integer|exists:payments,id'
        ]);

        try {
            $payment = Payment::find($request->input('payment_id'));
            
            // Verify ownership
            if ($payment->advertiser_id !== $request->getAdvertiserId()) {
                if ($request->header('X-Inertia')) {
                    return back()->with([
                        'success' => false,
                        'message' => 'Unauthorized'
                    ]);
                }
                
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized'
                ], 403);
            }

            $result = $this->mpesaService->generatePaybillInstructions($request->input('payment_id'));

            // ✨ FIX: For Inertia requests
            if ($request->header('X-Inertia')) {
                return back()->with($result);
            }

            return response()->json($result);

        } catch (\Exception $e) {
            Log::error('Get paybill instructions error', [
                'error' => $e->getMessage()
            ]);

            if ($request->header('X-Inertia')) {
                return back()->with([
                    'success' => false,
                    'message' => 'Error generating instructions'
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Error generating instructions'
            ], 500);
        }
    }

    /**
     * Admin: record a manual cash or M-Pesa payment without going through STK push
     */
    public function recordManualPayment(Request $request)
    {
        $request->validate([
            'campaign_id'    => 'required|integer|exists:campaigns,id',
            'advertiser_id'  => 'required|integer|exists:advertisers,id',
            'amount'         => 'required|numeric|min:1',
            'payment_method' => 'required|in:cash,mpesa',
            'receipt_number' => 'nullable|string|max:50',
            'notes'          => 'nullable|string|max:500',
        ]);

        try {
            $campaign = Campaign::findOrFail($request->campaign_id);

            $payment = Payment::create([
                'advertiser_id'      => $request->advertiser_id,
                'campaign_id'        => $request->campaign_id,
                'amount'             => $request->amount,
                'payment_method'     => $request->payment_method,
                'payment_reference'  => 'MANUAL-' . strtoupper(Str::random(8)),
                'status'             => 'completed',
                'completed_at'       => now(),
                'phone_number'       => null,
                'mpesa_receipt_number' => $request->receipt_number,
                'verification_method' => 'admin_approval',
                'requires_admin_approval' => false,
                'metadata'           => [
                    'recorded_by' => Auth::id(),
                    'notes'       => $request->notes,
                ],
            ]);

            // Mark payment as paid — admin is directly vouching for this one,
            // so it doesn't need the pending_verification review step.
            $campaign->update(['payment_status' => 'paid']);

            // Notify any advertiser page with the campaign open, live, so it
            // doesn't keep showing "payment required" after this succeeds.
            broadcast(new PaymentStatusUpdated($payment, 'success'))->toOthers();
            $this->notificationService->notifyPaymentRecorded($payment);

            if ($request->header('X-Inertia')) {
                return back()->with([
                    'success' => 'Payment of KES ' . number_format($request->amount, 2) . ' recorded successfully.',
                ]);
            }

            return response()->json(['success' => true, 'payment_id' => $payment->id]);

        } catch (\Exception $e) {
            Log::error('Manual payment recording error', ['error' => $e->getMessage()]);

            if ($request->header('X-Inertia')) {
                return back()->with(['error' => 'Failed to record payment: ' . $e->getMessage()]);
            }

            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Admin: approve a manually-submitted receipt that's awaiting verification.
     */
    public function approveManualPayment(Request $request, Payment $payment)
    {
        $user = Auth::user();

        if (!$user || $user->role !== 'admin') {
            return back()->with(['error' => 'You do not have permission to approve payments.']);
        }

        if ($payment->status === 'completed') {
            return back()->with(['error' => 'This payment has already been approved.']);
        }

        $payment->approveByAdmin($user->id, $request->input('note'));
        $payment = $payment->fresh();

        // Notify the advertiser's page live so it stops asking for payment.
        broadcast(new PaymentStatusUpdated($payment, 'success'))->toOthers();
        $this->notificationService->notifyPaymentApproved($payment);

        return back()->with([
            'success' => 'Payment of KES ' . number_format((float) $payment->amount, 2) . ' approved.',
        ]);
    }

    /**
     * Admin: reject a manually-submitted receipt that's awaiting verification.
     */
    public function rejectManualPayment(Request $request, Payment $payment)
    {
        $user = Auth::user();

        if (!$user || $user->role !== 'admin') {
            return back()->with(['error' => 'You do not have permission to reject payments.']);
        }

        $request->validate([
            'reason' => 'required|string|max:500',
        ]);

        if ($payment->status === 'completed') {
            return back()->with(['error' => 'This payment has already been approved and cannot be rejected.']);
        }

        $reason = $request->input('reason');
        $payment->rejectByAdmin($user->id, $reason);
        $this->notificationService->notifyPaymentRejected($payment->fresh(), $reason);

        return back()->with([
            'success' => 'Payment rejected. The advertiser can submit a new receipt.',
        ]);
    }

    /**
     * Get payment details
     */
    public function getPaymentDetails(Request $request, string $paymentReference)
    {
        $advertiserId = $request->getAdvertiserId();

        if (!$advertiserId) {
            if ($request->header('X-Inertia')) {
                return back()->with([
                    'success' => false,
                    'message' => 'Unauthorized'
                ]);
            }
            
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 403);
        }

        $payment = Payment::where('payment_reference', $paymentReference)
                         ->where('advertiser_id', $advertiserId)
                         ->first();

        if (!$payment) {
            if ($request->header('X-Inertia')) {
                return back()->with([
                    'success' => false,
                    'message' => 'Payment not found'
                ]);
            }
            
            return response()->json([
                'success' => false,
                'message' => 'Payment not found'
            ], 404);
        }

        $result = [
            'success' => true,
            'payment' => [
                'id' => $payment->id,
                'reference' => $payment->payment_reference,
                'amount' => $payment->amount,
                'status' => $payment->status,
                'mpesa_receipt' => $payment->getMpesaReceipt(),
                'phone_number' => $payment->phone_number,
                'requires_approval' => $payment->requires_admin_approval,
                'is_awaiting_approval' => $payment->is_awaiting_approval,
                'can_retry_stk' => $payment->can_retry_stk,
                'can_query_status' => $payment->can_query_status,
                'verification_method' => $payment->verification_method,
                'paybill_details' => $payment->getPaybillDetails(),
                'created_at' => $payment->created_at,
                'completed_at' => $payment->completed_at,
            ]
        ];

        if ($request->header('X-Inertia')) {
            return back()->with($result);
        }

        return response()->json($result);
    }
}