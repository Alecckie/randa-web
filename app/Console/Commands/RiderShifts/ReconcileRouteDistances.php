<?php

namespace App\Console\Commands\RiderShifts;

use App\Models\RiderRoute;
use App\Services\Shift\RiderMovementAnalyzer;
use Illuminate\Console\Command;

/**
 * rider_routes.total_distance/avg_speed/max_speed were never actually
 * computed from real GPS data before RiderTrackingService started deriving
 * them incrementally per recorded point — the only place that ever wrote
 * these columns was the tracking test seeders. Every route recorded before
 * that fix reads as 0 km on every dashboard that sums total_distance (admin
 * tracking, campaign analytics, advertiser dashboard) despite having real
 * GPS points on file. This recomputes them from rider_gps_points, the
 * source of truth, using the same haversine logic RiderMovementAnalyzer
 * already uses for movement-based pay.
 */
class ReconcileRouteDistances extends Command
{
    protected $signature = 'rider-shifts:reconcile-route-distances
        {--dry-run : Preview affected routes without changing anything}';

    protected $description = "Recompute each route's total_distance/avg_speed/max_speed from its recorded GPS points";

    public function handle(RiderMovementAnalyzer $movementAnalyzer): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $rows = [];

        RiderRoute::chunkById(200, function ($routes) use ($movementAnalyzer, $dryRun, &$rows) {
            foreach ($routes as $route) {
                $from = $route->started_at ?? $route->route_date->startOfDay();
                $to   = $route->ended_at ?? now();

                $movement = $movementAnalyzer->analyze($route->check_in_id, $from, $to);

                if (!$movement['has_sufficient_data']) {
                    continue;
                }

                $before = (float) $route->total_distance;
                $after  = $movement['total_distance_km'];

                if (abs(round($before - $after, 2)) <= 0.01) {
                    continue;
                }

                $rows[] = [
                    $route->id,
                    $route->rider_id,
                    $route->route_date->format('Y-m-d'),
                    number_format($before, 2),
                    number_format($after, 2),
                ];

                if (!$dryRun) {
                    $route->update([
                        'total_distance' => $after,
                        'avg_speed'      => $movement['avg_speed_kmh'],
                        'max_speed'      => $movement['max_speed_kmh'],
                    ]);
                }
            }
        });

        if (empty($rows)) {
            $this->info('Every route already matches its real GPS-derived distance — nothing to do.');
            return Command::SUCCESS;
        }

        $this->table(['Route ID', 'Rider ID', 'Date', 'Distance Before (km)', 'Distance After (km)'], $rows);

        if ($dryRun) {
            $this->warn('Dry run — no changes made.');
        } else {
            $this->info(count($rows) . ' route(s) reconciled.');
        }

        return Command::SUCCESS;
    }
}
