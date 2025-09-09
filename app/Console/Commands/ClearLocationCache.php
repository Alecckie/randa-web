<?php

namespace App\Console\Commands;

use App\Services\LocationService;
use Illuminate\Console\Command;

class ClearLocationCache extends Command
{
    protected $signature = 'locations:clear-cache';
    protected $description = 'Clear all location-related cache';

    public function handle(LocationService $locationService): int
    {
        try {
            $locationService->clearLocationCache();
            $this->info('Location cache cleared successfully!');
            return Command::SUCCESS;
        } catch (\Exception $e) {
            $this->error('Failed to clear cache: ' . $e->getMessage());
            return Command::FAILURE;
        }
    }
}
