<?php

use App\Http\Controllers\Api\LocationController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::prefix('locations')->name('locations.')->group(function () {
        Route::get('counties', [LocationController::class, 'counties'])
            ->name('counties');

        Route::get('counties/{county}/subcounties', [LocationController::class, 'sub_counties'])
            ->name('subcounties');

        Route::get('subcounties/{subcounty}/wards', [LocationController::class, 'wards'])
            ->name('wards');

        Route::post('validate', [LocationController::class, 'validateLocation'])
            ->name('validate');

        Route::get('details/{ward}', [LocationController::class, 'locationDetails'])
            ->name('details');
    });
});
