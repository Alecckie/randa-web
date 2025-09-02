<?php

use App\Http\Controllers\Api\Auth\AuthController;
use App\Http\Controllers\Api\RiderController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::prefix('v1')->group(function () {
    // Authentication routes
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);


    // Protected routes (require authentication)
    Route::middleware('auth:sanctum')->group(function () {
        // Authentication management
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::post('/logout-all', [AuthController::class, 'logoutAll']);

        // Profile management
        Route::get('/profile', [AuthController::class, 'profile']);
        Route::put('/profile', [AuthController::class, 'updateProfile']);
        Route::patch('/profile', [AuthController::class, 'updateProfile']);

        Route::prefix('riders')->group(function () {
            Route::get('/', [RiderController::class, 'index']);
            Route::get('/create', [RiderController::class, 'create']);
            Route::post('/', [RiderController::class, 'store']);
            Route::get('/stats', [RiderController::class, 'stats']);
            Route::get('/available', [RiderController::class, 'available']);
            Route::get('/{rider}', [RiderController::class, 'show']);
            Route::put('/{rider}', [RiderController::class, 'update']);
            Route::patch('/{rider}/status', [RiderController::class, 'updateStatus']);
            Route::patch('/{rider}/wallet', [RiderController::class, 'updateWallet']);
            Route::delete('/{rider}', [RiderController::class, 'destroy']);
        });
    });
});
