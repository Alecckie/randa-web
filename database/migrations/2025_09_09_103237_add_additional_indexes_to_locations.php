<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Both 'mysql' driver (MySQL) and 'mariadb' driver (MariaDB) support
        // FULLTEXT on InnoDB tables. Accept both so XAMPP/MariaDB isn't skipped.
        $driver = DB::getDriverName();
        $supportsFulltext = in_array($driver, ['mysql', 'mariadb'], true);

        Schema::table('counties', function (Blueprint $table) use ($supportsFulltext) {
            if ($supportsFulltext) {
                $table->fullText('name', 'counties_name_fulltext');
            }
        });

        Schema::table('sub_counties', function (Blueprint $table) use ($supportsFulltext) {
            if ($supportsFulltext) {
                $table->fullText('name', 'sub_counties_name_fulltext');
            }
        });

        Schema::table('wards', function (Blueprint $table) use ($supportsFulltext) {
            if ($supportsFulltext) {
                $table->fullText('name', 'wards_name_fulltext');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('counties', function (Blueprint $table) {
            $table->dropFullText('counties_name_fulltext');
        });

        Schema::table('sub_counties', function (Blueprint $table) {
            $table->dropFullText('sub_counties_name_fulltext');
        });

        Schema::table('wards', function (Blueprint $table) {
            $table->dropFullText('wards_name_fulltext');
        });
    }
};
