<?php

use App\Http\Controllers\HelmetController;
use Illuminate\Support\Facades\Route;
Route::middleware('auth')->group(function () {
    Route::resource('helmets',HelmetController::class);
});