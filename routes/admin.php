<?php

use App\Http\Controllers\AdminSystemSetupController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'role:admin'])->group(function () {
    Route::get('/admin/system-setup', [AdminSystemSetupController::class, 'index'])
        ->name('admin.system-setup');
});
