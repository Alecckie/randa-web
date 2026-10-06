<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Matches by email (stable identifier already used by DatabaseSeeder's
 * updateOrCreate), not id — id 1 isn't guaranteed to be this account on
 * every environment.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('users')->where('email', 'admin@randa.co.ke')->update(['role' => 'super_admin']);
    }

    public function down(): void
    {
        DB::table('users')->where('email', 'admin@randa.co.ke')->update(['role' => 'admin']);
    }
};
