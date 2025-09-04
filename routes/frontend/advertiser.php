<?php

use App\Http\Controllers\AdvertiserDashboardController;
use Illuminate\Support\Facades\Route;

 Route::middleware(['auth','role:advertiser'])->group(function () {
   Route::resource('advert-dash',AdvertiserDashboardController::class);
 });