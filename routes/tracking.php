<?php

use App\Http\Controllers\CampaignAnalyticsController;
use App\Http\Controllers\TrackingController;
use App\Http\Controllers\AdminTrackingController;
use Illuminate\Support\Facades\Route;

Route::prefix('advertiser/tracking')->middleware(['auth', 'role:advertiser'])->group(function () {

    // Heatmap scoped to the authenticated advertiser's campaigns
    Route::get('/heatmap', [AdminTrackingController::class, 'advertiserHeatmap'])
        ->name('advertiser.tracking.heatmap');
});

Route::prefix('admin/tracking')->middleware(['auth', 'role:admin'])->group(function () {

    Route::get('/live-map', [TrackingController::class, 'index'])->name('admin.tracking.live-map');

    // Inertia heatmap page (campaign-scoped)
    Route::get('/heatmap-view', [TrackingController::class, 'heatmap'])->name('admin.tracking.heatmap-view');
    // Live Tracking
    Route::get('/live', [AdminTrackingController::class, 'liveTracking'])
        ->name('admin.tracking.live');
    
    // Dashboard Statistics
    Route::get('/dashboard-stats', [AdminTrackingController::class, 'dashboardStats'])
        ->name('admin.tracking.dashboard-stats');
    
    // Rider Tracking
    Route::get('/rider/{riderId}', [AdminTrackingController::class, 'riderTracking'])
        ->name('admin.tracking.rider');
    
    Route::get('/riders', [AdminTrackingController::class, 'ridersList'])
        ->name('admin.tracking.riders');
    
    // Campaign Tracking
    Route::get('/campaign/{campaignId}', [AdminTrackingController::class, 'campaignTracking'])
        ->name('admin.tracking.campaign');
    
    // Route Details
    Route::get('/routes/{routeId}', [AdminTrackingController::class, 'routeDetails'])
        ->name('admin.tracking.route.details');
    
    // Heatmap Data
    Route::get('/heatmap', [AdminTrackingController::class, 'heatmapData'])
        ->name('admin.tracking.heatmap');
    
    // Export
    Route::post('/export', [AdminTrackingController::class, 'exportTrackingData'])
        ->name('admin.tracking.export');
});

Route::prefix('admin/campaigns')->middleware(['auth', 'role:admin'])->group(function () {
    Route::get('/analytics', [CampaignAnalyticsController::class, 'adminIndex'])
        ->name('admin.campaigns.analytics');
    Route::get('/{campaignId}/analytics', [CampaignAnalyticsController::class, 'adminAnalytics'])
        ->name('admin.campaigns.analytics.campaign');
});