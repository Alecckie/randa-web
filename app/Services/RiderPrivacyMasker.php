<?php

namespace App\Services;

/**
 * Advertisers see individual riders as initials + performance stats, never
 * full name/email/earnings — used everywhere a campaign's rider roster is
 * exposed to a non-admin requester (Campaigns/Show, campaign analytics).
 */
class RiderPrivacyMasker
{
    public static function initials(?string $name): string
    {
        $parts = array_filter(preg_split('/\s+/', trim((string) $name)));

        if (empty($parts)) {
            return '?';
        }

        if (count($parts) === 1) {
            return mb_strtoupper(mb_substr(reset($parts), 0, 2));
        }

        return mb_strtoupper(mb_substr(reset($parts), 0, 1) . mb_substr(end($parts), 0, 1));
    }
}
