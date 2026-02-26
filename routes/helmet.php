<?php

use App\Http\Controllers\HelmetController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::resource('helmets', HelmetController::class);
    Route::get('helmets-available', [HelmetController::class, 'available'])->name('helmets.available');
    Route::get('riders-for-assignment', [HelmetController::class, 'getRidersForAssignment'])->name('helmets.riders');
    Route::post('helmets/{helmet}/assign-rider', [HelmetController::class, 'assignToRider'])->name('helmets.assign-rider');
    Route::post('helmets/bulk-status', [HelmetController::class, 'bulkUpdateStatus'])->name('helmets.bulk-status');
});