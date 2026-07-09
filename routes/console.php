<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('campaigns:complete-expired')->daily();

// Closure time is config-driven (RIDER_LATEST_CHECK_IN_HOUR, default 6:00 PM)
// so this stays in sync if the admin changes the check-in window.
Schedule::command('rider-shifts:auto-close')
    ->dailyAt(sprintf('%02d:00', config('rider_shift.latest_check_in_hour')))
    ->timezone(config('app.timezone'));
