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
        Schema::table('campaign_assignments', function (Blueprint $table) {
            $table->dropColumn('advertiser_id');
            $table->dropColumn('zone_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('campaign_assignments', function (Blueprint $table) {
            $table->unsignedBigInteger('advertiser_id')->index();
            $table->unsignedBigInteger('zone_id')->index();
        });
    }
};
