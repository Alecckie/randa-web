<?php

use App\Http\Controllers\RiderController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::resource('riders', RiderController::class);
    
    Route::patch('/riders/{rider}/approve', [RiderController::class, 'approve'])->name('riders.approve');
    Route::patch('/riders/{rider}/reject', [RiderController::class, 'reject'])->name('riders.reject');
});
