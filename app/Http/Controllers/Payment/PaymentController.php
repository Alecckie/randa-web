<?php

namespace App\Http\Controllers\Payment;

use App\Http\Controllers\Controller;
use App\Http\Requests\Payment\WebInitiatePaymentRequest;
use App\Services\Payments\MpesaService;
use App\Models\Payment;
use App\Traits\HandlesPayment;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class PaymentController extends Controller
{
    use HandlesPayment;

    protected MpesaService $mpesaService;

    public function __construct(MpesaService $mpesaService)
    {
        $this->mpesaService = $mpesaService;
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
            'phone_number' => 'required|string',
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