<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Payments\MpesaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class MpesaCallbackController extends Controller
{
    protected MpesaService $mpesa_service;

    public function __construct(MpesaService $mpesa_service)
    {
        $this->mpesa_service = $mpesa_service;
    }

    /**
     * Handle M-Pesa STK Push callback
     */
    public function handleCallback(Request $request): JsonResponse
    {
        // Log incoming callback
        Log::info('M-Pesa callback received', [
            'body' => $request->all(),
            'headers' => $request->headers->all()
        ]);

        try {
            // Process the callback
            $success = $this->mpesa_service->processCallback($request->all());

            if ($success) {
                return response()->json([
                    'ResultCode' => 0,
                    'ResultDesc' => 'Callback processed successfully'
                ]);
            }

            return response()->json([
                'ResultCode' => 1,
                'ResultDesc' => 'Callback processing failed'
            ], 400);
        } catch (\Exception $e) {
            Log::error('Callback handling error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'ResultCode' => 1,
                'ResultDesc' => 'Internal server error'
            ], 500);
        }
    }

    /**
     * Handle M-Pesa timeout callback
     */
    public function handleTimeout(Request $request): JsonResponse
    {
        Log::warning('M-Pesa timeout callback received', [
            'body' => $request->all()
        ]);

        // You can handle timeout logic here if needed
        // For example, mark payment as timeout

        return response()->json([
            'ResultCode' => 0,
            'ResultDesc' => 'Timeout acknowledged'
        ]);
    }
}
