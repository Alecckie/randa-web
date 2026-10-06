<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Web-triggered scheduler (shared hosting)
    |--------------------------------------------------------------------------
    |
    | Shared hosting has no crontab, so `schedule:run` never runs on its own.
    | While enabled, App\Http\Middleware\TriggerScheduledTasks calls it after
    | each web response (throttled by a cache lock), which drives the exact
    | same schedule defined in routes/console.php.
    |
    | On a VPS, add the real crontab entry instead:
    |   * * * * * php artisan schedule:run >> /dev/null 2>&1
    | then set SCHEDULER_WEB_CRON_ENABLED=false — routes/console.php needs
    | no changes either way.
    |
    */

    'web_cron_enabled' => (bool) env('SCHEDULER_WEB_CRON_ENABLED', true),

    // Minimum seconds between web-triggered schedule:run calls. schedule:run
    // itself only executes commands that are actually due, so this just
    // caps how often the check runs — 60 mirrors a real per-minute crontab.
    'web_cron_interval_seconds' => (int) env('SCHEDULER_WEB_CRON_INTERVAL_SECONDS', 60),

];
