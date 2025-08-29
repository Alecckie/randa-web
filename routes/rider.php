<?php

use App\Http\Controllers\RiderController;
use Illuminate\Support\Facades\Route;
Route::middleware('auth')->group(function () {
    Route::resource('riders',RiderController::class);
});