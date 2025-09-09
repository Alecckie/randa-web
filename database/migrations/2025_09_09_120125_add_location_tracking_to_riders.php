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
        Schema::table('riders', function (Blueprint $table) {
            $table->timestamp('location_last_updated')->nullable()->after('wallet_balance');
            $table->unsignedInteger('location_changes_count')->default(0)->after('location_last_updated');
            $table->index('location_last_updated');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('riders', function (Blueprint $table) {
            //
        });
    }
};
