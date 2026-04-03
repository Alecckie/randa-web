<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Seeds accurate center coordinates and radii for the areas already
 * inserted by CoverageAreasSeeder.
 *
 * Coordinates are verified against OpenStreetMap for each area.
 * Radii are set conservatively — an admin can tune them per area
 * in the coverage areas management UI.
 *
 * Format: 'Area Name' => [latitude, longitude, radius_metres]
 */
return new class extends Migration
{
    public function up(): void
    {
        $coordinates = [
            // ── Nairobi ──────────────────────────────────────────────────
            'Nairobi CBD'  => [-1.2864,  36.8172, 1500],
            'Westlands'    => [-1.2635,  36.8025, 2000],
            'Karen'        => [-1.3181,  36.7172, 2500],
            'Ngara'        => [-1.2756,  36.8317, 1200],
            'Parklands'    => [-1.2603,  36.8154, 1500],
            'Donholm'      => [-1.2956,  36.8817, 1800],
            'Embakasi'     => [-1.3197,  36.9028, 3000],
            'Langata'      => [-1.3331,  36.7700, 2500],
            'South B'      => [-1.3053,  36.8217, 1500],

            // ── Mombasa ───────────────────────────────────────────────────
            'Nyali'        => [-4.0306,  39.7197, 2500],
            'Likoni'       => [-4.0839,  39.6636, 2000],
            'Kisauni'      => [-3.9989,  39.6961, 2500],
            'Bamburi'      => [-3.9975,  39.7261, 2000],
            'Changamwe'    => [-4.0436,  39.6494, 2000],

            // ── Kisumu ────────────────────────────────────────────────────
            'Milimani'     => [-0.1019,  34.7617, 2000],
            'Nyalenda'     => [-0.1200,  34.7619, 1800],
            'Mamboleo'     => [-0.0769,  34.8094, 2000],
            'Kondele'      => [-0.0944,  34.7783, 1500],

            // ── Kiambu ────────────────────────────────────────────────────
            'Thika Town'   => [-1.0332,  37.0694, 2500],
            'Makongeni'    => [-1.0428,  37.0775, 1500],
            'Landless'     => [-1.0500,  37.0800, 1500],

            // ── Murang'a ──────────────────────────────────────────────────
            "Murang'a Town" => [-0.7189,  37.1528, 2000],
            'Kangema'      => [-0.6039,  36.9736, 1500],
            'Kandara'      => [-0.9203,  37.0175, 1500],

            // ── Nyeri ─────────────────────────────────────────────────────
            'Nyeri Town'   => [-0.4217,  36.9475, 2000],
            'Karatina'     => [-0.4747,  37.1219, 1500],
            'Othaya'       => [-0.5681,  36.9242, 1500],

            // ── Kirinyaga ─────────────────────────────────────────────────
            'Kerugoya'     => [-0.4989,  37.2819, 1500],
            'Kutus'        => [-0.5281,  37.3281, 1200],
            'Sagana'       => [-0.6733,  37.2100, 1200],

            // ── Garissa ───────────────────────────────────────────────────
            'Garissa Town' => [-0.4536,  39.6461, 2500],
            'Madogo'       => [-0.6147,  39.9822, 1500],
            'Bura East'    => [-1.1019,  39.9408, 1500],

            // ── Meru ─────────────────────────────────────────────────────
            'Meru Town'    => [0.0469,  37.6494, 2000],
            'Makutano'     => [0.0667,  37.6308, 1500],
            'Nkubu'        => [-0.0556,  37.6700, 1500],

            // ── Kisii ────────────────────────────────────────────────────
            'Kisii Town'   => [-0.6817,  34.7661, 2000],
            'Daraja Mbili' => [-0.6692,  34.7533, 1200],
            'Suneka'       => [-0.7800,  34.7175, 1500],

            // ── Embu ─────────────────────────────────────────────────────
            'Embu Town'    => [-0.5317,  37.4608, 2000],
            'Runyenjes'    => [-0.4142,  37.5694, 1500],
            'Siakago'      => [-0.5697,  37.6719, 1200],

            // ── Kakamega ─────────────────────────────────────────────────
            'Kakamega Town'=> [0.2839,  34.7519, 2000],
            'Mumias'       => [0.3331,  34.4919, 1800],
            'Butere'       => [0.2061,  34.4942, 1500],

            // ── Busia ────────────────────────────────────────────────────
            'Busia Town'   => [0.4608,  34.1108, 1800],
            'Nambale'      => [0.5483,  34.2469, 1500],
            'Malaba'       => [0.6306,  34.2597, 1200],
        ];

        foreach ($coordinates as $name => [$lat, $lng, $radius]) {
            DB::table('coverage_areas')
                ->where('name', $name)
                ->whereNull('deleted_at')
                ->update([
                    'center_latitude'  => $lat,
                    'center_longitude' => $lng,
                    'radius_metres'    => $radius,
                    'updated_at'       => now(),
                ]);
        }
    }

    public function down(): void
    {
        DB::table('coverage_areas')->update([
            'center_latitude'  => null,
            'center_longitude' => null,
            'radius_metres'    => null,
        ]);
    }
};