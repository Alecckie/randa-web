<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;

use App\Services\Payment\MpesaService;
use App\Http\Requests\Payment\ApiInitiatePaymentRequest;
use App\Http\Requests\Payment\QueryPaymentStatusRequest;
use App\Traits\HandlesPayment;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class PaymentController extends Controller
{
    use HandlesPayment;

    protected MpesaService $mpesaService;

    public function __construct(MpesaService $mpesaService)
    {
        $this->mpesaService = $mpesaService;
    }

    /**
     * Initiate M-Pesa STK Push payment (API - Sanctum Auth)
     */
    public function initiateMpesaPayment(ApiInitiatePaymentRequest $request): JsonResponse
    {
        return $this->initiatePayment(
            $request->getAdvertiserId(),
            $request->validated()
        );
    }

    /**
     * Query payment status (API - Sanctum Auth)
     */
    public function queryPaymentStatus(QueryPaymentStatusRequest $request): JsonResponse
    {
        return $this->queryPayment(
            $request->validated('checkout_request_id'),
            $request->user()->advertiser->id
        );
    }

    /**
     * Get payment details by reference (API - Sanctum Auth)
     */
    public function getPaymentDetails(Request $request, string $paymentReference): JsonResponse
    {
        return $this->getPayment(
            $paymentReference,
            $request->user()->advertiser->id
        );
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