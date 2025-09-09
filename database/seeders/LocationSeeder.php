<?php

namespace Database\Seeders;

use App\Models\County;
use App\Models\SubCounty;
use App\Models\Ward;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Exception;

class LocationSeeder extends Seeder
{
    private const BATCH_SIZE = 1000;

    public function run(): void
    {
        $this->command->info('Starting location data seeding...');
        
        DB::beginTransaction();
        
        try {
            
            DB::statement('SET FOREIGN_KEY_CHECKS=0;');
            
            $this->truncateTables();
            
            if ($this->shouldUseJsonFile()) {
                $this->seedFromJsonFile();
            } else {
                $this->seedFromSqlData();
            }
            
            DB::statement('SET FOREIGN_KEY_CHECKS=1;');
            DB::commit();
            
            $this->command->info('Location data seeded successfully!');
            $this->displayStatistics();
            
        } catch (Exception $e) {
            DB::rollBack();
            DB::statement('SET FOREIGN_KEY_CHECKS=1;');
            
            Log::error('Location seeding failed: ' . $e->getMessage());
            $this->command->error('Seeding failed: ' . $e->getMessage());
            
            throw $e;
        }
    }

    private function truncateTables(): void
    {
        $this->command->info('Cleaning existing location data...');
        
        Ward::truncate();
        SubCounty::truncate();
        County::truncate();
    }

    private function shouldUseJsonFile(): bool
    {
        $jsonPath = database_path('seeders/data/locations.json');
        return file_exists($jsonPath);
    }

    private function seedFromJsonFile(): void
    {
        $this->command->info('Seeding from JSON file...');
        
        $jsonPath = database_path('seeders/data/locations.json');
        $jsonData = json_decode(file_get_contents($jsonPath), true);
        
        if (!$jsonData) {
            throw new Exception('Invalid JSON data in locations.json');
        }

        $this->processJsonData($jsonData);
    }

    private function seedFromSqlData(): void
    {
        $this->command->info('Seeding from SQL data (your existing county table)...');
        
        if (!DB::getSchemaBuilder()->hasTable('county')) {
            throw new Exception('Source county table not found. Please ensure your SQL data is imported first.');
        }

        $this->migrateLegacyData();
    }

    private function processJsonData(array $data): void
    {
        $counties = [];
        $sub_counties = [];
        $wards = [];
        
        $countyMap = [];
        $subcountyMap = [];
        
        foreach ($data as $item) {
            // Process county
            $countyKey = $item['county_code'] . '|' . $item['county_name'];
            if (!isset($countyMap[$countyKey])) {
                $countyId = count($counties) + 1;
                $counties[] = [
                    'id' => $countyId,
                    'code' => $item['county_code'],
                    'name' => trim($item['county_name']),
                    'created_at' => now(),
                    'updated_at' => now()
                ];
                $countyMap[$countyKey] = $countyId;
            }
            
            // Process subcounty
            $subcountyKey = $countyKey . '|' . $item['constituency_name'];
            if (!isset($subcountyMap[$subcountyKey])) {
                $subcountyId = count($sub_counties) + 1;
                $sub_counties[] = [
                    'id' => $subcountyId,
                    'county_id' => $countyMap[$countyKey],
                    'name' => trim($item['constituency_name']),
                    'created_at' => now(),
                    'updated_at' => now()
                ];
                $subcountyMap[$subcountyKey] = $subcountyId;
            }
            
            // Process ward
            $wards[] = [
                'id' => count($wards) + 1,
                'sub_county_id' => $subcountyMap[$subcountyKey],
                'name' => trim($item['constituencies_wards']),
                'created_at' => now(),
                'updated_at' => now()
            ];
        }

        $this->insertDataInBatches('counties', $counties);
        $this->insertDataInBatches('sub_counties', $sub_counties);
        $this->insertDataInBatches('wards', $wards);
    }

    private function migrateLegacyData(): void
    {
        // Get unique counties
        $this->command->info('Processing counties...');
        $uniqueCounties = DB::table('county')
            ->select('county_code as code', 'county_name as name')
            ->distinct()
            ->whereNotNull('county_code')
            ->whereNotNull('county_name')
            ->get();

        $counties = $uniqueCounties->map(function ($county, $index) {
            return [
                'id' => $index + 1,
                'code' => $county->code,
                'name' => trim($county->name),
                'created_at' => now(),
                'updated_at' => now()
            ];
        })->toArray();

        $this->insertDataInBatches('counties', $counties);

        // Create county mapping
        $countyMap = County::pluck('id', 'code')->toArray();

        // Get unique sub_counties
        $this->command->info('Processing sub_counties...');
        $uniqueSub_counties = DB::table('county')
            ->select('county_code', 'constituency_name')
            ->distinct()
            ->whereNotNull('county_code')
            ->whereNotNull('constituency_name')
            ->get();

        $sub_counties = $uniqueSub_counties->map(function ($subcounty, $index) use ($countyMap) {
            return [
                'id' => $index + 1,
                'county_id' => $countyMap[$subcounty->county_code],
                'name' => trim($subcounty->constituency_name),
                'created_at' => now(),
                'updated_at' => now()
            ];
        })->toArray();

        $this->insertDataInBatches('sub_counties', $sub_counties);

        // Create subcounty mapping
        $subcountyMap = [];
        $subcountyRecords = DB::table('sub_counties')
            ->join('counties', 'sub_counties.county_id', '=', 'counties.id')
            ->select('sub_counties.id', 'counties.code as county_code', 'sub_counties.name as subcounty_name')
            ->get();

        foreach ($subcountyRecords as $record) {
            $key = $record->county_code . '|' . $record->subcounty_name;
            $subcountyMap[$key] = $record->id;
        }

        // Process wards
        $this->command->info('Processing wards...');
        $wardData = DB::table('county')
            ->select('county_code', 'constituency_name', 'constituencies_wards')
            ->whereNotNull('county_code')
            ->whereNotNull('constituency_name')
            ->whereNotNull('constituencies_wards')
            ->get();

        $wards = $wardData->map(function ($ward, $index) use ($subcountyMap) {
            $key = $ward->county_code . '|' . trim($ward->constituency_name);
            
            return [
                'id' => $index + 1,
                'sub_county_id' => $subcountyMap[$key] ?? null,
                'name' => trim($ward->constituencies_wards),
                'created_at' => now(),
                'updated_at' => now()
            ];
        })->filter(function ($ward) {
            return $ward['sub_county_id'] !== null;
        })->values()->toArray();

        $this->insertDataInBatches('wards', $wards);
    }

    private function insertDataInBatches(string $table, array $data): void
    {
        $total = count($data);
        $this->command->info("Inserting {$total} records into {$table}...");

        $chunks = array_chunk($data, self::BATCH_SIZE);
        $bar = $this->command->getOutput()->createProgressBar(count($chunks));

        foreach ($chunks as $chunk) {
            DB::table($table)->insert($chunk);
            $bar->advance();
        }

        $bar->finish();
        $this->command->newLine();
    }

    private function displayStatistics(): void
    {
        $countiesCount = County::count();
        $sub_countiesCount = SubCounty::count();
        $wardsCount = Ward::count();

        $this->command->info("Statistics:");
        $this->command->info("- Counties: {$countiesCount}");
        $this->command->info("- Sub_counties: {$sub_countiesCount}");
        $this->command->info("- Wards: {$wardsCount}");
        $this->command->info("- Total locations: " . ($countiesCount + $sub_countiesCount + $wardsCount));
    }
}
