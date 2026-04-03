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
        Schema::table('coverage_areas', function (Blueprint $table) {
            $table->decimal('center_latitude',  10, 8)->nullable()->after('ward_id')
                ->comment('Center point latitude for geo-fence detection');
            $table->decimal('center_longitude', 11, 8)->nullable()->after('center_latitude')
                ->comment('Center point longitude for geo-fence detection');
            $table->unsignedInteger('radius_metres')->nullable()->after('center_longitude')
                ->default(2000)
                ->comment('Geo-fence radius in metres. Default 2 km.');

            // Composite index — used by AreaVisitService when loading areas
            // that have geometry defined
            $table->index(['center_latitude', 'center_longitude'], 'idx_coverage_center');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('coverage_areas', function (Blueprint $table) {
            $table->dropIndex('idx_coverage_center');
            $table->dropColumn(['center_latitude', 'center_longitude', 'radius_metres']);
        });
    }
};
