<?php

use App\Http\Controllers\ApproveRiderController;
use App\Http\Controllers\RejectRiderController;
use App\Http\Controllers\RiderController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::resource('riders', RiderController::class);
    Route::patch('/rider/{rider}/approve',ApproveRiderController::class)->name('rider.approve');
    Route::patch('/rider/{rider}/reject',RejectRiderController::class)->name('rider.reject');
    Route::post('/riders/{user}/notify', [RiderController::class, 'notifyRider'])->name('riders.notify');
});
