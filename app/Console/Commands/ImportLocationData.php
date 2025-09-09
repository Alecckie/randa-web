<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Database\Seeders\LocationSeeder;

class ImportLocationData extends Command
{
    protected $signature = 'locations:import 
                           {--force : Force import even if data exists}
                           {--source=auto : Data source (sql|json|auto)}
                           {--batch-size=1000 : Batch size for insertion}';

    protected $description = 'Import location data from SQL or JSON source';

    public function handle(): int
    {
        if (!$this->option('force') && $this->hasExistingData()) {
            if (!$this->confirm('Location data already exists. Do you want to continue?')) {
                $this->info('Import cancelled.');
                return Command::FAILURE;
            }
        }

        try {
            $this->info('Starting location data import...');

            $seeder = new LocationSeeder();
            $seeder->setCommand($this);
            $seeder->run();

            $this->info('Location data imported successfully!');
            return Command::SUCCESS;
        } catch (\Exception $e) {
            $this->error('Import failed: ' . $e->getMessage());
            return Command::FAILURE;
        }
    }

    private function hasExistingData(): bool
    {
        return \App\Models\County::exists() ||
            \App\Models\SubCounty::exists() ||
            \App\Models\Ward::exists();
    }
}
