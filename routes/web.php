<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Payment\PaymentController;
use Illuminate\Support\Facades\Log;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

Route::middleware(['auth'])->get('/test-broadcast-auth', function () {
    $user = auth()->user();
    
    return response()->json([
        'user_id' => $user->id,
        'has_advertiser' => $user->advertiser !== null,
        'advertiser_id' => $user->advertiser?->id,
        'can_subscribe' => $user->advertiser !== null,
    ]);
});

// routes/web.php
Route::get('/test-broadcast/{paymentId}', function ($paymentId) {
    $payment = \App\Models\Payment::findOrFail($paymentId);
    
    Log::info('Manual broadcast test', [
        'payment_id' => $payment->id,
        'advertiser_id' => $payment->advertiser_id,
        'reference' => $payment->payment_reference
    ]);
    
    broadcast(new \App\Events\PaymentStatusUpdated($payment, 'success'));
    
    return response()->json([
        'success' => true,
        'message' => 'Broadcast sent',
        'payment' => [
            'id' => $payment->id,
            'reference' => $payment->payment_reference,
            'advertiser_id' => $payment->advertiser_id,
        ]
    ]);
});

// Route::get('/',[AuthenticatedSessionController::class, 'create']);

Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

     
   Route::prefix('payments')->name('payments.')->group(function () {
    
    Route::post('/mpesa/initiate/stk-push', [PaymentController::class, 'initiateStkPush'])
        ->name('mpesa.initiate.stk-push');
    
    Route::post('/mpesa/query', [PaymentController::class, 'queryPaymentStatus'])
        ->name('mpesa.query');
    
    Route::get('/mpesa/{paymentReference}', [PaymentController::class, 'getPaymentDetails'])
        ->name('mpesa.details');
    
    Route::get('/list', [PaymentController::class, 'listPayments'])
        ->name('list');
    
    Route::get('/stats', [PaymentController::class, 'getStats'])
        ->name('stats');
});
});

require __DIR__.'/auth.php';
require __DIR__.'/rider.php';
require __DIR__.'/advertiser.php';
require __DIR__.'/campaign.php';
require __DIR__.'/helmet.php';
require __DIR__.'/location.php';
require __DIR__.'/frontend/rider.php';
require __DIR__.'/frontend/advertiser.php';
require __DIR__.'/frontend/campaign.php';
