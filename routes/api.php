<?php

use App\Http\Controllers\Api\AdvertiserDashboardController;
use App\Http\Controllers\Api\Auth\AuthController;
use App\Http\Controllers\Api\HelmetReportController;
use App\Http\Controllers\Api\LocationController;
use App\Http\Controllers\Api\MpesaCallbackController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\RiderCheckInController;
use App\Http\Controllers\Api\RiderProfileController;
use App\Http\Controllers\Api\RiderTrackingController;
use App\Http\Controllers\Api\SelfieController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::prefix('v1')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    // M-Pesa STK Push 
    Route::post('/mpesa/callback', [MpesaCallbackController::class, 'handleCallback']);

    // M-Pesa timeout callback
    Route::post('/mpesa/timeout', [MpesaCallbackController::class, 'handleTimeout']);


    // Protected routes (require authentication)
    Route::middleware('auth:sanctum')->group(function () {
        // Authentication management
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::post('/logout-all', [AuthController::class, 'logoutAll']);


        Route::get('/profile', [AuthController::class, 'profile']);
        Route::put('/profile', [AuthController::class, 'updateProfile']);
        Route::put('/profile/password', [AuthController::class, 'updatePassword']);


        // Rider routes - only accessible by riders
        Route::prefix('rider')->middleware(['auth:sanctum', 'role:rider'])->group(function () {

            Route::get('/profile', [RiderProfileController::class, 'index'])
                ->name('rider.profile.index');

            // Get full profile details
            Route::get('/profile/details', [RiderProfileController::class, 'show'])
                ->name('rider.profile.show');

            // Step-by-step rider profile completion endpoints
            Route::post('/profile/location', [RiderProfileController::class, 'storeLocation'])
                ->name('rider.profile.location');

            Route::post('/profile/update-location', [RiderProfileController::class, 'updateLocation'])
                ->name('rider.profile.update-location');

            //  Individual document upload endpoint
            Route::post('/profile/upload-document', [RiderProfileController::class, 'uploadSingleDocument'])
                ->name('rider.profile.upload-document');

            //  Delete individual document
            Route::post('/profile/delete-document', [RiderProfileController::class, 'deleteDocument'])
                ->name('rider.profile.delete-document');

            // Batch upload
            Route::post('/profile/documents', [RiderProfileController::class, 'storeDocuments'])
                ->name('rider.profile.documents');

            Route::post('/profile/contact', [RiderProfileController::class, 'storeContactInfo'])
                ->name('rider.profile.contact');

            Route::post('/profile/agreement', [RiderProfileController::class, 'storeAgreement'])
                ->name('rider.profile.agreement');


            Route::name('rider')->group(function () {

                Route::get('/rider_checkins', [RiderCheckInController::class, 'index'])
                    ->name('rider_checkins');

                Route::get('/status', [RiderCheckInController::class, 'getTodayStatus'])
                    ->name('status');

                Route::get('/stats', [RiderCheckInController::class, 'stats'])
                    ->name('stats');

                Route::get('/rider_campaign_summary', [RiderCheckInController::class, 'campaignSummary'])
                    ->name('rider_campaign_summary');

                Route::get('/history', [RiderCheckInController::class, 'history'])
                    ->name('history');

                // Route::get('/{id}', [RiderCheckInController::class, 'show'])
                //     ->name('show');

                Route::post('/check_in', [RiderCheckInController::class, 'checkIn'])
                    ->name('check_in');

                Route::post('/validate', [RiderCheckInController::class, 'validateQrCode'])
                    ->name('validate');

                Route::post('/checkout', [RiderCheckInController::class, 'checkOut'])
                    ->name('checkout');

                Route::post('/force-checkout', [RiderCheckInController::class, 'forceCheckOut'])
                    ->name('force-checkout');

                Route::get('/assignment/current', [RiderCheckInController::class, 'currentAssignment'])
                    ->name('assignment.current');

                Route::get('/earnings/monthly', [RiderCheckInController::class, 'monthlyEarnings'])
                    ->name('earnings.monthly');
            });

            //Rider Tracking endpoints 
            // Record location points
            Route::post('/location', [RiderTrackingController::class, 'store'])
                ->name('record');

            Route::post('/locations/batch', [RiderTrackingController::class, 'storeBatch'])
                ->name('batch');

            // Get rider's own tracking data
            Route::get('/location/current', [RiderTrackingController::class, 'current'])
                ->name('current');

            Route::get('/routes/today', [RiderTrackingController::class, 'getTodayRoute'])
                ->name('today');

            Route::get('/routes/history', [RiderTrackingController::class, 'getRouteHistory'])
                ->name('history');

            Route::get('/routes/{routeId}', [RiderTrackingController::class, 'getRouteDetails'])
                ->name('details');

            Route::get('/tracking/stats', [RiderTrackingController::class, 'stats'])
                ->name('stats');

            // Pause/Resume tracking
            Route::post('/tracking/pause', [RiderTrackingController::class, 'pause'])
                ->name('pause');

            Route::post('/tracking/resume', [RiderTrackingController::class, 'resume'])
                ->name('resume');



            //Selfie Prompt
            Route::prefix('selfie-prompts')->group(function () {
                Route::post('/',                 [SelfieController::class, 'storePrompt'])->name('rider.selfie-prompts.store');
                Route::get('/active',            [SelfieController::class, 'activePrompt'])->name('rider.selfie-prompts.active');
                Route::patch('/{prompt}/accept', [SelfieController::class, 'acceptPrompt'])->name('rider.selfie-prompts.accept');
                Route::post('/{prompt}/submit',  [SelfieController::class, 'submitSelfie'])->name('rider.selfie-prompts.submit');
            });

            //Helmet Report
            Route::prefix('helmet-reports')->group(function () {
                Route::post('/',        [HelmetReportController::class, 'store'])->name('rider.helmet-reports.store');
                Route::get('/{report}', [HelmetReportController::class, 'show'])->name('rider.helmet-reports.show');
            });
        });

        // Advertiser routes - only accessible by advertisers
        Route::prefix('advertiser')->middleware(['auth:sanctum', 'role:advertiser'])->group(function () {
            // Dashboard
            Route::get('/dashboard', [AdvertiserDashboardController::class, 'index'])
                ->name('advertiser.dashboard');

            // Advertiser Profile CRUD
            Route::post('/profile', [AdvertiserDashboardController::class, 'store'])
                ->name('advertiser.profile.store');

            Route::get('/profile/{id}', [AdvertiserDashboardController::class, 'show'])
                ->name('advertiser.profile.show');

            Route::put('/profile/{id}', [AdvertiserDashboardController::class, 'update'])
                ->name('advertiser.profile.update');

            Route::delete('/profile/{id}', [AdvertiserDashboardController::class, 'destroy'])
                ->name('advertiser.profile.destroy');
        });

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

        Route::prefix('payments')->name('payments.')->group(function () {

            Route::post('/mpesa/initiate', [PaymentController::class, 'initiateMpesaPayment'])
                ->name('mpesa.initiate');

            Route::post('/mpesa/query', [PaymentController::class, 'queryPaymentStatus'])
                ->name('mpesa.query');

            Route::get('/mpesa/{paymentReference}', [PaymentController::class, 'getPaymentDetails'])
                ->name('mpesa.details');

            Route::post('/mpesa/verify-receipt', [PaymentController::class, 'verifyManualReceipt'])
                ->name('payments.mpesa.verify-receipt');

            Route::get('/list', [PaymentController::class, 'listPayments'])
                ->name('list');

            Route::get('/stats', [PaymentController::class, 'getStats'])
                ->name('stats');
        });

        // Helmet API routes
        Route::prefix('helmets')->name('api.helmets.')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\HelmetController::class, 'index'])
                ->name('index');

            Route::get('/{helmet}', [\App\Http\Controllers\Api\HelmetController::class, 'show'])
                ->name('show');

            Route::get('/riders/available', [\App\Http\Controllers\Api\HelmetController::class, 'availableRiders'])
                ->name('riders.available');

            Route::post('/{helmet}/assign', [\App\Http\Controllers\Api\HelmetController::class, 'assignToRider'])
                ->name('assign');
        });
    });
});
