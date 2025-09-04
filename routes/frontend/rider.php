<?php

use App\Http\Controllers\RiderDashboardController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'role:rider'])->group(function () {
    Route::resource('rider-dash', RiderDashboardController::class);
});