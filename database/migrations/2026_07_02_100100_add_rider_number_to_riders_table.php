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
        Schema::table('riders', function (Blueprint $table) {
            $table->string('rider_number')->nullable()->unique()->after('id');
        });

        // Backfill existing riders with a number derived from their id.
        DB::table('riders')->orderBy('id')->select('id')->get()->each(function ($rider) {
            DB::table('riders')->where('id', $rider->id)->update([
                'rider_number' => sprintf('RDR-%06d', $rider->id),
            ]);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('riders', function (Blueprint $table) {
            $table->dropColumn('rider_number');
        });
    }
};
