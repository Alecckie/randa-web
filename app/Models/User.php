<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable,HasApiTokens;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'firstname',
        'lastname',
        'name',
        'email',
        'phone',
        'password',
        'role',
        'phone',
        'is_active'
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean'
        ];
    }

     public function rider()
    {
        return $this->hasOne(Rider::class);
    }

    public function advertiser()
    {
        return $this->hasOne(Advertiser::class);
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
}
