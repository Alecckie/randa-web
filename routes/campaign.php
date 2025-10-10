<?php

use App\Http\Controllers\CampaignAssignmentController;
use App\Http\Controllers\CampaignController;
use Illuminate\Support\Facades\Route;
Route::middleware('auth')->group(function () {
    Route::resource('campaigns',CampaignController::class);

    // Campaign assignment routes
    Route::prefix('campaigns/{campaign}')->name('campaigns.')->group(function () {
        
        Route::post('/assign-rider', [CampaignAssignmentController::class, 'assignRider'])
            ->name('assign-rider');
        
        Route::delete('/assignments/{assignment}', [CampaignAssignmentController::class, 'removeAssignment'])
            ->name('remove-assignment');
        
        Route::patch('/assignments/{assignment}/complete', [CampaignAssignmentController::class, 'completeAssignment'])
            ->name('complete-assignment');
        
        Route::patch('/status', [CampaignAssignmentController::class, 'updateStatus'])
            ->name('update-status');
        
        Route::post('/auto-assign', [CampaignAssignmentController::class, 'autoAssignRiders'])
            ->name('auto-assign');
        
        Route::get('/assignment-stats', [CampaignAssignmentController::class, 'assignmentStats'])
            ->name('assignment-stats');
    });
});