<?php

use App\Http\Controllers\frontend\riders\RiderProfileController;
use App\Http\Controllers\RiderDashboardController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'role:rider'])->group(function () {
    Route::get('/rider/profile',RiderProfileController::class)->name('rider.profile');
    Route::post('/rider/profile/store',[RiderProfileController::class,'store'])->name('rider.profile.store');
    Route::middleware(['rider.profile.complete'])->group( function () {
        Route::resource('rider-dash', RiderDashboardController::class);
        Route::get('/rider/show-profile',[RiderProfileController::class,'show'])->name('rider.show-profile');
    });
});