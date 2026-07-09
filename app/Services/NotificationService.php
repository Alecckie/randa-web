<?php

namespace App\Services;

use App\Models\Advertiser;
use App\Models\Campaign;
use App\Models\CampaignAssignment;
use App\Models\Payment;
use App\Models\Rider;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class NotificationService
{
    /**
     * Create an in-app database notification for a single user.
     */
    public function notify(
        User $user,
        string $title,
        string $body,
        string $type = 'info',
        ?string $link = null
    ): bool {
        try {
            $user->notifications()->create([
                'id'   => Str::uuid(),
                'type' => 'App\Notifications\GeneralNotification',
                'data' => [
                    'title' => $title,
                    'body'  => $body,
                    'type'  => $type,
                    'link'  => $link,
                ],
            ]);
            return true;
        } catch (\Exception $e) {
            Log::error('App notification failed', ['user_id' => $user->id, 'error' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * Send an in-app notification to all admin users.
     */
    public function notifyAdmins(string $title, string $body, string $type = 'info', ?string $link = null): void
    {
        User::where('role', 'admin')->get()->each(
            fn(User $admin) => $this->notify($admin, $title, $body, $type, $link)
        );
    }

    // ── Rider events ─────────────────────────────────────────────────────────────

    public function notifyRiderApplicationReceived(Rider $rider): void
    {
        $name = $rider->user->full_name ?? $rider->user->name;
        $this->notifyAdmins(
            'New Rider Application',
            "{$name} has completed their profile and is awaiting approval.",
            'info',
            "/riders/{$rider->id}"
        );
    }

    public function notifyRiderApproved(Rider $rider): void
    {
        $this->notify(
            $rider->user,
            'Application Approved!',
            'Your rider application has been approved. You can now start working with RANDA.',
            'success',
            '/rider/rider-dash'
        );
    }

    public function notifyRiderRejected(Rider $rider, string $reason): void
    {
        $this->notify(
            $rider->user,
            'Application Not Approved',
            "Your rider application was not approved. Reason: {$reason}",
            'error',
            '/rider/show-profile'
        );
    }

    // ── Advertiser events ─────────────────────────────────────────────────────────

    public function notifyAdvertiserRegistered(User $user): void
    {
        $name = $user->full_name ?? $user->name;
        $this->notifyAdmins(
            'New Advertiser Registration',
            "{$name} has registered as an advertiser.",
            'info',
            '/advertisers'
        );
    }

    public function notifyAdvertiserApproved(Advertiser $advertiser): void
    {
        $this->notify(
            $advertiser->user,
            'Account Approved!',
            'Your advertiser account has been approved. You can now create campaigns.',
            'success',
            '/advert-dash'
        );
    }

    public function notifyAdvertiserRejected(Advertiser $advertiser, string $reason): void
    {
        $this->notify(
            $advertiser->user,
            'Account Not Approved',
            "Your advertiser account was not approved. Reason: {$reason}",
            'error',
            '/profile/edit'
        );
    }

    // ── Payment events ───────────────────────────────────────────────────────────

    public function notifyPaymentSubmitted(Payment $payment): void
    {
        $campaignName = $payment->campaign->name ?? 'a campaign';
        $this->notifyAdmins(
            'Payment Awaiting Verification',
            'A manual M-Pesa receipt for KES ' . number_format((float) $payment->amount, 2) . " on \"{$campaignName}\" needs review.",
            'info',
            "/campaigns/{$payment->campaign_id}"
        );
    }

    public function notifyPaymentApproved(Payment $payment): void
    {
        if (!$payment->advertiser?->user) {
            return;
        }

        $campaignName = $payment->campaign->name ?? 'your campaign';
        $this->notify(
            $payment->advertiser->user,
            'Payment Approved',
            'Your payment of KES ' . number_format((float) $payment->amount, 2) . " for \"{$campaignName}\" has been confirmed. Your campaign is now active.",
            'success',
            "/my-campaigns/{$payment->campaign_id}"
        );
    }

    public function notifyPaymentRejected(Payment $payment, string $reason): void
    {
        if (!$payment->advertiser?->user) {
            return;
        }

        $campaignName = $payment->campaign->name ?? 'your campaign';
        $this->notify(
            $payment->advertiser->user,
            'Payment Rejected',
            "Your payment submission for \"{$campaignName}\" was rejected. Reason: {$reason}. Please submit a new receipt or contact support.",
            'error',
            "/my-campaigns/{$payment->campaign_id}"
        );
    }

    public function notifyPaymentRecorded(Payment $payment): void
    {
        if (!$payment->advertiser?->user) {
            return;
        }

        $campaignName = $payment->campaign->name ?? 'your campaign';
        $this->notify(
            $payment->advertiser->user,
            'Payment Recorded',
            'A payment of KES ' . number_format((float) $payment->amount, 2) . " has been recorded for \"{$campaignName}\". Your campaign is now active.",
            'success',
            "/my-campaigns/{$payment->campaign_id}"
        );
    }

    // ── Assignment events ────────────────────────────────────────────────────────

    public function notifyRiderAssigned(CampaignAssignment $assignment): void
    {
        if (!$assignment->rider?->user) {
            return;
        }

        $campaignName = $assignment->campaign->name ?? 'a campaign';
        $helmetCode = $assignment->helmet->helmet_code ?? 'N/A';

        $this->notify(
            $assignment->rider->user,
            'New Campaign Assignment',
            "You've been assigned to \"{$campaignName}\" with helmet {$helmetCode}. Check in when you're ready to start.",
            'success',
            '/rider/campaigns'
        );
    }

    public function notifyRiderHelmetReturnRequired(CampaignAssignment $assignment): void
    {
        if (!$assignment->rider?->user) {
            return;
        }

        $campaignName = $assignment->campaign->name ?? 'your campaign';
        $helmetCode = $assignment->helmet->helmet_code ?? 'your helmet';

        $this->notify(
            $assignment->rider->user,
            'Campaign Complete — Return Your Helmet',
            "\"{$campaignName}\" has ended. Please return helmet {$helmetCode} to the RANDA dropoff point as soon as possible.",
            'warning',
            '/rider/campaigns'
        );
    }

    // ── Shift events ─────────────────────────────────────────────────────────────

    public function notifyRiderShiftNotQualified(Rider $rider, float $workedHours, float $minQualifyingHours): void
    {
        if (!$rider->user) {
            return;
        }

        $this->notify(
            $rider->user,
            'No Payment Recorded for Today',
            sprintf(
                'Your shift ended after %.1f hour(s) worked, below the %.1f-hour minimum required to qualify for payment. No earnings were recorded for today.',
                $workedHours,
                $minQualifyingHours
            ),
            'warning',
            '/rider/rider-dash'
        );
    }

    public function notifyRiderShiftAutoClosed(
        Rider $rider,
        \Carbon\Carbon $shiftDate,
        float $workedHours,
        float $dailyEarning,
        bool $qualifies
    ): void {
        if (!$rider->user) {
            return;
        }

        $body = $qualifies
            ? sprintf(
                'Your shift on %s was automatically closed at the daily cutoff because it was never checked out. You worked %.1f hour(s) and earned KSh %.2f.',
                $shiftDate->format('M j, Y'),
                $workedHours,
                $dailyEarning
            )
            : sprintf(
                'Your shift on %s was automatically closed at the daily cutoff because it was never checked out. You worked %.1f hour(s), below the qualifying minimum, so no earnings were recorded.',
                $shiftDate->format('M j, Y'),
                $workedHours
            );

        $this->notify(
            $rider->user,
            'Shift Automatically Closed',
            $body,
            $qualifies ? 'info' : 'warning',
            '/rider/rider-dash'
        );
    }

    // ── Campaign events ──────────────────────────────────────────────────────────

    public function notifyAdvertiserCampaignCompleted(Campaign $campaign): void
    {
        if (!$campaign->advertiser?->user) {
            return;
        }

        $this->notify(
            $campaign->advertiser->user,
            'Campaign Completed',
            "Your campaign \"{$campaign->name}\" has completed and all assigned helmets have been returned to the pool.",
            'success',
            "/my-campaigns/{$campaign->id}"
        );
    }

    // ── Profile completion reminder (admin-triggered) ─────────────────────────────

    public function sendProfileCompletionReminder(User $user): array
    {
        $name = $user->first_name ?? $user->name;

        $appSent = $this->notify(
            $user,
            'Complete Your Profile',
            "Hi {$name}, please complete your rider profile by uploading the required documents to start earning with us.",
            'warning',
            '/rider/show-profile'
        );

        $emailSent = $this->sendEmail(
            $user,
            'Complete Your Rider Profile – RANDA',
            "Hi {$name}, please complete your rider profile by uploading the required documents to start earning with us."
        );

        return ['app' => $appSent, 'email' => $emailSent];
    }

    // ── Private helpers ───────────────────────────────────────────────────────────

    private function sendEmail(User $user, string $subject, string $message): bool
    {
        try {
            Mail::raw($message, function ($mail) use ($user, $subject) {
                $mail->to($user->email)->subject($subject);
            });
            return true;
        } catch (\Exception $e) {
            Log::error('Email notification failed', ['user_id' => $user->id, 'error' => $e->getMessage()]);
            return false;
        }
    }
}
