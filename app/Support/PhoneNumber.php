<?php

namespace App\Support;

class PhoneNumber
{
    /**
     * Normalize a Kenyan phone number to the canonical 254XXXXXXXXX form
     * (no leading 0 or +) so the same physical number always compares equal
     * regardless of how it was typed — e.g. 0712345678, +254712345678, and
     * 254712345678 must all collide against the same unique-phone check.
     */
    public static function normalizeKenyan(?string $value): ?string
    {
        if (!$value) {
            return $value;
        }

        $value = trim($value);

        if (str_starts_with($value, '+254')) {
            return substr($value, 1);
        }

        if (str_starts_with($value, '0')) {
            return '254' . substr($value, 1);
        }

        return $value;
    }
}
