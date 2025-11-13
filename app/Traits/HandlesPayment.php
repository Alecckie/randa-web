<?php

namespace App\Traits;

use App\Models\Payment;
use Illuminate\Http\JsonResponse;

trait HandlesPayment
{
    /**
     * Initiate M-Pesa STK Push payment
     * 
     * @param int $advertiserId
     * @param array $data
     * @return JsonResponse
     */
    protected function initiatePayment(int $advertiserId, array $data): JsonResponse
    {
        $result = $this->mpesaService->initiateStkPush([
            'phone_number' => $data['phone_number'],
            'amount' => $data['amount'],
            'advertiser_id' => $advertiserId,
            'campaign_id' => $data['campaign_id'] ?? null,
            'campaign_data' => $data['campaign_data'] ?? null,
            'description' => $data['description'] ?? 'Campaign Payment'
        ]);

        return response()->json($result, $result['success'] ? 200 : 400);
    }

    /**
     * Query payment status from M-Pesa
     * 
     * @param string $checkoutRequestId
     * @param int $advertiserId
     * @return JsonResponse
     */
    protected function queryPayment(string $checkoutRequestId, int $advertiserId): JsonResponse
    {
        // Verify payment belongs to the advertiser
        $payment = Payment::where('gateway_transaction_id', $checkoutRequestId)
            ->where('advertiser_id', $advertiserId)
            ->first();

        if (!$payment) {
            return response()->json([
                'success' => false,
                'message' => 'Payment not found or unauthorized'
            ], 404);
        }

        $result = $this->mpesaService->queryPaymentStatus($checkoutRequestId);

        return response()->json($result);
    }

    /**
     * Get payment details by reference
     * 
     * @param string $paymentReference
     * @param int $advertiserId
     * @return JsonResponse
     */
    protected function getPayment(string $paymentReference, int $advertiserId): JsonResponse
    {
        $payment = Payment::where('payment_reference', $paymentReference)
            ->where('advertiser_id', $advertiserId)
            ->with(['campaign:id,name,status', 'advertiser:id,company_name'])
            ->first();

        if (!$payment) {
            return response()->json([
                'success' => false,
                'message' => 'Payment not found or unauthorized'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'payment' => [
                'id' => $payment->id,
                'reference' => $payment->payment_reference,
                'amount' => $payment->amount,
                'currency' => $payment->currency,
                'status' => $payment->status,
                'status_message' => $payment->status_message,
                'mpesa_receipt' => $payment->mpesa_receipt,
                'payment_method' => $payment->payment_method,
                'payment_gateway' => $payment->payment_gateway,
                'initiated_at' => $payment->initiated_at?->toIso8601String(),
                'processed_at' => $payment->processed_at?->toIso8601String(),
                'completed_at' => $payment->completed_at?->toIso8601String(),
                'failed_at' => $payment->failed_at?->toIso8601String(),
                'campaign' => $payment->campaign ? [
                    'id' => $payment->campaign->id,
                    'name' => $payment->campaign->name,
                    'status' => $payment->campaign->status,
                ] : null,
                'advertiser' => [
                    'id' => $payment->advertiser->id,
                    'company_name' => $payment->advertiser->company_name,
                ],
                'metadata' => $payment->metadata,
            ]
        ]);
    }

    /**
     * Get all payments for an advertiser
     * 
     * @param int $advertiserId
     * @param array $filters
     * @return JsonResponse
     */
    protected function listPayments(int $advertiserId, array $filters = []): JsonResponse
    {
        $query = Payment::where('advertiser_id', $advertiserId)
            ->with(['campaign:id,name,status']);

        // Apply filters
        if (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (isset($filters['payment_method'])) {
            $query->where('payment_method', $filters['payment_method']);
        }

        if (isset($filters['from_date'])) {
            $query->whereDate('initiated_at', '>=', $filters['from_date']);
        }

        if (isset($filters['to_date'])) {
            $query->whereDate('initiated_at', '<=', $filters['to_date']);
        }

        if (isset($filters['campaign_id'])) {
            $query->where('campaign_id', $filters['campaign_id']);
        }

        $perPage = $filters['per_page'] ?? 15;
        $payments = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json([
            'success' => true,
            'payments' => $payments->items(),
            'pagination' => [
                'total' => $payments->total(),
                'per_page' => $payments->perPage(),
                'current_page' => $payments->currentPage(),
                'last_page' => $payments->lastPage(),
                'from' => $payments->firstItem(),
                'to' => $payments->lastItem(),
            ]
        ]);
    }

    /**
     * Get payment statistics for an advertiser
     * 
     * @param int $advertiserId
     * @return JsonResponse
     */
    protected function getPaymentStats(int $advertiserId): JsonResponse
    {
        $stats = [
            'total_payments' => Payment::where('advertiser_id', $advertiserId)->count(),
            'completed_payments' => Payment::where('advertiser_id', $advertiserId)
                ->where('status', 'completed')
                ->count(),
            'pending_payments' => Payment::where('advertiser_id', $advertiserId)
                ->whereIn('status', ['pending', 'processing'])
                ->count(),
            'failed_payments' => Payment::where('advertiser_id', $advertiserId)
                ->where('status', 'failed')
                ->count(),
            'total_amount_paid' => Payment::where('advertiser_id', $advertiserId)
                ->where('status', 'completed')
                ->sum('amount'),
            'total_pending_amount' => Payment::where('advertiser_id', $advertiserId)
                ->whereIn('status', ['pending', 'processing'])
                ->sum('amount'),
        ];

        return response()->json([
            'success' => true,
            'stats' => $stats
        ]);
    }
}