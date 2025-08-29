<?php

use App\Http\Controllers\AdvertiserController;
use Illuminate\Support\Facades\Route;
Route::middleware('auth')->group(function () {
    Route::resource('advertisers',AdvertiserController::class);
});