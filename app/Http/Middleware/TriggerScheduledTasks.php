<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

// Poor-man's cron for shared hosting: since there's no crontab available,
// this runs `schedule:run` after the response has already been sent to the
// client, throttled by a cache lock so it fires at most once per
// scheduling.web_cron_interval_seconds instead of on every request.
class TriggerScheduledTasks
{
    public function handle(Request $request, Closure $next): Response
    {
        return $next($request);
    }

    public function terminate(Request $request, Response $response): void
    {
        if (! config('scheduling.web_cron_enabled')) {
            return;
        }

        $interval = config('scheduling.web_cron_interval_seconds');

        if (Cache::add('scheduling:web_cron_lock', true, $interval)) {
            Artisan::call('schedule:run');
        }
    }
}
