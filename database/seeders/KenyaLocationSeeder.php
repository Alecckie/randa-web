<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class KenyaLocationSeeder extends Seeder
{
    public function run(): void
    {
        if (DB::table('counties')->count() > 0) {
            $this->command?->info('Kenya location data already seeded, skipping.');
            return;
        }

        $this->command?->info('Parsing county.sql...');

        // ── Parse INSERT rows from the SQL file ──────────────────────────────────
        // We extract data directly in PHP instead of running DB::unprepared() with
        // the full file, because PDO::exec() on XAMPP's MariaDB only executes the
        // first statement in a multi-statement string (the SET SQL_MODE line), so
        // the CREATE TABLE never runs and the seeder crashes.
        //
        // The place names use Unicode RIGHT SINGLE QUOTATION MARK (U+2019 ') not
        // ASCII apostrophes, so a regex on ASCII ' delimiters is safe.

        $sql  = file_get_contents(database_path('county.sql'));
        $rows = $this->parseRows($sql);

        if (empty($rows)) {
            $this->command?->error('No data rows found in county.sql — check the file format.');
            return;
        }

        $now = now();

        // ── Step 1: counties (47 unique) ─────────────────────────────────────────
        $this->command?->info('Inserting counties...');

        $countyInserts = [];
        $countyCodeToIdx = [];

        foreach ($rows as $row) {
            $cc = $row[0];
            if (!array_key_exists($cc, $countyCodeToIdx)) {
                $countyCodeToIdx[$cc] = count($countyInserts);
                $countyInserts[] = [
                    'code'       => $cc,
                    'name'       => $row[1],
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
        }

        DB::table('counties')->insert($countyInserts);

        // Map county_code → actual auto-increment id
        $countyIdByCode = DB::table('counties')->pluck('id', 'code')
            ->map(fn($v) => (int) $v)->toArray();

        // ── Step 2: sub-counties (~290 unique) ───────────────────────────────────
        $this->command?->info('Inserting sub-counties...');

        $subInserts      = [];
        $subKeyToIdx     = [];

        foreach ($rows as $row) {
            [$cc, , $subName] = $row;
            $key = $cc . '|' . $subName;
            if (!array_key_exists($key, $subKeyToIdx)) {
                $subKeyToIdx[$key] = count($subInserts);
                $subInserts[] = [
                    'county_id'  => $countyIdByCode[$cc],
                    'name'       => $subName,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
        }

        // insertOrIgnore protects against the unique(name) constraint if any
        // constituency name appears under more than one county in the data.
        DB::table('sub_counties')->insertOrIgnore($subInserts);

        // Map "county_code|sub_name" → actual auto-increment id
        $subIdByKey = [];
        DB::table('sub_counties')
            ->join('counties', 'sub_counties.county_id', '=', 'counties.id')
            ->select('sub_counties.id', 'counties.code as county_code', 'sub_counties.name')
            ->get()
            ->each(function ($r) use (&$subIdByKey) {
                $subIdByKey[(int) $r->county_code . '|' . $r->name] = (int) $r->id;
            });

        // ── Step 3: wards (1,451 rows) ───────────────────────────────────────────
        $this->command?->info('Inserting wards...');

        $wardInserts = [];

        foreach ($rows as $row) {
            [$cc, , $subName, $wardName] = $row;
            $key   = $cc . '|' . $subName;
            $subId = $subIdByKey[$key] ?? null;
            if (!$subId) {
                continue;
            }
            $wardInserts[] = [
                'sub_county_id' => $subId,
                'name'          => $wardName,
                'created_at'    => $now,
                'updated_at'    => $now,
            ];
        }

        foreach (array_chunk($wardInserts, 500) as $chunk) {
            DB::table('wards')->insert($chunk);
        }

        $c = DB::table('counties')->count();
        $s = DB::table('sub_counties')->count();
        $w = DB::table('wards')->count();

        $this->command?->info("Done: {$c} counties | {$s} sub-counties | {$w} wards.");
    }

    /**
     * Extract data rows from the INSERT statements in county.sql.
     *
     * Returns an array of [county_code, county_name, constituency_name, ward_name].
     *
     * The regex uses ASCII single-quote (0x27) as the delimiter. Place names that
     * contain apostrophes (e.g. "Ng'ombe") use Unicode RIGHT SINGLE QUOTATION MARK
     * (U+2019) which is a three-byte UTF-8 sequence and is NOT matched by [^'].
     */
    private function parseRows(string $sql): array
    {
        // Match: (integer, integer, 'text', 'text', 'text')
        // The \d+ at position 1 is the raw id column — we skip it.
        preg_match_all(
            "/\(\s*\d+\s*,\s*(\d+)\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*\)/u",
            $sql,
            $matches,
            PREG_SET_ORDER
        );

        $rows = [];
        foreach ($matches as $m) {
            $rows[] = [
                (int)   $m[1],          // county_code
                trim($m[2]),            // county_name
                trim($m[3]),            // constituency_name
                trim($m[4]),            // ward_name (constituencies_wards)
            ];
        }

        return $rows;
    }
}
