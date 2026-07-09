<?php

namespace App\Console\Commands\Database;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * This database's tables were found to be MyISAM despite the server's
 * default_storage_engine being InnoDB (see 2026_07_05_195551_convert_rider_shift_tables_to_innodb.php
 * for the first, narrowly-scoped fix on just the rider-shift tables).
 * MyISAM has no transactions, no row locking, and silently drops FOREIGN
 * KEY constraints — this command finishes the job for every remaining
 * table so DB::transaction()/lockForUpdate() actually work everywhere.
 *
 * Deliberately requires confirmation (or --force) before making any
 * change, and defaults to a dry-run-style preview via --dry-run — see
 * app/Console/Commands/RiderShifts/PurgeSeededData.php's history for why
 * destructive/impactful commands on this project don't get silent
 * defaults or run without an explicit, informed choice.
 */
class ConvertToInnodb extends Command
{
    protected $signature = 'db:convert-to-innodb
        {--dry-run : List tables that would be converted without changing anything}
        {--force : Skip the confirmation prompt (needed for non-interactive/scripted runs)}
        {--exclude=* : Table name(s) to leave untouched}';

    protected $description = "Convert every non-InnoDB table in this app's database connection to InnoDB";

    public function handle(): int
    {
        $connection = config('database.default');
        $database = config("database.connections.{$connection}.database");
        $excluded = array_map('strtolower', $this->option('exclude'));

        $tables = collect(DB::select(
            'SELECT TABLE_NAME, ENGINE, TABLE_ROWS FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND ENGINE IS NOT NULL',
            [$database]
        ));

        $toConvert = $tables
            ->filter(fn ($t) => strtoupper((string) $t->ENGINE) !== 'INNODB')
            ->reject(fn ($t) => in_array(strtolower($t->TABLE_NAME), $excluded, true))
            ->values();

        if ($toConvert->isEmpty()) {
            $this->info('Every table is already InnoDB (or excluded). Nothing to do.');
            return Command::SUCCESS;
        }

        $this->table(
            ['Table', 'Current Engine', 'Approx Rows'],
            $toConvert->map(fn ($t) => [$t->TABLE_NAME, $t->ENGINE, number_format((int) $t->TABLE_ROWS)])->all()
        );

        if ($this->option('dry-run')) {
            $this->warn('Dry run — no changes made.');
            return Command::SUCCESS;
        }

        $this->warn(
            'Converting a table\'s engine rebuilds it entirely. This can take a while and ' .
            'briefly lock each table (worse for the larger ones) — run during low traffic, ' .
            'not mid-day on a busy server. Existing MyISAM data is preserved; this only changes ' .
            'the storage engine.'
        );

        if (! $this->option('force') && ! $this->confirm('Convert ' . $toConvert->count() . ' table(s) to InnoDB now?', false)) {
            $this->warn('Aborted — no changes made.');
            return Command::SUCCESS;
        }

        $succeeded = 0;
        $failures = [];

        foreach ($toConvert as $table) {
            $this->line("Converting {$table->TABLE_NAME} ({$table->ENGINE} → InnoDB)...");

            try {
                DB::statement("ALTER TABLE `{$table->TABLE_NAME}` ENGINE=InnoDB");
                $succeeded++;
            } catch (\Throwable $e) {
                $failures[] = [$table->TABLE_NAME, $e->getMessage()];
                $this->error("  Failed: {$e->getMessage()}");
            }
        }

        $this->info("Converted {$succeeded} table(s) to InnoDB.");

        if (! empty($failures)) {
            $this->error(count($failures) . ' table(s) failed — left unchanged:');
            $this->table(['Table', 'Error'], $failures);
            return Command::FAILURE;
        }

        return Command::SUCCESS;
    }
}
