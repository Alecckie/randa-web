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
        Schema::table('advertisers', function (Blueprint $table) {
            $table->string('advertiser_number')->nullable()->unique()->after('id');
        });

        // Backfill existing advertisers with a number derived from their id.
        DB::table('advertisers')->orderBy('id')->select('id')->get()->each(function ($advertiser) {
            DB::table('advertisers')->where('id', $advertiser->id)->update([
                'advertiser_number' => sprintf('ADV-%06d', $advertiser->id),
            ]);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('advertisers', function (Blueprint $table) {
            $table->dropColumn('advertiser_number');
        });
    }
};
