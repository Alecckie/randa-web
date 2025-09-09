<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('counties', function (Blueprint $table) {
            // Full text search index
            if (Schema::connection($this->getConnection())->getConnection()->getDriverName() === 'mysql') {
                $table->fullText('name', 'counties_name_fulltext');
            }
        });

        Schema::table('sub_counties', function (Blueprint $table) {
            if (Schema::connection($this->getConnection())->getConnection()->getDriverName() === 'mysql') {
                $table->fullText('name', 'sub_counties_name_fulltext');
            }
        });

        Schema::table('wards', function (Blueprint $table) {
            if (Schema::connection($this->getConnection())->getConnection()->getDriverName() === 'mysql') {
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
