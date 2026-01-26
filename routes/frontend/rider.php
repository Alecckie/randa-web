<?php

use App\Http\Controllers\frontend\RiderCampaignsController;
use App\Http\Controllers\frontend\riders\RiderProfileController;
use App\Http\Controllers\RiderCheckInController;
use App\Http\Controllers\RiderDashboardController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'role:rider'])
    ->prefix('rider')
    ->name('rider.')
    ->group(function () {

     

        // Profile Management Routes
        Route::controller(RiderProfileController::class)->group(function () {
            Route::get('/profile', 'index')->name('profile');
            Route::post('/profile', 'store')->name('profile.store');
            Route::get('/show-profile', 'show')->name('show-profile');

            // Multi-step Profile Completion
            Route::prefix('profile')->name('profile.')->group(function () {
                Route::post('/location', 'storeLocation')->name('location');
                Route::post('/documents', 'storeDocuments')->name('documents');
                Route::post('/contact', 'storeContactInfo')->name('contact');
                Route::post('/agreement', 'storeAgreement')->name('agreement');
                Route::post('upload-document', 'uploadSingleDocument')->name('upload-document');
                Route::post('delete-document', 'deleteDocument')->name('delete-document');
            });
        });

        // Routes requiring complete profile
        Route::middleware(['rider.profile.complete'])->group(function () {
            // Dashboard
            Route::resource('rider-dash', RiderDashboardController::class)
                ->only(['index', 'show']);

            // Campaigns
            Route::get('/campaigns', RiderCampaignsController::class)
                ->name('campaigns');

            // Check-in Management
            Route::controller(RiderCheckInController::class)
                ->prefix('check-in')
                ->name('check-in.')
                ->group(function () {
                    Route::get('/', 'index')->name('index');
                    Route::post('/', 'checkIn')->name('store');
                    Route::post('/check-out', 'checkOut')->name('checkout');
                    Route::post('/validate-qr', 'validateQrCode')->name('validate');
                    Route::get('/status', 'getTodayStatus')->name('status');
                    Route::get('/history', 'history')->name('history');
                });
        });
    });
