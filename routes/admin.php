<?php

use App\Http\Controllers\AdminHelmetReportController;
use App\Http\Controllers\AdminSystemSetupController;
use App\Http\Controllers\AdminWithdrawalController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'role:admin'])->group(function () {
    Route::get('/admin/system-setup', [AdminSystemSetupController::class, 'index'])
        ->name('admin.system-setup');

    Route::prefix('admin/withdrawals')->name('admin.withdrawals.')->group(function () {
        Route::get('/', [AdminWithdrawalController::class, 'index'])->name('index');
        Route::get('/rider/{rider}/history', [AdminWithdrawalController::class, 'riderHistory'])->name('rider-history');
        Route::post('/{withdrawal}/settle', [AdminWithdrawalController::class, 'settle'])->name('settle');
        Route::post('/{withdrawal}/reject', [AdminWithdrawalController::class, 'reject'])->name('reject');
    });

    Route::prefix('admin/helmet-reports')->name('admin.helmet-reports.')->group(function () {
        Route::get('/', [AdminHelmetReportController::class, 'index'])->name('index');
        Route::patch('/{report}/resolve', [AdminHelmetReportController::class, 'resolve'])->name('resolve');
    });
});
