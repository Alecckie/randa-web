<?php

use App\Http\Controllers\Api\AdvertiserDashboardController;
use App\Http\Controllers\Api\Auth\AuthController;
use App\Http\Controllers\Api\LocationController;
use App\Http\Controllers\Api\RiderProfileController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::prefix('v1')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);


    // Protected routes (require authentication)
    Route::middleware('auth:sanctum')->group(function () {
        // Authentication management
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::post('/logout-all', [AuthController::class, 'logoutAll']);

        Route::get('/profile', [AuthController::class, 'profile']);
        Route::put('/profile', [AuthController::class, 'updateProfile']);
        Route::patch('/profile', [AuthController::class, 'updateProfile']);

        Route::prefix('rider')->group(function () {
            Route::get('/profile', [RiderProfileController::class, 'index'])
                ->name('api.rider.profile.index');

            Route::post('/profile', [RiderProfileController::class, 'store'])
                ->name('api.rider.profile.store');

            Route::get('/profile/details', [RiderProfileController::class, 'show'])
                ->name('api.rider.profile.show');
        });

        Route::prefix('advertiser')->group(function () {
            // Dashboard
            Route::get('/dashboard', [AdvertiserDashboardController::class, 'index'])
                ->name('api.advertiser.dashboard');

            // Advertiser Profile CRUD
            Route::post('/profile', [AdvertiserDashboardController::class, 'store'])
                ->name('api.advertiser.profile.store');

            Route::get('/profile/{id}', [AdvertiserDashboardController::class, 'show'])
                ->name('api.advertiser.profile.show');

            Route::put('/profile/{id}', [AdvertiserDashboardController::class, 'update'])
                ->name('api.advertiser.profile.update');

            Route::delete('/profile/{id}', [AdvertiserDashboardController::class, 'destroy'])
                ->name('api.advertiser.profile.destroy');
        });

        Route::prefix('locations')->name('api.locations.')->group(function () {
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
});
