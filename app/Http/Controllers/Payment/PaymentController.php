<?php

namespace App\Http\Controllers\Payment;

use App\Http\Controllers\Controller;
use App\Http\Requests\Payment\WebInitiatePaymentRequest;
use App\Services\Payments\MpesaService;
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
     * FIXED: Return response that works with Inertia
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
                'message' => $result['message'] ?? 'No message',
                'reference' => $result['reference'] ?? 'No reference',
                'full_result' => $result
            ]);

            // For Inertia requests - share data in flash
            if ($request->header('X-Inertia')) {
                return back()->with([
                    'flash' => [
                        'success' => $result['success'],
                        'message' => $result['message'],
                        'reference' => $result['reference'] ?? null,
                        'payment_id' => $result['payment_id'] ?? null,
                        'checkout_request_id' => $result['checkout_request_id'] ?? null,
                        'mpesa_receipt' => $result['mpesa_receipt'] ?? null,
                    ]
                ]);
            }

            // For API requests
            return response()->json($result, $result['success'] ? 200 : 400);
        } catch (\Exception $e) {
            Log::error('❌ Payment initiation exception', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            if ($request->header('X-Inertia')) {
                return back()->with([
                    'flash' => [
                        'success' => false,
                        'message' => 'An error occurred while processing your payment request.'
                    ]
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'An error occurred while processing your payment request.'
            ], 500);
        }
    }

    /**
     * Verify manual M-Pesa receipt
     * FIXED: Return response that works with Inertia
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
                'receipt_number' => $request->input('receipt_number'),
                'amount' => $request->input('amount'),
                'phone_number' => $request->input('phone_number'),
                'advertiser_id' => $advertiserId,
                'campaign_id' => $request->input('campaign_id'),
                'campaign_data' => $request->input('campaign_data')
            ]);

            // For Inertia requests, use redirect with flash data
            if ($request->header('X-Inertia')) {
                return redirect()->back()->with([
                    'flash' => $result,
                    'success' => $result['success'],
                    'message' => $result['message'],
                    'reference' => $result['reference'] ?? null,
                    'payment_id' => $result['payment_id'] ?? null,
                    'receipt_number' => $result['receipt_number'] ?? null,
                ]);
            }

            // For API requests, return JSON
            return response()->json($result, $result['success'] ? 200 : 400);
        } catch (\Exception $e) {
            Log::error('Receipt verification error in controller', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            if ($request->header('X-Inertia')) {
                return redirect()->back()->withErrors([
                    'receipt' => 'An error occurred while verifying your receipt.'
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'An error occurred while verifying your receipt.'
            ], 500);
        }
    }

    /**
     * Query payment status
     */
    public function queryPaymentStatus(Request $request, string $checkoutRequestId)
    {
        $advertiserId = $request->user()->advertiser->id ?? null;

        if (!$advertiserId) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 403);
        }

        return $this->queryPayment($checkoutRequestId, $advertiserId);
    }

    /**
     * Get payment details
     */
    public function getPaymentDetails(Request $request, string $paymentReference)
    {
        $advertiserId = $request->user()->advertiser->id ?? null;

        if (!$advertiserId) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 403);
        }

        return $this->getPayment($paymentReference, $advertiserId);
    }

    /**
     * List all payments
     */
    public function listPayments(Request $request)
    {
        $advertiserId = $request->user()->advertiser->id ?? null;

        if (!$advertiserId) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 403);
        }

        $filters = $request->only([
            'status',
            'payment_method',
            'from_date',
            'to_date',
            'campaign_id',
            'per_page'
        ]);

        return $this->listPayments($advertiserId, $filters);
    }

    /**
     * Get payment statistics
     */
    public function getPaymentStats(Request $request)
    {
        $advertiserId = $request->user()->advertiser->id ?? null;

        if (!$advertiserId) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 403);
        }

        return $this->getPaymentStats($advertiserId);
    }
}
