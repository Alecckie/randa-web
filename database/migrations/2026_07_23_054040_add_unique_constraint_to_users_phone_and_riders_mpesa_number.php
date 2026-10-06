<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * DB-level backstop for phone/mpesa_number uniqueness — the app-layer
     * `unique:...` validation rules only run a SELECT before the INSERT, so
     * without this index two concurrent requests can both pass validation
     * and land duplicate rows. Both columns are nullable; a unique index
     * permits multiple NULLs in MySQL, so this doesn't affect rows where
     * phone/mpesa_number hasn't been set yet.
     */
    public function up(): void
    {
        // MySQL DDL auto-commits per statement (no transactional rollback),
        // so a prior run of this migration that partially failed can leave
        // the users.phone index in place even though the migration wasn't
        // recorded as run — guard each index so re-running is safe.
        if (!$this->indexExists('users', 'users_phone_unique')) {
            Schema::table('users', function (Blueprint $table) {
                $table->unique('phone');
            });
        }

        if (!$this->indexExists('riders', 'riders_mpesa_number_unique')) {
            Schema::table('riders', function (Blueprint $table) {
                $table->unique('mpesa_number');
            });
        }
    }

    private function indexExists(string $table, string $indexName): bool
    {
        return collect(\Illuminate\Support\Facades\DB::select("SHOW INDEX FROM `{$table}` WHERE Key_name = ?", [$indexName]))->isNotEmpty();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['phone']);
        });

        Schema::table('riders', function (Blueprint $table) {
            $table->dropUnique(['mpesa_number']);
        });
    }
};
