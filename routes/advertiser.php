<?php

use App\Http\Controllers\AdvertiserController;
use Illuminate\Support\Facades\Route;
Route::middleware('auth')->group(function () {
    Route::resource('advertisers',AdvertiserController::class);
    Route::post('advertiser/{id}/approve',[AdvertiserController::class,'approve'])->name('advertiser.approve');
    Route::post('advertiser/{id}/reject',[AdvertiserController::class,'reject'])->name('advertiser.reject');
    Route::get('advertiser/{id}/download-pdf',[AdvertiserController::class,'downloadPdf'])->name('advertiser.download-pdf');
});