<?php

use App\Http\Controllers\ZoneController;
use Illuminate\Support\Facades\Route;
Route::middleware('auth')->group(function () {
    Route::resource('zones',ZoneController::class);
});