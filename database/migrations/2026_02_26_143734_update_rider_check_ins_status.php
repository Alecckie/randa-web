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
        DB::statement("SET SESSION sql_mode = ''");

        DB::statement("ALTER TABLE rider_check_ins 
        MODIFY COLUMN status 
        ENUM('active', 'completed', 'started', 'paused', 'resumed', 'ended') 
        DEFAULT 'active'");

        DB::statement("UPDATE rider_check_ins SET status = 'started' WHERE status = 'active'");
        DB::statement("UPDATE rider_check_ins SET status = 'ended' WHERE status = 'completed'");

        DB::statement("ALTER TABLE rider_check_ins 
        MODIFY COLUMN status 
        ENUM('started', 'paused', 'resumed', 'ended') 
        DEFAULT 'started'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("SET SESSION sql_mode = ''");

        DB::statement("ALTER TABLE rider_check_ins 
        MODIFY COLUMN status 
        ENUM('started', 'paused', 'resumed', 'ended', 'active', 'completed') 
        DEFAULT 'started'");

        DB::statement("UPDATE rider_check_ins SET status = 'active' WHERE status IN ('started', 'paused', 'resumed')");
        DB::statement("UPDATE rider_check_ins SET status = 'completed' WHERE status = 'ended'");

        DB::statement("ALTER TABLE rider_check_ins 
        MODIFY COLUMN status 
        ENUM('active', 'completed') 
        DEFAULT 'active'");
    }
};
