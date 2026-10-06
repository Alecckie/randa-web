<?php

namespace App\Console\Commands;

use App\Models\CampaignAssignment;
use App\Models\Rider;
use App\Models\RiderCheckIn;
use App\Models\RiderLocation;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Finds duplicate users.phone / riders.mpesa_number values so the DB-level
 * unique constraints (added in the
 * 2026_07_23_054040_add_unique_constraint_to_users_phone_and_riders_mpesa_number
 * migration) can actually be applied. Only auto-resolves the unambiguous
 * case — exactly one account/rider in the group has real activity and the
 * rest have none — since anything else requires a human call on real
 * production data, not a guess.
 */
class FixDuplicateRiderContacts extends Command
{
    protected $signature = 'riders:fix-duplicate-contacts {--apply : Actually make changes. Without this flag, nothing is changed — dry run only.}';

    protected $description = 'Report (and optionally resolve) duplicate users.phone / riders.mpesa_number values ahead of adding unique DB constraints';

    public function handle(): int
    {
        $apply = (bool) $this->option('apply');

        $this->line($apply ? '*** APPLY MODE — changes WILL be made. ***' : 'DRY RUN — no changes will be made. Re-run with --apply to execute.');
        $this->newLine();

        $this->resolvePhoneDuplicates($apply);
        $this->newLine();
        $this->resolveMpesaDuplicates($apply);

        return self::SUCCESS;
    }

    private function activityFor(?int $riderId): array
    {
        if (!$riderId) {
            return ['check_ins' => 0, 'assignments' => 0, 'wallet' => 0.0];
        }

        return [
            'check_ins' => RiderCheckIn::where('rider_id', $riderId)->count(),
            'assignments' => CampaignAssignment::where('rider_id', $riderId)->count(),
            'wallet' => (float) (Rider::find($riderId)->wallet_balance ?? 0),
        ];
    }

    private function hasActivity(array $a): bool
    {
        return $a['check_ins'] > 0 || $a['assignments'] > 0 || $a['wallet'] > 0;
    }

    private function resolvePhoneDuplicates(bool $apply): void
    {
        $this->line('== Duplicate users.phone ==');

        $duplicatePhones = DB::table('users')
            ->select('phone')
            ->whereNotNull('phone')
            ->groupBy('phone')
            ->havingRaw('COUNT(*) > 1')
            ->pluck('phone');

        if ($duplicatePhones->isEmpty()) {
            $this->info('None found.');
            return;
        }

        foreach ($duplicatePhones as $phone) {
            $users = User::where('phone', $phone)->orderBy('created_at')->get();
            $this->warn("Phone {$phone} — {$users->count()} accounts:");

            $rows = $users->map(function (User $u) {
                $rider = Rider::where('user_id', $u->id)->first();
                $activity = $this->activityFor($rider?->id);

                return ['user' => $u, 'rider' => $rider, 'activity' => $activity, 'has_activity' => $this->hasActivity($activity)];
            });

            foreach ($rows as $row) {
                $u = $row['user'];
                $r = $row['rider'];
                $this->line(sprintf(
                    '  user #%d %s <%s> role=%s rider_status=%s check_ins=%d assignments=%d wallet=%.2f created=%s',
                    $u->id, $u->name, $u->email, $u->role,
                    $r->status ?? 'n/a', $row['activity']['check_ins'], $row['activity']['assignments'], $row['activity']['wallet'],
                    $u->created_at
                ));
            }

            $this->decideAndActOnPhoneGroup($rows, $apply);
            $this->newLine();
        }
    }

    private function decideAndActOnPhoneGroup(Collection $rows, bool $apply): void
    {
        $withActivity = $rows->filter(fn ($r) => $r['has_activity']);
        $withoutActivity = $rows->reject(fn ($r) => $r['has_activity']);
        $allIncomplete = $rows->every(fn ($r) => !$r['rider'] || $r['rider']->status === 'incomplete');

        if ($withActivity->count() === 1 && $withoutActivity->count() === $rows->count() - 1) {
            foreach ($withoutActivity as $row) {
                $this->deleteUser($row['user'], $row['rider'], $apply);
            }
            return;
        }

        if ($withActivity->isEmpty() && $allIncomplete && $rows->count() > 1) {
            // All zero-activity, all still mid-onboarding — keep the most
            // recent attempt, remove the earlier abandoned one(s).
            foreach ($rows->slice(0, -1) as $row) {
                $this->deleteUser($row['user'], $row['rider'], $apply);
            }
            return;
        }

        $this->error('  -> AMBIGUOUS (multiple accounts have real activity, or statuses vary) — SKIPPED. Resolve manually.');
    }

    private function deleteUser(User $user, ?Rider $rider, bool $apply): void
    {
        $this->line("  -> Would delete user #{$user->id} ({$user->email}) and rider #" . ($rider?->id ?? 'n/a') . ' (zero activity)');

        if (!$apply) {
            return;
        }

        DB::transaction(function () use ($user, $rider) {
            // forceDelete — User/Rider now soft-delete by default, but this
            // command exists specifically to free up a duplicate phone/email
            // for reuse by the legitimate account, which a soft delete
            // wouldn't do (the unique index still blocks soft-deleted rows).
            if ($rider) {
                RiderLocation::where('rider_id', $rider->id)->delete();
                $rider->forceDelete();
            }
            $user->forceDelete();
        });

        $this->info("  -> Deleted user #{$user->id}.");
    }

    private function resolveMpesaDuplicates(bool $apply): void
    {
        $this->line('== Duplicate riders.mpesa_number ==');

        $duplicateNumbers = DB::table('riders')
            ->select('mpesa_number')
            ->whereNotNull('mpesa_number')
            ->groupBy('mpesa_number')
            ->havingRaw('COUNT(*) > 1')
            ->pluck('mpesa_number');

        if ($duplicateNumbers->isEmpty()) {
            $this->info('None found.');
            return;
        }

        foreach ($duplicateNumbers as $number) {
            $riders = Rider::where('mpesa_number', $number)->orderBy('created_at')->get();
            $this->warn("M-Pesa {$number} — {$riders->count()} riders:");

            $rows = $riders->map(function (Rider $r) {
                $activity = $this->activityFor($r->id);
                return ['rider' => $r, 'activity' => $activity, 'has_activity' => $this->hasActivity($activity)];
            });

            foreach ($rows as $row) {
                $r = $row['rider'];
                $u = $r->user;
                $this->line(sprintf(
                    '  rider #%d user=%s <%s> status=%s check_ins=%d assignments=%d wallet=%.2f created=%s',
                    $r->id, $u?->name, $u?->email, $r->status,
                    $row['activity']['check_ins'], $row['activity']['assignments'], $row['activity']['wallet'],
                    $r->created_at
                ));
            }

            $withActivity = $rows->filter(fn ($r) => $r['has_activity']);
            $withoutActivity = $rows->reject(fn ($r) => $r['has_activity']);

            if ($withActivity->count() === 1 && $withoutActivity->count() === $rows->count() - 1) {
                foreach ($withoutActivity as $row) {
                    $this->line("  -> Would clear mpesa_number on rider #{$row['rider']->id} (zero activity)");
                    if ($apply) {
                        $row['rider']->update(['mpesa_number' => null]);
                        $this->info("  -> Cleared rider #{$row['rider']->id}.");
                    }
                }
            } else {
                $this->error('  -> AMBIGUOUS (zero or multiple riders have real activity) — SKIPPED. Resolve manually.');
            }

            $this->newLine();
        }
    }
}
