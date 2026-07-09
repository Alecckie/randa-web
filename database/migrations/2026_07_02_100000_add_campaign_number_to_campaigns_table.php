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
        Schema::table('campaigns', function (Blueprint $table) {
            $table->string('campaign_number')->nullable()->unique()->after('id');
        });

        // Backfill existing campaigns with a number derived from their id.
        DB::table('campaigns')->orderBy('id')->select('id')->get()->each(function ($campaign) {
            DB::table('campaigns')->where('id', $campaign->id)->update([
                'campaign_number' => sprintf('CMP-%06d', $campaign->id),
            ]);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('campaigns', function (Blueprint $table) {
            $table->dropColumn('campaign_number');
        });
    }
};
