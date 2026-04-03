<?php

use App\Http\Controllers\TrackingController;
use App\Http\Controllers\AdminTrackingController;
use Illuminate\Support\Facades\Route;

Route::prefix('admin/tracking')->middleware(['auth', 'role:admin'])->group(function () {


    Route::get('/live-map', [TrackingController::class, 'index'])->name('admin.tracking.live-map');
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


    Route::prefix('area-visits')->group(function () {
        Route::get('campaign/{campaignId}',                \App\Http\Controllers\AreaVisitController::class . '@byCampaign');
        Route::get('campaign/{campaignId}/area/{areaId}',  \App\Http\Controllers\AreaVisitController::class . '@areaDetail');
        Route::get('rider/{riderId}',                      \App\Http\Controllers\AreaVisitController::class . '@byRider');
        Route::post('reprocess/{checkInId}',               \App\Http\Controllers\AreaVisitController::class . '@reprocess');
    });
});
