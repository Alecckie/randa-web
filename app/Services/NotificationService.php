<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Log;

class NotificationService
{
    /**
     * Send notification via multiple channels
     */
    public function sendNotification(
        User $user, 
        string $message, 
        string $subject = null,
        array $channels = ['email', 'app', 'sms']
    ): array {
        $results = [];

        if (in_array('email', $channels) && $user->email) {
            $results['email'] = $this->sendEmail($user, $subject ?? 'Notification', $message);
        }

        if (in_array('app', $channels)) {
            $results['app'] = $this->sendAppNotification($user, $message);
        }

        if (in_array('sms', $channels) && $user->phone) {
            $results['sms'] = $this->sendSMS($user, $message);
        }

        return $results;
    }

    /**
     * Send email notification
     */
    private function sendEmail(User $user, string $subject, string $message): bool
    {
        try {
            Mail::raw($message, function ($mail) use ($user, $subject) {
                $mail->to($user->email)
                     ->subject($subject);
            });
            return true;
        } catch (\Exception $e) {
            Log::error('Email notification failed', [
                'user_id' => $user->id,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Send app notification (database notification)
     */
    private function sendAppNotification(User $user, string $message): bool
    {
        try {
            $user->notifications()->create([
                'id' => \Str::uuid(),
                'type' => 'App\Notifications\GeneralNotification',
                'data' => [
                    'message' => $message,
                    'created_at' => now()
                ],
                'created_at' => now(),
                'updated_at' => now()
            ]);
            return true;
        } catch (\Exception $e) {
            Log::error('App notification failed', [
                'user_id' => $user->id,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Send SMS notification (placeholder - integrate with SMS provider)
     */
    private function sendSMS(User $user, string $message): bool
    {
        try {
            // TODO: Integrate with SMS provider (e.g., Twilio, Africa's Talking)
            Log::info('SMS notification sent', [
                'user_id' => $user->id,
                'phone' => $user->phone,
                'message' => $message
            ]);
            return true;
        } catch (\Exception $e) {
            Log::error('SMS notification failed', [
                'user_id' => $user->id,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Send profile completion reminder
     */
    public function sendProfileCompletionReminder(User $user): array
    {
        $message = "Hi {$user->first_name}, please complete your rider profile by uploading the required documents to start earning with us.";
        $subject = "Complete Your Rider Profile - Randa";
        
        return $this->sendNotification($user, $message, $subject);
    }
}