<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Rider Shift Configuration
    |--------------------------------------------------------------------------
    |
    | These values drive rider check-in/check-out payment calculations
    | (App\Services\Shift\ShiftEarningsCalculator). Override via environment
    | variables so admins can adjust pay rules without a code deploy.
    |
    */

    // Hours in a full paid day. A rider's hourly rate is derived as
    // rider.daily_rate / max_hours_per_day (e.g. KSh 70 / 7h = KSh 10/hr),
    // and payable hours are capped at this figure — working longer than a
    // full day does not earn more than daily_rate for that day.
    'max_hours_per_day' => (float) env('RIDER_MAX_HOURS_PER_DAY', 7.0),

    // Minimum hours a rider must actually work in a shift (after pause time
    // is deducted) to qualify for that day's payment at all. Below this,
    // daily_earning is forced to 0 regardless of hours worked.
    'min_qualifying_hours' => (float) env('RIDER_MIN_QUALIFYING_HOURS', 3.0),

    // Riders cannot check in before this hour (0-23, app timezone —
    // config('app.timezone'), Africa/Nairobi).
    'earliest_check_in_hour' => (int) env('RIDER_EARLIEST_CHECK_IN_HOUR', 6),

    // Riders cannot check in at or after this hour (0-23, app timezone).
    // Default 18 = 6:00 PM, pairing with the 6:00 AM earliest hour above to
    // form the allowed check-in window. Also doubles as the daily "closure
    // time" used by rider-shifts:auto-close.
    'latest_check_in_hour' => (int) env('RIDER_LATEST_CHECK_IN_HOUR', 18),

    /*
    |--------------------------------------------------------------------------
    | Movement-based pay
    |--------------------------------------------------------------------------
    |
    | A rider's time only counts toward worked_hours while their GPS trail
    | shows genuine movement — a sustained stationary stretch (helmet parked,
    | phone left somewhere, etc.) is deducted the same way a declared pause
    | is, even if the rider never tapped "pause". See RiderMovementAnalyzer.
    |
    */

    // Below this speed (km/h) between two consecutive GPS points, that
    // stretch counts as "not moving". Set well below normal riding speed —
    // walking pace is ~5 km/h, so 2 km/h comfortably excludes brief stops
    // without flagging slow riding as stationary.
    'stationary_speed_threshold_kmh' => (float) env('RIDER_STATIONARY_SPEED_THRESHOLD_KMH', 2.0),

    // A low-speed stretch shorter than this (minutes) is not deducted —
    // grace for traffic lights, junctions, brief stops. Only sustained
    // stationary periods count against pay.
    'stationary_min_minutes' => (float) env('RIDER_STATIONARY_MIN_MINUTES', 5.0),

];
