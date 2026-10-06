<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * CampaignService::createRiderDemographics() defaults an unselected age
 * group to 'any' — the DB enum only allowed it for `gender`, not
 * `age_group`, so every campaign left with no age group picked silently
 * got zero demographic rows (the insert was rejected against the model's
 * own AGE_GROUPS whitelist before it ever reached the DB, but the column
 * itself needs the same 'any' value to stay consistent with `gender`).
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE campaign_rider_demographics MODIFY age_group ENUM('18-25','26-35','36-45','46-55','55+','any') NOT NULL");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE campaign_rider_demographics MODIFY age_group ENUM('18-25','26-35','36-45','46-55','55+') NOT NULL");
    }
};
