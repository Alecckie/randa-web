<?php

namespace App\Events;

use App\Models\Payment;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class PaymentStatusUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public Payment $payment;
    public string $status;

    /**
     * Create a new event instance.
     */
    public function __construct(Payment $payment, string $status)
    {
        $this->payment = $payment;
        $this->status = $status;

        Log::info('PaymentStatusUpdated event created', [
            'payment_id' => $payment->id,
            'advertiser_id' => $payment->advertiser_id,
            'status' => $status,
            'reference' => $payment->payment_reference,
            'mpesa_receipt' => $payment->getMpesaReceipt()
        ]);
    }

    /**
     * Get the channels the event should broadcast on.
     */
    public function broadcastOn(): Channel
    {

        $channel = new PrivateChannel('payment.' . $this->payment->advertiser_id);

        Log::info('Broadcasting on channel', [
            'channel' => "payment.{$this->payment->advertiser_id}",
            'mpesa_receipt' => $this->payment->getMpesaReceipt()
        ]);

        return $channel;
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'payment.status.updated';
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        $mpesaReceipt = $this->payment->getMpesaReceipt();

        Log::info('Broadcasting payment data', [
            'payment_id' => $this->payment->id,
            'reference' => $this->payment->payment_reference,
            'mpesa_receipt' => $mpesaReceipt,
            'mpesa_receipt_number_column' => $this->payment->mpesa_receipt_number,
            'status' => $this->status
        ]);

        return [
            'payment_id' => $this->payment->id,
            'reference' => $this->payment->payment_reference,
            'amount' => $this->payment->amount,
            'currency' => $this->payment->currency,
            'status' => $this->status,
            'message' => $this->getStatusMessage(),
            'mpesa_receipt' => $mpesaReceipt,
            'timestamp' => now()->toIso8601String(),
            'show_fallback_options' => $this->status === 'failed',
            'can_retry_stk' => $this->payment->can_retry_stk,
            'paybill_details' => $this->status === 'failed' ? $this->payment->getPaybillDetails() : null,
        ];
    }

    /**
     * Get user-friendly status message
     */
    protected function getStatusMessage(): string
    {
        return match ($this->status) {
            'success' => 'Payment completed successfully',
            'failed' => $this->payment->status_message ?? 'Payment failed',
            'pending' => 'Payment is being processed',
            'timeout' => 'Payment request timed out',
            default => 'Payment status updated'
        };
    }
}
