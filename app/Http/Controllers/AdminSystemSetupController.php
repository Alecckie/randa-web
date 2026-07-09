<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

/**
 * Read-only reference page for the admin dashboard: the deployment/database
 * harmonization runbook and the rider-shift Artisan commands built during
 * the 2026-07 rider payroll/GPS rework. Content lives here (not hardcoded
 * in the frontend) so updating a step or adding a new command later is a
 * one-file change.
 */
class AdminSystemSetupController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/SystemSetup', [
            'runbookSections' => [
                [
                    'title' => 'Database Harmonization Runbook',
                    'description' => 'Run in this exact order when deploying the rider payroll/GPS rework to a server that hasn\'t seen it yet. Back up the database first — the purge step is destructive and irreversible.',
                    'steps' => [
                        [
                            'label' => 'Deploy the code, then apply pending migrations',
                            'command' => 'php artisan migrate',
                            'note' => 'Includes an InnoDB engine conversion and raw ALTER TABLE fixes on rider_check_ins/rider_pause_events/rider_routes/riders — can take a while and briefly lock those tables on a server with a lot of real rows. Run during low traffic.',
                            'risk' => 'caution',
                        ],
                        [
                            'label' => 'Refresh cached config (new .env keys won\'t apply otherwise)',
                            'command' => 'php artisan config:cache',
                            'note' => 'Only needed if this server caches config in production.',
                            'risk' => 'safe',
                        ],
                        [
                            'label' => 'Preview the seed-data purge — ONLY if this server actually has seeded/test data to remove',
                            'command' => 'php artisan rider-shifts:purge-seeded-data --before=YYYY-MM-DD --dry-run',
                            'note' => 'There is no default cutoff — you MUST replace YYYY-MM-DD with the real seed/real-data boundary for THIS specific server, verified against its actual data, not copied from another environment or from documentation. Getting this wrong deletes real trip history with no undo. Skip this step and the next entirely if this server\'s history is all real data.',
                            'risk' => 'caution',
                        ],
                        [
                            'label' => 'Execute the purge',
                            'command' => 'php artisan rider-shifts:purge-seeded-data --before=YYYY-MM-DD',
                            'note' => 'Permanently deletes rider_check_ins/rider_pause_events/rider_routes/rider_gps_points before the cutoff, and decrements wallet_balance for any unsettled earnings on the deleted rows first. Prompts for confirmation before deleting (add --force only in scripted/non-interactive contexts, and only after the dry-run above looks correct).',
                            'risk' => 'destructive',
                        ],
                        [
                            'label' => 'Preview wallet reconciliation',
                            'command' => 'php artisan rider-shifts:reconcile-wallets --dry-run',
                            'note' => 'Lists any rider whose wallet_balance doesn\'t match the sum of their real unsettled earnings.',
                            'risk' => 'safe',
                        ],
                        [
                            'label' => 'Execute wallet reconciliation',
                            'command' => 'php artisan rider-shifts:reconcile-wallets',
                            'note' => 'Corrects wallet_balance to exactly match real check-in data — found necessary system-wide on 2026-07-08 (seeded balances were disconnected from actual earnings).',
                            'risk' => 'caution',
                        ],
                        [
                            'label' => 'Close out any already-abandoned shifts',
                            'command' => 'php artisan rider-shifts:auto-close',
                            'note' => 'The scheduler handles this going forward once cron is configured (see below) — this one-time run clears any pre-existing backlog of shifts left open past their cutoff.',
                            'risk' => 'caution',
                        ],
                        [
                            'label' => 'Rebuild frontend assets',
                            'command' => 'npm run build',
                            'note' => 'Needed for any of the UI changes to actually appear.',
                            'risk' => 'safe',
                        ],
                    ],
                ],
                [
                    'title' => 'Storage Engine Conversion (optional, whole database)',
                    'description' => 'Independent of the rider-shift rework above. This database\'s tables were found to be MyISAM (no transactions, no row locking, silently drops FOREIGN KEY constraints) despite the server defaulting to InnoDB — likely from how the database was originally created/imported. Only 4 rider-shift tables were converted as part of the payroll rework; this finishes the rest. Optional, but recommended for data integrity — run once per server.',
                    'steps' => [
                        [
                            'label' => 'Preview which tables would convert',
                            'command' => 'php artisan db:convert-to-innodb --dry-run',
                            'note' => 'Lists every non-InnoDB table with its approximate row count. No changes made.',
                            'risk' => 'safe',
                        ],
                        [
                            'label' => 'Convert them',
                            'command' => 'php artisan db:convert-to-innodb',
                            'note' => 'Rebuilds each table in place (data is preserved, only the storage engine changes). Prompts for confirmation first. Larger tables take longer and briefly lock during their own conversion — run during low traffic. Use --exclude=table_name to skip specific tables, --force to skip the prompt in a script.',
                            'risk' => 'caution',
                        ],
                    ],
                ],
            ],
            'scheduledCommands' => [
                [
                    'command' => 'rider-shifts:auto-close',
                    'schedule' => 'Daily at RIDER_LATEST_CHECK_IN_HOUR (default 6:00 PM, Africa/Nairobi)',
                    'purpose' => 'Closes any shift still started/paused/resumed past that day\'s cutoff, calculating pay as of the cutoff moment.',
                ],
                [
                    'command' => 'campaigns:complete-expired',
                    'schedule' => 'Daily (midnight)',
                    'purpose' => 'Marks active campaigns whose end date has passed as completed.',
                ],
            ],
            'cronEntry' => '* * * * * cd /path/to/app && php artisan schedule:run >> /dev/null 2>&1',
            'commandsReference' => [
                [
                    'command' => 'rider-shifts:auto-close',
                    'description' => 'Close out any rider shift left started/paused/resumed past its day\'s closure time, calculating pay as of that cutoff.',
                    'flags' => [],
                ],
                [
                    'command' => 'rider-shifts:purge-seeded-data',
                    'description' => 'Permanently delete rider check-ins, pause events, routes, and GPS points dated before a cutoff (seeded/demo data). REQUIRED: --before — there is no default, by design. Verify the real seed/real-data boundary for this specific server before choosing a date.',
                    'flags' => ['--before=YYYY-MM-DD (required, no default)', '--dry-run (preview only, no changes)', '--force (skip the confirmation prompt — scripted use only)'],
                ],
                [
                    'command' => 'rider-shifts:reconcile-wallets',
                    'description' => "Set each rider's wallet_balance to exactly match the sum of their real unsettled earnings.",
                    'flags' => ['--dry-run (preview only, no changes)'],
                ],
                [
                    'command' => 'db:convert-to-innodb',
                    'description' => 'Convert every non-InnoDB table in the database to InnoDB. Not rider-specific — a general data-integrity fix.',
                    'flags' => ['--dry-run (preview only, no changes)', '--exclude=table_name (repeatable, skip specific tables)', '--force (skip the confirmation prompt — scripted use only)'],
                ],
            ],
        ]);
    }
}
