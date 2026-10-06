<?php

use App\Http\Controllers\CampaignAnalyticsController;
use App\Http\Controllers\CompleteAdvertiserProfileController;
use App\Http\Controllers\frontend\AdvertiserDashboardController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'role:advertiser'])->group(function () {
    Route::get('advert-dash', [AdvertiserDashboardController::class, 'index'])->name('advert-dash.index');
    Route::post('advert-dash', [AdvertiserDashboardController::class, 'store'])->name('advert-dash.store');

    // The advertiser's own profile — never parameterized by ID, there's
    // exactly one per authenticated advertiser.
    Route::get('advert-dash/profile', [AdvertiserDashboardController::class, 'profile'])
        ->name('advert-dash.profile');
    Route::put('advert-dash/profile', [AdvertiserDashboardController::class, 'updateProfile'])
        ->name('advert-dash.profile.update');

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