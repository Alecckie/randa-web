<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CoverageAreasSeeder extends Seeder
{
    public function run(): void
    {
        $areas = [
            ['name' => 'Nairobi CBD', 'county' => 'Nairobi', 'sub_county' => 'Starehe', 'ward' => 'Pangani'],
            ['name' => 'Westlands', 'county' => 'Nairobi', 'sub_county' => 'Westlands', 'ward' => 'Parklands/Highridge'],
            ['name' => 'Karen', 'county' => 'Nairobi', 'sub_county' => 'Langata', 'ward' => 'Karen'],
            ['name' => 'Ngara', 'county' => 'Nairobi', 'sub_county' => 'Starehe', 'ward' => 'Ngara'],
            ['name' => 'Parklands', 'county' => 'Nairobi', 'sub_county' => 'Westlands', 'ward' => 'Parklands/Highridge'],
            ['name' => 'Donholm', 'county' => 'Nairobi', 'sub_county' => 'Embakasi West', 'ward' => 'Donholm'],
            ['name' => 'Embakasi', 'county' => 'Nairobi', 'sub_county' => 'Embakasi East', 'ward' => null],
            ['name' => 'Langata', 'county' => 'Nairobi', 'sub_county' => 'Langata', 'ward' => 'Langata'],
            ['name' => 'South B', 'county' => 'Nairobi', 'sub_county' => 'Starehe', 'ward' => null],

            ['name' => 'Nyali', 'county' => 'Mombasa', 'sub_county' => 'Nyali', 'ward' => 'Nyali'],
            ['name' => 'Likoni', 'county' => 'Mombasa', 'sub_county' => 'Likoni', 'ward' => 'Likoni'],
            ['name' => 'Kisauni', 'county' => 'Mombasa', 'sub_county' => 'Kisauni', 'ward' => 'Kisauni'],
            ['name' => 'Bamburi', 'county' => 'Mombasa', 'sub_county' => 'Kisauni', 'ward' => 'Bamburi'],
            ['name' => 'Changamwe', 'county' => 'Mombasa', 'sub_county' => 'Changamwe', 'ward' => 'Changamwe'],

            ['name' => 'Milimani', 'county' => 'Kisumu', 'sub_county' => 'Kisumu Central', 'ward' => null],
            ['name' => 'Nyalenda', 'county' => 'Kisumu', 'sub_county' => 'Kisumu Central', 'ward' => 'Nyalenda A'],
            ['name' => 'Mamboleo', 'county' => 'Kisumu', 'sub_county' => 'Kisumu East', 'ward' => null],
            ['name' => 'Kondele', 'county' => 'Kisumu', 'sub_county' => 'Kisumu Central', 'ward' => 'Kondele'],

            ['name' => 'Thika Town', 'county' => 'Kiambu', 'sub_county' => 'Thika Town', 'ward' => 'Township'],
            ['name' => 'Makongeni', 'county' => 'Kiambu', 'sub_county' => 'Thika Town', 'ward' => 'Makongeni'],
            ['name' => 'Landless', 'county' => 'Kiambu', 'sub_county' => 'Thika Town', 'ward' => null],

            ['name' => 'Murang’a Town', 'county' => 'Murang’a', 'sub_county' => 'Kiharu', 'ward' => null],
            ['name' => 'Kangema', 'county' => 'Murang’a', 'sub_county' => 'Kangema', 'ward' => null],
            ['name' => 'Kandara', 'county' => 'Murang’a', 'sub_county' => 'Kandara', 'ward' => null],

            ['name' => 'Nyeri Town', 'county' => 'Nyeri', 'sub_county' => 'Nyeri Town', 'ward' => null],
            ['name' => 'Karatina', 'county' => 'Nyeri', 'sub_county' => 'Mathira East', 'ward' => null],
            ['name' => 'Othaya', 'county' => 'Nyeri', 'sub_county' => 'Othaya', 'ward' => null],

            ['name' => 'Kerugoya', 'county' => 'Kirinyaga', 'sub_county' => 'Kirinyaga Central', 'ward' => null],
            ['name' => 'Kutus', 'county' => 'Kirinyaga', 'sub_county' => 'Kirinyaga Central', 'ward' => null],
            ['name' => 'Sagana', 'county' => 'Kirinyaga', 'sub_county' => 'Kirinyaga West', 'ward' => null],

            ['name' => 'Garissa Town', 'county' => 'Garissa', 'sub_county' => 'Garissa Township', 'ward' => null],
            ['name' => 'Madogo', 'county' => 'Garissa', 'sub_county' => null, 'ward' => null],
            ['name' => 'Bura East', 'county' => 'Garissa', 'sub_county' => 'Bura', 'ward' => null],

            ['name' => 'Meru Town', 'county' => 'Meru', 'sub_county' => 'Imenti North', 'ward' => null],
            ['name' => 'Makutano', 'county' => 'Meru', 'sub_county' => 'Imenti North', 'ward' => null],
            ['name' => 'Nkubu', 'county' => 'Meru', 'sub_county' => 'Imenti South', 'ward' => null],

            ['name' => 'Kisii Town', 'county' => 'Kisii', 'sub_county' => 'Kisii Central', 'ward' => null],
            ['name' => 'Daraja Mbili', 'county' => 'Kisii', 'sub_county' => 'Kisii Central', 'ward' => null],
            ['name' => 'Suneka', 'county' => 'Kisii', 'sub_county' => 'Bonchari', 'ward' => null],

            ['name' => 'Embu Town', 'county' => 'Embu', 'sub_county' => 'Manyatta', 'ward' => null],
            ['name' => 'Runyenjes', 'county' => 'Embu', 'sub_county' => 'Runyenjes', 'ward' => null],
            ['name' => 'Siakago', 'county' => 'Embu', 'sub_county' => 'Mbeere North', 'ward' => null],

            ['name' => 'Kakamega Town', 'county' => 'Kakamega', 'sub_county' => 'Lurambi', 'ward' => null],
            ['name' => 'Mumias', 'county' => 'Kakamega', 'sub_county' => 'Mumias West', 'ward' => null],
            ['name' => 'Butere', 'county' => 'Kakamega', 'sub_county' => 'Butere', 'ward' => null],

            ['name' => 'Busia Town', 'county' => 'Busia', 'sub_county' => 'Matayos', 'ward' => null],
            ['name' => 'Nambale', 'county' => 'Busia', 'sub_county' => 'Nambale', 'ward' => null],
            ['name' => 'Malaba', 'county' => 'Busia', 'sub_county' => 'Teso North', 'ward' => null],
        ];

        foreach ($areas as $area) {
            $countyId = DB::table('counties')->where('name', $area['county'])->value('id');
            $subCountyId = $area['sub_county']
                ? DB::table('sub_counties')->where('name', $area['sub_county'])->value('id')
                : null;
            $wardId = $area['ward']
                ? DB::table('wards')->where('name', $area['ward'])->value('id')
                : null;

            DB::table('coverage_areas')->insert([
                'name' => $area['name'],
                'area_code' => strtoupper(Str::random(6)),
                'county_id' => $countyId,
                'sub_county_id' => $subCountyId,
                'ward_id' => $wardId,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            if (!$countyId) {
                $this->command->warn("⚠️ County not found: {$area['county']} for {$area['name']}");
            }
            if ($area['sub_county'] && !$subCountyId) {
                $this->command->warn("⚠️ Sub-county not found: {$area['sub_county']} for {$area['name']}");
            }
            if ($area['ward'] && !$wardId) {
                $this->command->warn("⚠️ Ward not found: {$area['ward']} for {$area['name']}");
            }
        }
    }
}
