<?php

namespace App\Http\Controllers\Payment;

use App\Http\Controllers\Controller;
use App\Http\Requests\Payment\WebInitiatePaymentRequest;
use App\Http\Requests\Payment\QueryPaymentStatusRequest;
use App\Http\Requests\VerifyManualReceiptRequest;
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
     * Initiate M-Pesa STK Push payment (Web - Session Auth)
     */
    public function initiateMpesaPayment(WebInitiatePaymentRequest $request): JsonResponse
    {
        return $this->initiatePayment(
            $request->getAdvertiserId(),
            $request->validated()
        );
    }

    /**
     * Query payment status (Web - Session Auth)
     */
    public function queryPaymentStatus(QueryPaymentStatusRequest $request): JsonResponse
    {
        return $this->queryPayment(
            $request->validated('checkout_request_id'),
            $request->user()->advertiser->id
        );
    }

    /**
     * Get payment details by reference (Web - Session Auth)
     */
    public function getPaymentDetails(Request $request, string $paymentReference): JsonResponse
    {
        return $this->getPayment(
            $paymentReference,
            $request->user()->advertiser->id
        );
    }


    public function verifyManualReceipt(VerifyManualReceiptRequest $request): JsonResponse
    {
        try {
            Log::info('Manual receipt verification request', [
                'advertiser_id' => $request->getAdvertiserId(),
                'receipt_number' => $request->validated('receipt_number')
            ]);

            $result = $this->mpesaService->verifyManualReceipt([
                'advertiser_id' => $request->getAdvertiserId(),
                'receipt_number' => $request->validated('receipt_number'),
                'amount' => $request->validated('amount'),
                'phone_number' => $request->validated('phone_number'),
                'campaign_data' => $request->validated('campaign_data'),
            ]);

            $statusCode = $result['success'] ? 200 : 422;

            return response()->json($result, $statusCode);
        } catch (\Exception $e) {
            Log::error('Manual receipt verification controller error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'An error occurred while processing your request'
            ], 500);
        }
    }

    /**
     * List all payments for authenticated advertiser
     */
    public function listPayments(Request $request): JsonResponse
    {
        $filters = $request->only([
            'status',
            'payment_method',
            'from_date',
            'to_date',
            'campaign_id',
            'per_page'
        ]);

        return $this->listPayments(
            $request->user()->advertiser->id,
            $filters
        );
    }

    /**
     * Get payment statistics
     */
    public function getStats(Request $request): JsonResponse
    {
        return $this->getPaymentStats($request->user()->advertiser->id);
    }
}
