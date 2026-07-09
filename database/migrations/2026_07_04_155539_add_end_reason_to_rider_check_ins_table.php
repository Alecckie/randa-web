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
        Schema::table('rider_check_ins', function (Blueprint $table) {
            // Why the shift ended: completed | sickness | emergency | other.
            // Plain string (not enum) so new reasons don't need a migration.
            $table->string('end_reason')->nullable()->after('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rider_check_ins', function (Blueprint $table) {
            $table->dropColumn('end_reason');
        });
    }
};
