<?php

namespace App\Services\Payments;

use App\Models\Payment;
use App\Events\PaymentStatusUpdated;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
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
    protected string $queryUrl;
    protected string $callbackUrl;

    public function __construct()
    {
        $this->consumerKey = config('mpesa.consumer_key');
        $this->consumerSecret = config('mpesa.consumer_secret');
        $this->businessShortCode = config('mpesa.business_short_code');
        $this->passkey = config('mpesa.passkey');
        $this->apiUrl = config('mpesa.api_url');
        $this->tokenUrl = config('mpesa.token_url');
        $this->queryUrl = config('mpesa.query_url');
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
     * Generate user-friendly payment reference using phone number
     */
    protected function generatePaymentReference(string $phoneNumber): string
    {
        return Payment::generatePaymentReference($phoneNumber);
    }

    /**
     * Initiate STK Push payment
     */
    public function initiateStkPush(array $data): array
    {
        try {
            $accessToken = $this->generateAccessToken();
            
            if (!$accessToken) {
                return [
                    'success' => false,
                    'message' => 'Failed to generate M-Pesa access token'
                ];
            }

            $phoneNumber = $this->formatPhoneNumber($data['phone_number']);
            if (!$phoneNumber) {
                return [
                    'success' => false,
                    'message' => 'Invalid phone number format. Use 254XXXXXXXXX'
                ];
            }

            $timestamp = $this->generateTimestamp();
            $password = $this->generatePassword($timestamp);
            $paymentReference = $this->generatePaymentReference($phoneNumber);

            // Create payment record with phone number as paybill account
            $payment = $this->createPaymentRecord([
                'campaign_id' => $data['campaign_id'] ?? null,
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
                'AccountReference' => $phoneNumber, // Use phone number as account reference
                'TransactionDesc' => $data['description'] ?? 'Campaign Payment'
            ];

            Log::info('Initiating M-Pesa STK Push', [
                'payment_id' => $payment->id,
                'reference' => $paymentReference,
                'phone_number' => $phoneNumber,
                'amount' => $data['amount']
            ]);

            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $accessToken,
                'Content-Type' => 'application/json',
            ])->post($this->apiUrl, $stkPayload);

            $responseData = $response->json();

            // Update payment with gateway response
            $this->updatePaymentWithGatewayResponse($payment, $responseData);

            if ($response->successful() && isset($responseData['ResponseCode']) && $responseData['ResponseCode'] == '0') {
                $payment->incrementStkAttempts();
                
                Log::info('STK Push initiated successfully', [
                    'payment_id' => $payment->id,
                    'checkout_request_id' => $responseData['CheckoutRequestID'] ?? null
                ]);

                return [
                    'success' => true,
                    'message' => 'Payment request sent successfully',
                    'reference' => $paymentReference,
                    'payment_id' => $payment->id,
                    'checkout_request_id' => $responseData['CheckoutRequestID'] ?? null,
                    'phone_number' => $phoneNumber,
                    'paybill_details' => $payment->getPaybillDetails(), // Include paybill option
                ];
            }

            // STK Push failed - provide paybill fallback
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
                'message' => $errorMessage,
                'payment_id' => $payment->id,
                'reference' => $paymentReference,
                'paybill_details' => $payment->getPaybillDetails(), // Provide paybill fallback
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
     * Query payment status from M-Pesa
     */
    public function queryPaymentStatus(string $checkoutRequestId, int $paymentId): array
    {
        try {
            $payment = Payment::find($paymentId);
            
            if (!$payment) {
                return ['success' => false, 'message' => 'Payment not found'];
            }

            $payment->recordQueryAttempt();

            $accessToken = $this->generateAccessToken();
            
            if (!$accessToken) {
                return ['success' => false, 'message' => 'Failed to generate access token'];
            }

            $timestamp = $this->generateTimestamp();
            $password = $this->generatePassword($timestamp);

            Log::info('Querying M-Pesa payment status', [
                'payment_id' => $paymentId,
                'checkout_request_id' => $checkoutRequestId
            ]);

            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $accessToken,
                'Content-Type' => 'application/json',
            ])->post($this->queryUrl, [
                'BusinessShortCode' => $this->businessShortCode,
                'Password' => $password,
                'Timestamp' => $timestamp,
                'CheckoutRequestID' => $checkoutRequestId
            ]);

            $responseData = $response->json();

            if ($response->successful() && isset($responseData['ResultCode'])) {
                if ($responseData['ResultCode'] == '0') {
                    // Payment was successful
                    $payment->update([
                        'status' => 'completed',
                        'completed_at' => now(),
                        'verification_method' => 'query_api',
                        'status_message' => 'Payment verified via Query API',
                        'payment_details' => array_merge($payment->payment_details ?? [], [
                            'query_result' => $responseData
                        ])
                    ]);

                    broadcast(new PaymentStatusUpdated($payment, 'success'))->toOthers();

                    return [
                        'success' => true,
                        'status' => 'completed',
                        'message' => 'Payment confirmed',
                        'data' => $responseData
                    ];
                } else {
                    // Payment failed or still pending
                    $resultDesc = $responseData['ResultDesc'] ?? 'Payment not completed';
                    
                    return [
                        'success' => false,
                        'status' => 'pending',
                        'message' => $resultDesc,
                        'data' => $responseData
                    ];
                }
            }

            return [
                'success' => false,
                'message' => 'Failed to query payment status',
                'data' => $responseData
            ];

        } catch (Exception $e) {
            Log::error('Payment status query error', [
                'error' => $e->getMessage(),
                'payment_id' => $paymentId
            ]);

            return [
                'success' => false,
                'message' => 'Error querying payment: ' . $e->getMessage()
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
            'verification_method' => 'auto_callback', // Default, may change later
            'phone_number' => $data['phone_number'],
            'paybill_account_number' => $data['phone_number'], // Phone as account number
            'status' => 'pending',
            'initiated_at' => now(),
            'metadata' => [
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

            $payment = Payment::where('gateway_transaction_id', $checkoutRequestID)->first();

            if (!$payment) {
                Log::error('Payment not found for callback', ['checkout_request_id' => $checkoutRequestID]);
                return false;
            }

            $callbackMetadata = $callbackData['Body']['stkCallback']['CallbackMetadata']['Item'] ?? [];
            $metadata = $this->extractCallbackMetadata($callbackMetadata);

            if ($resultCode == 0) {
                // Payment successful
                $payment->update([
                    'status' => 'completed',
                    'status_message' => 'Payment completed successfully',
                    'completed_at' => now(),
                    'mpesa_receipt_number' => $metadata['mpesa_receipt_number'] ?? null,
                    'verification_method' => 'auto_callback',
                    'payment_details' => array_merge($payment->payment_details ?? [], [
                        'callback' => $callbackData,
                        'mpesa_receipt' => $metadata['mpesa_receipt_number'] ?? null,
                        'transaction_date' => $metadata['transaction_date'] ?? null
                    ])
                ]);

                // Update campaign status
                if ($payment->campaign) {
                    $payment->campaign->update([
                        'status' => 'paid',
                        'payment_verification_status' => 'verified'
                    ]);
                }

                Log::info('Payment completed successfully', [
                    'payment_id' => $payment->id,
                    'reference' => $payment->payment_reference,
                    'mpesa_receipt' => $metadata['mpesa_receipt_number'] ?? null
                ]);

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
     * Verify manual M-Pesa receipt - requires admin approval
     */
    public function verifyManualReceipt(array $data): array
    {
        try {
            Log::info('Manual receipt verification initiated', [
                'receipt_number' => $data['receipt_number'],
                'amount' => $data['amount'],
                'phone_number' => $data['phone_number']
            ]);

            // Check if receipt already used
            $existingPayment = Payment::where('mpesa_receipt_number', $data['receipt_number'])->first();

            if ($existingPayment) {
                return [
                    'success' => false,
                    'message' => 'This receipt number has already been used for another payment.'
                ];
            }

            // Validate receipt format
            if (!$this->isValidReceiptFormat($data['receipt_number'])) {
                return [
                    'success' => false,
                    'message' => 'Invalid M-Pesa receipt format. Receipt should be like: SH12ABC34'
                ];
            }

            $paymentReference = $this->generatePaymentReference($data['phone_number']);

            // Create payment record requiring admin approval
            $payment = Payment::create([
                'campaign_id' => $data['campaign_id'] ?? null,
                'advertiser_id' => $data['advertiser_id'],
                'payment_reference' => $paymentReference,
                'amount' => $data['amount'],
                'currency' => 'KES',
                'payment_method' => 'mpesa',
                'payment_gateway' => 'safaricom_mpesa',
                'verification_method' => 'manual_receipt',
                'mpesa_receipt_number' => $data['receipt_number'],
                'phone_number' => $data['phone_number'],
                'paybill_account_number' => $data['phone_number'],
                'status' => 'pending_verification',
                'status_message' => 'Manual receipt submitted - pending admin verification',
                'requires_admin_approval' => true,
                'initiated_at' => now(),
                'metadata' => [
                    'campaign_data' => $data['campaign_data'] ?? null,
                    'verification_method' => 'manual_receipt',
                    'submitted_at' => now()->toIso8601String()
                ],
                'payment_details' => [
                    'mpesa_receipt' => $data['receipt_number'],
                    'manual_verification' => true,
                    'user_submitted' => true
                ]
            ]);

            // Update campaign to awaiting verification
            if ($data['campaign_id']) {
                $campaign = \App\Models\Campaign::find($data['campaign_id']);
                if ($campaign) {
                    $campaign->update([
                        'payment_id' => $payment->id,
                        'payment_verification_status' => 'awaiting_admin'
                    ]);
                }
            }

            Log::info('Manual receipt submitted for verification', [
                'payment_id' => $payment->id,
                'receipt_number' => $data['receipt_number']
            ]);

            return [
                'success' => true,
                'message' => 'Receipt submitted successfully. Your payment is pending admin verification.',
                'reference' => $paymentReference,
                'payment_id' => $payment->id,
                'receipt_number' => $data['receipt_number'],
                'requires_approval' => true,
                'status' => 'pending_verification'
            ];

        } catch (Exception $e) {
            Log::error('Manual receipt verification error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return [
                'success' => false,
                'message' => 'An error occurred while verifying the receipt: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Generate paybill payment instructions
     */
    public function generatePaybillInstructions(int $paymentId): array
    {
        try {
            $payment = Payment::find($paymentId);
            
            if (!$payment) {
                return ['success' => false, 'message' => 'Payment not found'];
            }

            $instructions = [
                'paybill_number' => $this->businessShortCode,
                'account_number' => $payment->phone_number,
                'amount' => $payment->amount,
                'steps' => [
                    '1. Go to M-Pesa menu on your phone',
                    '2. Select Lipa na M-Pesa',
                    '3. Select Pay Bill',
                    '4. Enter Business Number: ' . $this->businessShortCode,
                    '5. Enter Account Number: ' . $payment->phone_number,
                    '6. Enter Amount: ' . $payment->amount,
                    '7. Enter your M-Pesa PIN',
                    '8. Confirm the transaction',
                    '9. You will receive an M-Pesa receipt (e.g., SH12ABC34)',
                    '10. Enter the receipt number in the form below'
                ]
            ];

            // Update payment with instructions sent
            $payment->update([
                'paybill_instructions_sent' => now()->toIso8601String()
            ]);

            return [
                'success' => true,
                'instructions' => $instructions
            ];

        } catch (Exception $e) {
            Log::error('Error generating paybill instructions', [
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'message' => 'Error generating instructions'
            ];
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
        $phoneNumber = preg_replace('/[^0-9]/', '', $phoneNumber);

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

    /**
     * Validate M-Pesa receipt number format
     */
    protected function isValidReceiptFormat(string $receiptNumber): bool
    {
        // M-Pesa receipt format: 2 letters followed by alphanumeric (8-20 chars total)
        return preg_match('/^[A-Z]{2}[A-Z0-9]{6,18}$/i', $receiptNumber) === 1;
    }
}