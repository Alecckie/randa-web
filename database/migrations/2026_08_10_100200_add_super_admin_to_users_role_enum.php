<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Widens users.role to add 'super_admin' — a distinct role from 'admin',
 * not a boolean flag on top of it. isAdmin() intentionally stays an exact
 * 'admin' match, so a super_admin is never silently treated as a regular
 * operational admin anywhere in the app.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE users MODIFY role ENUM('admin','rider','advertiser','super_admin') NOT NULL");
    }

    public function down(): void
    {
        // Fails if any row still has role = 'super_admin' — demote those
        // rows first if you actually need to roll this back.
        DB::statement("ALTER TABLE users MODIFY role ENUM('admin','rider','advertiser') NOT NULL");
    }
};
