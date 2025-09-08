<?php

namespace App\Services;

use App\Models\Advertiser;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AdvertiserService
{
    public function getAdvertisers(array $filters = []): \Illuminate\Contracts\Pagination\LengthAwarePaginator
    {
        $query = Advertiser::with(['user' => function ($q) {
            $q->select('id', 'name', 'email', 'phone');
        }]);

        // Apply search filter
        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function (Builder $q) use ($search) {
                $q->where('company_name', 'like', "%{$search}%")
                    ->orWhere('business_registration', 'like', "%{$search}%")
                    ->orWhereHas('user', function (Builder $subQ) use ($search) {
                        $subQ->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
            });
        }

        // Apply status filter
        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        // Apply user filter
        if (!empty($filters['user_id'])) {
            $query->where('user_id', $filters['user_id']);
        }

        return $query->latest()
            ->paginate(15)
            ->withQueryString();
    }

    public function getStats(): array
    {
        $totalAdvertisers = Advertiser::count();
        $pendingApplications = Advertiser::where('status', 'pending')->count();
        $approvedAdvertisers = Advertiser::where('status', 'approved')->count();
        $rejectedApplications = Advertiser::where('status', 'rejected')->count();

        return [
            'total_advertisers' => $totalAdvertisers,
            'pending_applications' => $pendingApplications,
            'approved_advertisers' => $approvedAdvertisers,
            'rejected_applications' => $rejectedApplications,
        ];
    }

    public function createAdvertiser(array $data): Advertiser
    {
        return DB::transaction(function () use ($data) {
            if (empty($data['user_id'])) {
                $fullName = trim($data['first_name'] . ' ' . $data['last_name']);

                $password = Hash::make($data['phone']);

                $user = User::create([
                    'first_name' => $data['first_name'],
                    'last_name' => $data['last_name'],
                    'name' => $fullName,
                    'email' => $data['email'],
                    'phone' => $data['phone'],
                    'password' => $password,
                    'role' => 'advertiser',
                    'is_active' => false, 
                ]);
                $data['user_id'] = $user->id;
            } else {
                $user = User::find($data['user_id']);
                if ($user && $user->role !== 'advertiser') {
                    $user->update(['role' => 'advertiser']);
                }
            }

            // Remove fields that aren't part of the advertiser model
            $advertiserData = array_intersect_key($data, array_flip([
                'user_id',
                'company_name',
                'business_registration',
                'address',
               ,
                'status'
            ]));

            return Advertiser::create($advertiserData);
        });
    }

    public function updateStatus(Advertiser $advertiser, string $status, ?string $rejectionReason = null): void
    {
        DB::transaction(function () use ($advertiser, $status, $rejectionReason) {
            $advertiser->update(['status' => $status]);

            // Update user status based on advertiser status
            if ($status === 'approved') {
                $advertiser->user->update(['is_active' => true]);
            } elseif ($status === 'rejected') {
                $advertiser->user->update(['is_active' => false]);

                // You could store rejection reason in a separate notifications/logs table
                // or add a rejection_reason field to the advertisers table
            }
        });
    }

    public function updateAdvertiser(Advertiser $advertiser, array $data): Advertiser
    {
        return DB::transaction(function () use ($advertiser, $data) {
            // Update user information if provided
            if (isset($data['email']) || isset($data['phone'])) {
                $userUpdates = [];
                if (isset($data['email'])) {
                    $userUpdates['email'] = $data['email'];
                }
                if (isset($data['phone'])) {
                    $userUpdates['phone'] = $data['phone'];
                }
               

                $advertiser->user->update($userUpdates);
            }

            // Remove user-related fields before updating advertiser
            unset($data['email'], $data['phone']);

            $advertiser->update($data);
            return $advertiser->fresh();
        });
    }

    /**
     * Get advertiser profile by user ID
     */
    public function getAdvertiserByUserId(int $userId): ?Advertiser
    {
        return Advertiser::where('user_id', $userId)
            ->with(['user:id,first_name,last_name,name,email,phone'])
            ->first();
    }

    /**
     * Create advertiser profile for existing user
     */
    public function createAdvertiserProfile(array $data): Advertiser
    {
        return DB::transaction(function () use ($data) {
            return Advertiser::create([
                'user_id' => $data['user_id'],
                'company_name' => $data['company_name'],
                'business_registration' => $data['business_registration'] ?? null,
                'address' => $data['address'],
                'status' => $data['status'] ?? 'pending'
            ]);
        });
    }

    /**
     * Update advertiser profile
     */
    public function updateAdvertiserProfile(Advertiser $advertiser, array $data): Advertiser
    {
        return DB::transaction(function () use ($advertiser, $data) {
            $advertiser->update([
                'company_name' => $data['company_name'],
                'business_registration' => $data['business_registration'] ?? null,
                'address' => $data['address'],
                'status' => $data['status'] ?? $advertiser->status
            ]);

            return $advertiser->fresh();
        });
    }

    /**
     * Delete advertiser profile
     */
    public function deleteAdvertiserProfile(Advertiser $advertiser): bool
    {
        return DB::transaction(function () use ($advertiser) {
            return $advertiser->delete();
        });
    }
}
