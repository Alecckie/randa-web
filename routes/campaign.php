<?php

use App\Http\Controllers\CampaignAssignmentController;
use App\Http\Controllers\CampaignController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::resource('campaigns', CampaignController::class);

    // Campaign assignment routes
    Route::prefix('campaigns/{campaign}')->name('campaigns.')->group(function () {

        Route::post('/assign-rider', [CampaignAssignmentController::class, 'assignRider'])
            ->name('assign-rider');

        Route::delete('/assignments/{assignment}', [CampaignAssignmentController::class, 'removeAssignment'])
            ->name('remove-assignment');

        Route::patch('/assignments/{assignment}/complete', [CampaignAssignmentController::class, 'completeAssignment'])
            ->name('complete-assignment');

        Route::get('/assignments/{assignment}/activity', [CampaignAssignmentController::class, 'assignmentActivity'])
            ->name('assignment-activity');

        // Route::patch('/status', [CampaignAssignmentController::class, 'updateStatus'])
        //     ->name('update-status');

        Route::put('/update-status', [CampaignController::class, 'updateStatus'])
            ->name('update-status');

        Route::post('/auto-assign', [CampaignAssignmentController::class, 'autoAssignRiders'])
            ->name('auto-assign');

        Route::get('/assignment-stats', [CampaignAssignmentController::class, 'assignmentStats'])
            ->name('assignment-stats');

        Route::post('/revoke-helmets', [CampaignAssignmentController::class, 'revokeAllHelmets'])
            ->name('revoke-helmets');
    });
});