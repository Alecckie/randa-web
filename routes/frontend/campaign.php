<?php

use App\Http\Controllers\frontend\CampaignController;
use Illuminate\Support\Facades\Route;

 Route::middleware(['auth','role:advertiser'])->group(function () {
  Route::resource('my-campaigns',CampaignController::class);
  Route::put('/my-campaigns/{campaign}/update-status', [CampaignController::class, 'updateStatus'])
    ->name('my-campaigns.update-status');
 });