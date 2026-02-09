<?php

namespace App\Services;

use App\Models\CampaignAssignment;
use App\Models\Helmet;
use App\Models\Rider;
use App\Models\RiderCheckIn;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Exception;

class CheckInService
{
    /**
     * Process rider check-in via QR code scan
     */
    public function checkIn(string $qrCode, int $riderId, ?float $latitude = null, ?float $longitude = null): array
    {
        return DB::transaction(function () use ($qrCode, $riderId, $latitude, $longitude) {
            // Find helmet by QR code
            $helmet = Helmet::where('qr_code', $qrCode)->first();

            if (!$helmet) {
                throw new Exception('Invalid QR code. Helmet not found.');
            }

            // Find rider
            $rider = Rider::findOrFail($riderId);

            if ($rider->status !== 'approved') {
                throw new Exception('Your rider account is not approved yet.');
            }

            // Find active campaign assignment for this helmet
            $assignment = CampaignAssignment::where('helmet_id', $helmet->id)
                ->where('rider_id', $riderId)
                ->where('status', 'active')
                ->first();

            if (!$assignment) {
                throw new Exception('No active campaign assignment found for this helmet and rider.');
            }

            // Check if campaign is active
            if ($assignment->campaign->status !== 'active') {
                throw new Exception($assignment->campaign->id . 'The campaign associated with this helmet is not active.');
            }

            // Check if rider already checked in today
            $existingCheckIn = RiderCheckIn::where('rider_id', $riderId)
                ->whereDate('check_in_date', Carbon::today())
                ->where('status', 'active')
                ->first();

            if ($existingCheckIn) {
                throw new Exception('You have already checked in today at ' .
                    $existingCheckIn->check_in_time->format('h:i A'));
            }

            $checkIn = RiderCheckIn::create([
                'rider_id' => $riderId,
                'campaign_assignment_id' => $assignment->id,
                'check_in_date' => Carbon::today(),
                'check_in_time' => Carbon::now(),
                'check_out_time' => null,
                'daily_earning' => $rider->daily_rate ?? 70.00,
                'status' => 'active',
                'check_in_latitude' => $latitude,
                'check_in_longitude' => $longitude
            ]);

            return [
                'success' => true,
                'message' => 'Check-in successful! Have a great day.',
                'check_in' => $checkIn->load(['campaignAssignment.campaign', 'campaignAssignment.helmet']),
                'campaign_name' => $assignment->campaign->name,
                'helmet_code' => $helmet->helmet_code,
                'check_in_time' => $checkIn->formatted_check_in_time,
                'daily_earning' => $checkIn->formatted_daily_earning
            ];
        });
    }

    /**
     * Process rider check-out
     */
    public function checkOut(int $riderId, ?float $latitude = null, ?float $longitude = null): array
    {
        return DB::transaction(function () use ($riderId, $latitude, $longitude) {
            // Find today's active check-in
            $checkIn = RiderCheckIn::where('rider_id', $riderId)
                ->whereDate('check_in_date', Carbon::today())
                ->where('status', 'active')
                ->first();

            if (!$checkIn) {
                throw new Exception('No active check-in found for today. Please check in first.');
            }

            // Update check-out time
            $checkIn->update([
                'check_out_time' => Carbon::now(),
                'status' => 'completed',
                'check_out_latitude' => $latitude,
                'check_out_longitude' => $longitude
            ]);

            // Update rider's wallet balance
            $rider = Rider::findOrFail($riderId);
            $rider->increment('wallet_balance', $checkIn->daily_earning);

            $workedHours = $checkIn->worked_hours;

            return [
                'success' => true,
                'message' => 'Check-out successful! Your earnings have been added to your wallet.',
                'check_in' => $checkIn->fresh(),
                'check_out_time' => $checkIn->formatted_check_out_time,
                'worked_hours' => round($workedHours, 2),
                'daily_earning' => $checkIn->formatted_daily_earning,
                'new_wallet_balance' => 'KSh ' . number_format($rider->wallet_balance, 2)
            ];
        });
    }

