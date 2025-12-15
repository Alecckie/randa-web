<?php

namespace App\Services\Payments;

use App\Models\Payment;
use App\Events\PaymentStatusUpdated;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Carbon\Carbon;
use Exception;

class MpesaService
{
    protected string $consumerKey;
    protected string $consumerSecret;
    protected string $businessShortCode;
    protected string $passkey;
    protected string $apiUrl;
    protected string $tokenUrl;
    protected string $callbackUrl;

    public function __construct()
    {
        $this->consumerKey = config('mpesa.consumer_key');
        $this->consumerSecret = config('mpesa.consumer_secret');
        $this->businessShortCode = config('mpesa.business_short_code');
        $this->passkey = config('mpesa.passkey');
        $this->apiUrl = config('mpesa.api_url');
        $this->tokenUrl = config('mpesa.token_url');
        $this->callbackUrl = config('mpesa.callback_url');
    }

    /**
     * Generate M-Pesa access token
     */
    protected function generateAccessToken(): ?string
    {
        try {
            $credentials = base64_encode($this->consumerKey . ':' . $this->consumerSecret);

            $response = Http::withHeaders([
                'Authorization' => 'Basic ' . $credentials,
            ])->get($this->tokenUrl);

            if ($response->successful()) {
                return $response->json()['access_token'];
            }

            Log::error('M-Pesa token generation failed', [
                'response' => $response->json(),
                'status' => $response->status()
            ]);

            return null;
        } catch (Exception $e) {
            Log::error('M-Pesa token generation error', [
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Generate password for STK Push
     */
    protected function generatePassword(string $timestamp): string
    {
        return base64_encode($this->businessShortCode . $this->passkey . $timestamp);
    }

    /**
     * Generate timestamp in M-Pesa format
     */
    protected function generateTimestamp(): string
    {
        return Carbon::now()->format('YmdHis');
    }

    /**
     * Generate unique payment reference
     */
    protected function generatePaymentReference(): string
    {
        return 'CPG' . strtoupper(Str::random(10)) . time();
    }

    /**
     * Initiate STK Push payment
     *
     * @param array $data
     * @return array
     */
    public function initiateStkPush(array $data): array
    {
        try {
            // Generate access token
            $accessToken = $this->generateAccessToken();
            
            if (!$accessToken) {
                return [
                    'success' => false,
                    'message' => 'Failed to generate M-Pesa access token'
                ];
            }

            // Validate phone number format
            $phoneNumber = $this->formatPhoneNumber($data['phone_number']);
            if (!$phoneNumber) {
                return [
                    'success' => false,
                    'message' => 'Invalid phone number format. Use 254XXXXXXXXX'
                ];
            }

            // Generate timestamp and password
            $timestamp = $this->generateTimestamp();
            $password = $this->generatePassword($timestamp);
            $paymentReference = $this->generatePaymentReference();

            // Create payment record
            $payment = $this->createPaymentRecord([
                'campaign_id' => $data['campaign_id'] ?? 4,
                'advertiser_id' => $data['advertiser_id'],
                'amount' => $data['amount'],
                'phone_number' => $phoneNumber,
                'reference' => $paymentReference,
                'campaign_data' => $data['campaign_data'] ?? null,
            ]);

            // Prepare STK Push request
            $stkPayload = [
                'BusinessShortCode' => $this->businessShortCode,
                'Password' => $password,
                'Timestamp' => $timestamp,
                'TransactionType' => 'CustomerPayBillOnline',
                'Amount' => (int) $data['amount'],
                'PartyA' => $phoneNumber,
                'PartyB' => $this->businessShortCode,
                'PhoneNumber' => $phoneNumber,
                'CallBackURL' => $this->callbackUrl,
                'AccountReference' => $paymentReference,
                'TransactionDesc' => $data['description'] ?? 'Campaign Payment'
            ];

            Log::info('Initiating M-Pesa STK Push', [
                'payment_id' => $payment->id,
                'reference' => $paymentReference,
                'amount' => $data['amount']
            ]);

            // Send STK Push request
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $accessToken,
                'Content-Type' => 'application/json',
            ])->post($this->apiUrl, $stkPayload);

            $responseData = $response->json();

            // Update payment with gateway response
            $this->updatePaymentWithGatewayResponse($payment, $responseData);

            if ($response->successful() && isset($responseData['ResponseCode']) && $responseData['ResponseCode'] == '0') {
                Log::info('STK Push initiated successfully', [
                    'payment_id' => $payment->id,
                    'checkout_request_id' => $responseData['CheckoutRequestID'] ?? null
                ]);

                return [
                    'success' => true,
                    'message' => 'Payment request sent successfully',
                    'reference' => $paymentReference,
                    'payment_id' => $payment->id,
                    'checkout_request_id' => $responseData['CheckoutRequestID'] ?? null
                ];
            }

            // STK Push failed
            $errorMessage = $responseData['errorMessage'] ?? $responseData['ResponseDescription'] ?? 'Payment initiation failed';
            
            $payment->update([
                'status' => 'failed',
                'status_message' => $errorMessage,
                'failed_at' => now()
            ]);

            Log::error('STK Push initiation failed', [
                'payment_id' => $payment->id,
                'response' => $responseData
            ]);

            return [
                'success' => false,
                'message' => $errorMessage
            ];

        } catch (Exception $e) {
            Log::error('STK Push error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return [
                'success' => false,
                'message' => 'An error occurred while processing payment: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Create initial payment record
     */
    protected function createPaymentRecord(array $data): Payment
    {
        return Payment::create([
            'campaign_id' => $data['campaign_id'],
            'advertiser_id' => $data['advertiser_id'],
            'payment_reference' => $data['reference'],
            'amount' => $data['amount'],
            'currency' => 'KES',
            'payment_method' => 'mpesa',
            'payment_gateway' => 'safaricom_mpesa',
            'status' => 'pending',
            'initiated_at' => now(),
            'metadata' => [
                'phone_number' => $data['phone_number'],
                'campaign_data' => $data['campaign_data']
            ]
        ]);
    }

    /**
     * Update payment with gateway response
     */
    protected function updatePaymentWithGatewayResponse(Payment $payment, array $response): void
    {
        $payment->update([
            'gateway_reference' => $response['MerchantRequestID'] ?? null,
            'gateway_transaction_id' => $response['CheckoutRequestID'] ?? null,
            'payment_details' => $response,
            'status' => isset($response['ResponseCode']) && $response['ResponseCode'] == '0' ? 'processing' : 'failed',
            'processed_at' => now()
        ]);
    }

    /**
     * Process M-Pesa callback
     */
    public function processCallback(array $callbackData): bool
    {
        try {
            Log::info('Processing M-Pesa callback', ['data' => $callbackData]);

            $resultCode = $callbackData['Body']['stkCallback']['ResultCode'] ?? null;
            $checkoutRequestID = $callbackData['Body']['stkCallback']['CheckoutRequestID'] ?? null;

            if (!$checkoutRequestID) {
                Log::error('Callback missing CheckoutRequestID', ['data' => $callbackData]);
                return false;
            }

            // Find payment by checkout request ID
            $payment = Payment::where('gateway_transaction_id', $checkoutRequestID)->first();

            if (!$payment) {
                Log::error('Payment not found for callback', ['checkout_request_id' => $checkoutRequestID]);
                return false;
            }

            // Extract callback metadata
            $callbackMetadata = $callbackData['Body']['stkCallback']['CallbackMetadata']['Item'] ?? [];
            $metadata = $this->extractCallbackMetadata($callbackMetadata);

            if ($resultCode == 0) {
                // Payment successful
                $payment->update([
                    'status' => 'completed',
                    'status_message' => 'Payment completed successfully',
                    'completed_at' => now(),
                    'payment_details' => array_merge($payment->payment_details ?? [], [
                        'callback' => $callbackData,
                        'mpesa_receipt' => $metadata['mpesa_receipt_number'] ?? null,
                        'transaction_date' => $metadata['transaction_date'] ?? null
                    ])
                ]);

                Log::info('Payment completed successfully', [
                    'payment_id' => $payment->id,
                    'reference' => $payment->payment_reference,
                    'mpesa_receipt' => $metadata['mpesa_receipt_number'] ?? null
                ]);

                // Broadcast payment success event
                broadcast(new PaymentStatusUpdated($payment, 'success'))->toOthers();

            } else {
                // Payment failed
                $resultDesc = $callbackData['Body']['stkCallback']['ResultDesc'] ?? 'Payment failed';
                
                $payment->update([
                    'status' => 'failed',
                    'status_message' => $resultDesc,
                    'failed_at' => now(),
                    'payment_details' => array_merge($payment->payment_details ?? [], [
                        'callback' => $callbackData
                    ])
                ]);

                Log::warning('Payment failed', [
                    'payment_id' => $payment->id,
                    'reference' => $payment->payment_reference,
                    'result_code' => $resultCode,
                    'result_desc' => $resultDesc
                ]);

                // Broadcast payment failure event
                broadcast(new PaymentStatusUpdated($payment, 'failed'))->toOthers();
            }

            return true;

        } catch (Exception $e) {
            Log::error('Callback processing error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return false;
        }
    }

    /**
     * Extract metadata from callback
     */
    protected function extractCallbackMetadata(array $items): array
    {
        $metadata = [];

        foreach ($items as $item) {
            $name = $item['Name'] ?? '';
            $value = $item['Value'] ?? null;

            switch ($name) {
                case 'MpesaReceiptNumber':
                    $metadata['mpesa_receipt_number'] = $value;
                    break;
                case 'TransactionDate':
                    $metadata['transaction_date'] = $value;
                    break;
                case 'PhoneNumber':
                    $metadata['phone_number'] = $value;
                    break;
                case 'Amount':
                    $metadata['amount'] = $value;
                    break;
            }
        }

        return $metadata;
    }

    /**
     * Format phone number to M-Pesa format (254XXXXXXXXX)
     */
    protected function formatPhoneNumber(string $phoneNumber): ?string
    {
        // Remove any spaces, dashes, or special characters
        $phoneNumber = preg_replace('/[^0-9]/', '', $phoneNumber);

        // Handle different formats
        if (str_starts_with($phoneNumber, '254') && strlen($phoneNumber) == 12) {
            return $phoneNumber;
        }

        if (str_starts_with($phoneNumber, '0') && strlen($phoneNumber) == 10) {
            return '254' . substr($phoneNumber, 1);
        }

        if (str_starts_with($phoneNumber, '7') && strlen($phoneNumber) == 9) {
            return '254' . $phoneNumber;
        }

        return null;
    }

    public function verifyManualReceipt(array $data): array
{
    try {
        Log::info('Manual receipt verification initiated', [
            'receipt_number' => $data['receipt_number'],
            'amount' => $data['amount'],
            'phone_number' => $data['phone_number']
        ]);

        // Check if this receipt number has already been used
        $existingPayment = Payment::where('payment_details->mpesa_receipt', $data['receipt_number'])
            ->first();

        if ($existingPayment) {
            Log::warning('Duplicate receipt number attempted', [
                'receipt_number' => $data['receipt_number'],
                'existing_payment_id' => $existingPayment->id
            ]);

            return [
                'success' => false,
                'message' => 'This receipt number has already been used for another payment.'
            ];
        }

        // Generate unique payment reference
        $paymentReference = $this->generatePaymentReference();

        // Create payment record with manual verification
        $payment = Payment::create([
            'campaign_id' => $data['campaign_id'] ?? null,
            'advertiser_id' => $data['advertiser_id'],
            'payment_reference' => $paymentReference,
            'amount' => $data['amount'],
            'currency' => 'KES',
            'payment_method' => 'mpesa',
            'payment_gateway' => 'safaricom_mpesa',
            'status' => 'pending_verification',
            'status_message' => 'Manual receipt submitted - pending verification',
            'initiated_at' => now(),
            'metadata' => [
                'phone_number' => $data['phone_number'],
                'campaign_data' => $data['campaign_data'] ?? null,
                'verification_method' => 'manual_receipt'
            ],
            'payment_details' => [
                'mpesa_receipt' => $data['receipt_number'],
                'manual_verification' => true,
                'submitted_at' => now()->toIso8601String()
            ]
        ]);

        // Validate receipt format
        if ($this->isValidReceiptFormat($data['receipt_number'])) {
            $payment->update([
                'status' => 'completed',
                'status_message' => 'Payment verified via manual receipt',
                'completed_at' => now(),
                'processed_at' => now()
            ]);

            Log::info('Manual receipt verified successfully', [
                'payment_id' => $payment->id,
                'receipt_number' => $data['receipt_number']
            ]);

            // Broadcast payment success event
            broadcast(new PaymentStatusUpdated($payment, 'success'))->toOthers();

            return [
                'success' => true,
                'message' => 'Payment verified successfully',
                'reference' => $paymentReference,
                'payment_id' => $payment->id,
                'receipt_number' => $data['receipt_number']
            ];
        }

        // Receipt format validation failed
        $payment->update([
            'status' => 'failed',
            'status_message' => 'Invalid receipt format',
            'failed_at' => now()
        ]);

        return [
            'success' => false,
            'message' => 'Invalid M-Pesa receipt format. Please check and try again.'
        ];

    } catch (Exception $e) {
        Log::error('Manual receipt verification error', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString(),
            'receipt_number' => $data['receipt_number'] ?? 'N/A'
        ]);

        return [
            'success' => false,
            'message' => 'An error occurred while verifying the receipt: ' . $e->getMessage()
        ];
    }
}

/**
 * Validate M-Pesa receipt number format
 */
protected function isValidReceiptFormat(string $receiptNumber): bool
{
    // M-Pesa receipt format: 2 letters followed by alphanumeric (8-20 chars total)
    return preg_match('/^[A-Z]{2}[A-Z0-9]{6,18}$/i', $receiptNumber) === 1;
}

    /**
     * Query payment status from M-Pesa
     */
    public function queryPaymentStatus(string $checkoutRequestId): array
    {
        try {
            $accessToken = $this->generateAccessToken();
            
            if (!$accessToken) {
                return [
                    'success' => false,
                    'message' => 'Failed to generate access token'
                ];
            }

            $timestamp = $this->generateTimestamp();
            $password = $this->generatePassword($timestamp);

            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $accessToken,
                'Content-Type' => 'application/json',
            ])->post(config('mpesa.query_url'), [
                'BusinessShortCode' => $this->businessShortCode,
                'Password' => $password,
                'Timestamp' => $timestamp,
                'CheckoutRequestID' => $checkoutRequestId
            ]);

            return [
                'success' => $response->successful(),
                'data' => $response->json()
            ];

        } catch (Exception $e) {
            Log::error('Payment status query error', [
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }
}