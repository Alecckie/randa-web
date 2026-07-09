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
            // Time excluded from worked_hours because the GPS trail showed
            // no sustained movement, even though the rider never declared a
            // pause. See App\Services\Shift\RiderMovementAnalyzer.
            $table->decimal('stationary_hours', 5, 2)->nullable()->after('payable_hours');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rider_check_ins', function (Blueprint $table) {
            $table->dropColumn('stationary_hours');
        });
    }
};
