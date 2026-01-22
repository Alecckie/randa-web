<?php

use App\Http\Controllers\frontend\RiderCampaignsController;
use App\Http\Controllers\frontend\riders\RiderProfileController;
use App\Http\Controllers\RiderDashboardController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'role:rider'])->group(function () {
    Route::get('/rider/profile', RiderProfileController::class)->name('rider.profile');
    Route::post('/rider/profile/store', [RiderProfileController::class, 'store'])->name('rider.profile.store'); 
    Route::get('/profile/show', [RiderProfileController::class, 'show'])->name('profile.show');
    
    // Step-by-step submission endpoints
    Route::post('rider/profile/location', [RiderProfileController::class, 'storeLocation'])->name('rider.profile.location');
    Route::post('rider/profile/documents', [RiderProfileController::class, 'storeDocuments'])->name('rider.profile.documents');
    Route::post('rider/profile/contact', [RiderProfileController::class, 'storeContactInfo'])->name('rider.profile.contact');
    Route::post('rider/profile/agreement', [RiderProfileController::class, 'storeAgreement'])->name('rider.profile.agreement');

    Route::middleware(['rider.profile.complete'])->group(function () {
        Route::resource('rider-dash', RiderDashboardController::class);
        Route::get('/rider/show-profile', [RiderProfileController::class, 'show'])->name('rider.show-profile');
        Route::get('rider/campaigns', RiderCampaignsController::class)->name('rider.campaigns');
    });
});
