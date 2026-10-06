<?php

use App\Http\Controllers\ApproveRiderController;
use App\Http\Controllers\RejectRiderController;
use App\Http\Controllers\RiderController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'role:admin'])->group(function () {
    Route::resource('riders', RiderController::class);
    Route::patch('/rider/{rider}/approve',ApproveRiderController::class)->name('rider.approve');
    Route::patch('/rider/{rider}/reject',RejectRiderController::class)->name('rider.reject');
    Route::put('/riders/{rider}/update-status', [RiderController::class, 'updateStatus'])->name('riders.update-status');
    Route::post('/riders/{user}/notify', [RiderController::class, 'notifyRider'])->name('riders.notify');
    Route::get('/riders/{rider}/payout-audit', [RiderController::class, 'payoutAudit'])->name('riders.payout-audit');
    Route::post('/riders/{rider}/settle-dues', [RiderController::class, 'settleDues'])->name('riders.settle-dues');
    Route::get('/riders/{rider}/download-pdf', [RiderController::class, 'downloadPdf'])->name('riders.download-pdf');
});