    /**
     * Get today's check-in status for a rider
     */
    public function getTodayCheckInStatus(int $riderId): ?array
    {
        $checkIn = RiderCheckIn::where('rider_id', $riderId)
            ->whereDate('check_in_date', Carbon::today())
            ->with(['campaignAssignment.campaign', 'campaignAssignment.helmet'])
            ->first();

        if (!$checkIn) {
            return null;
        }

        return [
            'id' => $checkIn->id,
            'status' => $checkIn->status,
            'check_in_time' => $checkIn->formatted_check_in_time,
            'check_out_time' => $checkIn->formatted_check_out_time,
            'worked_hours' => $checkIn->worked_hours,
            'daily_earning' => $checkIn->formatted_daily_earning,
            'campaign_name' => $checkIn->campaignAssignment->campaign->name ?? 'N/A',
            'helmet_code' => $checkIn->campaignAssignment->helmet->helmet_code ?? 'N/A',
            'can_check_out' => $checkIn->status === 'active'
        ];
    }

    /**
     * Get rider's check-in history
     */
    public function getCheckInHistory(int $riderId, int $perPage = 15)
    {
        return RiderCheckIn::where('rider_id', $riderId)
            ->with(['campaignAssignment.campaign', 'campaignAssignment.helmet'])
            ->orderBy('check_in_date', 'desc')
            ->orderBy('check_in_time', 'desc')
            ->paginate($perPage);
    }

    /**
     * Get rider's check-in statistics
     */
    public function getCheckInStats(int $riderId): array
    {
        $totalCheckIns = RiderCheckIn::where('rider_id', $riderId)->count();
        $completedCheckIns = RiderCheckIn::where('rider_id', $riderId)
            ->where('status', 'completed')
            ->count();

        $totalEarnings = RiderCheckIn::where('rider_id', $riderId)
            ->where('status', 'completed')
            ->sum('daily_earning');

        $totalHours = RiderCheckIn::where('rider_id', $riderId)
            ->where('status', 'completed')
            ->get()
            ->sum(function ($checkIn) {
                return $checkIn->worked_hours ?? 0;
            });

        $thisMonthCheckIns = RiderCheckIn::where('rider_id', $riderId)
            ->whereMonth('check_in_date', Carbon::now()->month)
            ->whereYear('check_in_date', Carbon::now()->year)
            ->where('status', 'completed')
            ->count();

        $thisMonthEarnings = RiderCheckIn::where('rider_id', $riderId)
            ->whereMonth('check_in_date', Carbon::now()->month)
            ->whereYear('check_in_date', Carbon::now()->year)
            ->where('status', 'completed')
            ->sum('daily_earning');

        return [
            'total_check_ins' => $totalCheckIns,
            'completed_check_ins' => $completedCheckIns,
            'total_earnings' => 'KSh ' . number_format($totalEarnings, 2),
            'total_hours_worked' => round($totalHours, 2),
            'this_month_check_ins' => $thisMonthCheckIns,
            'this_month_earnings' => 'KSh ' . number_format($thisMonthEarnings, 2),
            'average_hours_per_day' => $completedCheckIns > 0
                ? round($totalHours / $completedCheckIns, 2)
                : 0
        ];
    }

    /**
     * Validate QR code and get assignment info
     */
    public function validateQrCode(string $qrCode, int $riderId): array
    {
        $helmet = Helmet::where('qr_code', $qrCode)->first();

        if (!$helmet) {
            throw new Exception('Invalid QR code.');
        }

        $assignment = CampaignAssignment::where('helmet_id', $helmet->id)
            ->where('rider_id', $riderId)
            ->where('status', 'active')
            ->with(['campaign', 'helmet'])
            ->first();

        if (!$assignment) {
            throw new Exception('This helmet is not assigned to you.');
        }

        return [
            'valid' => true,
            'helmet_code' => $helmet->helmet_code,
            'campaign_name' => $assignment->campaign->name,
            'campaign_status' => $assignment->campaign->status,
            'assignment_id' => $assignment->id
        ];
    }
}
