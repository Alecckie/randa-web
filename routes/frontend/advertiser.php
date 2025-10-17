<?php

use App\Http\Controllers\CompleteAdvertiserProfileController;
use App\Http\Controllers\frontend\AdvertiserDashboardController;
use Illuminate\Support\Facades\Route;

 Route::middleware(['auth','role:advertiser'])->group(function () {
   Route::resource('advert-dash',AdvertiserDashboardController::class);
   Route::post('advertiser-complete-profile',CompleteAdvertiserProfileController::class);
 });