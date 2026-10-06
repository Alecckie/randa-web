<?php

use App\Http\Middleware\CheckUserRole;
use App\Http\Middleware\EnsureRiderProfileComplete;
use App\Http\Middleware\TriggerScheduledTasks;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [
            \App\Http\Middleware\HandleInertiaRequests::class,
            \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
        ]);

        // Web+api traffic stands in for cron on shared hosting — see
        // config/scheduling.php for how to switch to a real crontab on a VPS.
        $middleware->append(TriggerScheduledTasks::class);

        $middleware->redirectUsersTo(function () {
        return route(auth()->user()->getDashboardRoute());
    });
        
        $middleware->alias([
            'role' => CheckUserRole::class,
            'rider.profile.complete' => EnsureRiderProfileComplete::class
        ]);
        // $middleware->alias([
        //     'rider.profile.complete' => EnsureRiderProfileComplete::class
        // ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
