<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Campaign Rate Configuration
    |--------------------------------------------------------------------------
    |
    | These values drive cost calculations and analytics estimates.
    | Override via environment variables for easy per-environment control.
    |
    */

    // Cost per helmet per day (KES)
    'helmet_daily_rate' => (float) env('CAMPAIGN_HELMET_DAILY_RATE', 200.00),

    // One-time design fee (KES)
    'design_cost' => (float) env('CAMPAIGN_DESIGN_COST', 3000.00),

    // VAT rate applied to campaign subtotal (%)
    'vat_rate' => (float) env('CAMPAIGN_VAT_RATE', 16.00),

    // Rider hourly earnings rate (KES/hour) — shares RIDER_HOURLY_RATE with
    // config/rider_shift.php so the two can never drift out of sync.
    'rider_hourly_rate' => (float) env('RIDER_HOURLY_RATE', 7.00),

    // Estimated advertising impressions per kilometre ridden
    'impressions_per_km' => (int) env('CAMPAIGN_IMPRESSIONS_PER_KM', 500),

];
