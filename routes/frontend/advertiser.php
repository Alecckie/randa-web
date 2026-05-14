<?php

use App\Http\Controllers\CampaignAnalyticsController;
use App\Http\Controllers\CompleteAdvertiserProfileController;
use App\Http\Controllers\frontend\AdvertiserDashboardController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'role:advertiser'])->group(function () {
    Route::resource('advert-dash', AdvertiserDashboardController::class);
    Route::post('advertiser-complete-profile', CompleteAdvertiserProfileController::class);

    // Dedicated heatmap page for advertisers
    Route::get('advertiser/heatmap', [AdvertiserDashboardController::class, 'heatmap'])
        ->name('advertiser.heatmap');

    // Campaign analytics
    Route::get('advertiser/analytics', [CampaignAnalyticsController::class, 'advertiserIndex'])
        ->name('advertiser.analytics');
    Route::get('advertiser/analytics/{campaignId}', [CampaignAnalyticsController::class, 'advertiserAnalytics'])
        ->name('advertiser.analytics.campaign');
});