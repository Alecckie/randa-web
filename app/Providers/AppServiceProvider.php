<?php

namespace App\Providers;

use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Older MySQL/MariaDB servers cap index keys at 767 bytes.
        // utf8mb4 uses 4 bytes/char → 767 ÷ 4 = 191 max chars per indexed string column.
        Schema::defaultStringLength(191);

        Vite::prefetch(concurrency: 3);
    }
}
