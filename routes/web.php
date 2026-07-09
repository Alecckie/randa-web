<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\NotificationsController;
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

Route::get('/dashboard', [\App\Http\Controllers\DashboardController::class, 'index'])->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile/edit', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::get('/profile', [ProfileController::class, 'edit']);
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // Notifications API
    Route::get('/notifications', [NotificationsController::class, 'index'])->name('notifications.index');
    Route::post('/notifications/read-all', [NotificationsController::class, 'markAllRead'])->name('notifications.read-all');
    Route::post('/notifications/{id}/read', [NotificationsController::class, 'markRead'])->name('notifications.read');


    Route::prefix('payments')->name('payments.')->group(function () {

        // Standard STK Push
        Route::post('/mpesa/initiate/stk-push', [PaymentController::class, 'initiateStkPush'])
            ->name('mpesa.initiate.stk-push');

        // Query payment status (fallback #1)
        Route::post('/mpesa/query-status', [PaymentController::class, 'queryPaymentStatus'])
            ->name('mpesa.query-status');

        // Retry STK Push (fallback #2)
        Route::post('/mpesa/retry-stk', [PaymentController::class, 'retryStkPush'])
            ->name('mpesa.retry-stk');

        // Manual receipt verification (fallback #3 - requires admin approval)
        Route::post('/mpesa/verify-receipt', [PaymentController::class, 'verifyReceipt'])
            ->name('mpesa.verify-receipt');

        // Get paybill instructions (fallback #4 - manual paybill)
        Route::post('/mpesa/paybill-instructions', [PaymentController::class, 'getPaybillInstructions'])
            ->name('mpesa.paybill-instructions');

        // Admin: record manual cash/M-Pesa payment without STK push
        Route::post('/record-manual', [PaymentController::class, 'recordManualPayment'])
            ->name('record-manual');

        // Admin: approve or reject a manually-submitted receipt awaiting verification
        Route::patch('/{payment}/approve', [PaymentController::class, 'approveManualPayment'])
            ->name('approve');
        Route::patch('/{payment}/reject', [PaymentController::class, 'rejectManualPayment'])
            ->name('reject');

        Route::get('/list', [PaymentController::class, 'listPayments'])
            ->name('list');

        Route::get('/stats', [PaymentController::class, 'getStats'])
            ->name('stats');

        // Keep catch-all last so /list and /stats match first
        Route::get('/{reference}', [PaymentController::class, 'getPaymentDetails'])
            ->name('details');
    });
});

require __DIR__ . '/auth.php';
require __DIR__ . '/admin.php';
require __DIR__ . '/rider.php';
require __DIR__ . '/advertiser.php';
require __DIR__ . '/campaign.php';
require __DIR__ . '/helmet.php';
require __DIR__ . '/location.php';
require __DIR__ . '/tracking.php';
require __DIR__ . '/frontend/rider.php';
require __DIR__ . '/frontend/advertiser.php';
require __DIR__ . '/frontend/campaign.php';
