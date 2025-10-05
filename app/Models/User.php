<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasFactory, Notifiable, HasApiTokens;

    protected $fillable = [
        'first_name',
        'last_name',
        'name',
        'email',
        'password',
        'role',
        'phone',
        'is_active'
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean'
        ];
    }

    // Relationships
    public function rider()
    {
        return $this->hasOne(Rider::class);
    }

    public function advertiser()
    {
        return $this->hasOne(Advertiser::class);
    }

    public function rejections()
    {
        return $this->morphMany(RejectionReason::class, 'rejectable');
    }

    // Scopes
    public function scopeRiders($query)
    {
        return $query->where('role', 'rider');
    }

    public function scopeAdvertisers($query)
    {
        return $query->where('role', 'advertiser');
    }

    public function scopeAdmins($query)
    {
        return $query->where('role', 'admin');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    // Helper Methods
    public function getDashboardRoute(): string
    {
        return match ($this->role) {
            'admin' => 'dashboard',
            'advertiser' => 'advert-dash.index',
            'rider' => 'rider-dash.index',
            default => 'dashboard',
        };
    }

    public function getFullNameAttribute(): string
    {
        return trim("{$this->first_name} {$this->last_name}") ?: $this->name;
    }

    // Role checking methods
    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isAdvertiser(): bool
    {
        return $this->role === 'advertiser';
    }

    public function isRider(): bool
    {
        return $this->role === 'rider';
    }

    public function hasRole(string $role): bool
    {
        return $this->role === $role;
    }

    public function hasAnyRole(array $roles): bool
    {
        return in_array($this->role, $roles);
    }
}