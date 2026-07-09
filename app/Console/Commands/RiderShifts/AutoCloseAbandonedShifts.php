<?php

namespace App\Console\Commands\RiderShifts;

use App\Services\CheckInService;
use Illuminate\Console\Command;

class AutoCloseAbandonedShifts extends Command
{
    protected $signature = 'rider-shifts:auto-close';

    protected $description = 'Close out any rider shift left started/paused/resumed past its day\'s closure time (RIDER_LATEST_CHECK_IN_HOUR), calculating pay as of that cutoff';

    public function handle(CheckInService $checkInService): int
    {
        $result = $checkInService->autoCloseAbandonedShifts();

        if ($result['closed_count'] === 0) {
            $this->info('No abandoned shifts to close.');
            return Command::SUCCESS;
        }

        $this->info(sprintf(
            'Auto-closed %d shift(s), KSh %.2f paid out.',
            $result['closed_count'],
            $result['total_paid']
        ));

        return Command::SUCCESS;
    }
}
