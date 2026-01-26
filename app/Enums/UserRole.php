<?php

namespace App\Enums;

enum UserRole: string
{
    case ADMIN = 'admin';
    case RIDER = 'rider';
    case ADVERTISER = 'advertiser';

    /**
     * Get all role values as array
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    /**
     * Get all role names as array
     */
    public static function names(): array
    {
        return array_column(self::cases(), 'name');
    }

    /**
     * Get role label for display
     */
    public function label(): string
    {
        return match($this) {
            self::ADMIN => 'Administrator',
            self::RIDER => 'Rider',
            self::ADVERTISER => 'Advertiser',
        };
    }

    /**
     * Get role description
     */
    public function description(): string
    {
        return match($this) {
            self::ADMIN => 'System administrator with full access',
            self::RIDER => 'Delivery rider',
            self::ADVERTISER => 'Business advertiser',
        };
    }

    /**
     * Check if role can access admin panel
     */
    public function canAccessAdmin(): bool
    {
        return $this === self::ADMIN;
    }

    /**
     * Get dashboard route for role
     */
    public function dashboardRoute(): string
    {
        return match($this) {
            self::ADMIN => 'dashboard',
            self::ADVERTISER => 'advert-dash.index',
            self::RIDER => 'rider.rider-dash.index',
        };
    }

    /**
     * Try to create enum from string value
     */
    public static function tryFromString(?string $value): ?self
    {
        if ($value === null) {
            return null;
        }

        return self::tryFrom(strtolower($value));
    }

    /**
     * Check if a value is valid role
     */
    public static function isValid(string $value): bool
    {
        return self::tryFrom($value) !== null;
    }
}