<?php

namespace App\Services;

use App\Models\Rider;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

class RiderService
{
    /**
     * Get paginated riders with filters
     */
    public function getRidersPaginated(array $filters, int $perPage = 15): LengthAwarePaginator
    {
        $query = Rider::query()
            ->with(['user:id,first_name,last_name,name,email,phone', 'currentAssignment.campaign:id,name'])
            ->latest();

        // Apply filters
        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->whereHas('user', function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            })->orWhere('national_id', 'like', "%{$search}%")
                ->orWhere('mpesa_number', 'like', "%{$search}%");
        }

        if (!empty($filters['user_id'])) {
            $query->where('user_id', $filters['user_id']);
        }

        if (!empty($filters['date_from'])) {
            $query->whereDate('created_at', '>=', $filters['date_from']);
        }

        if (!empty($filters['date_to'])) {
            $query->whereDate('created_at', '<=', $filters['date_to']);
        }

        if (!empty($filters['daily_rate_min'])) {
            $query->where('daily_rate', '>=', $filters['daily_rate_min']);
        }

        if (!empty($filters['daily_rate_max'])) {
            $query->where('daily_rate', '<=', $filters['daily_rate_max']);
        }

        return $query->paginate($perPage);
    }

    /**
     * Get rider statistics
     */
    public function getRiderStats(): array
    {
        return [
            'total_riders' => Rider::count(),
            'pending_applications' => Rider::where('status', 'pending')->count(),
            'approved_riders' => Rider::where('status', 'approved')->count(),
            'rejected_applications' => Rider::where('status', 'rejected')->count(),
            'active_riders' => Rider::whereHas('currentAssignment')->count(),
            'total_earnings_paid' => Rider::sum('wallet_balance'),
            'average_daily_rate' => Rider::avg('daily_rate') ?? 0,
        ];
    }

    /**
     * Create a new rider with user account
     */
    public function createRider(array $data): Rider
    {
        DB::beginTransaction();

        try {
            // First, create the user account
            $user = $this->createUserForRider($data);

            // Handle file uploads
            $fileFields = [
                'national_id_front_photo',
                'national_id_back_photo',
                'passport_photo',
                'good_conduct_certificate',
                'motorbike_license',
                'motorbike_registration'
            ];

            foreach ($fileFields as $field) {
                if (isset($data[$field]) && $data[$field] instanceof UploadedFile) {
                    $data[$field] = $this->uploadFile($data[$field], "riders/{$field}");
                }
            }

            // Prepare rider data (remove user fields and add user_id)
            $riderData = collect($data)->except([
                'firstname',
                'lastname',
                'email',
                'phone'
            ])->merge([
                'user_id' => $user->id
            ])->toArray();

            // Create the rider
            $rider = Rider::create($riderData);

            // Load the user relationship
            $rider->load('user');

            DB::commit();

            // Send notifications (you can implement this)
            // $this->sendRiderApplicationNotification($rider);

            return $rider;
        } catch (\Exception $e) {
            DB::rollBack();

            // Clean up uploaded files if transaction fails
            foreach ($fileFields as $field) {
                if (isset($data[$field]) && is_string($data[$field])) {
                    Storage::delete($data[$field]);
                }
            }

            throw $e;
        }
    }

    /**
     * Create user account for rider
     */
    private function createUserForRider(array $data): User
    {
        $fullName = trim($data['firstname'] . ' ' . $data['lastname']);

        return User::create([
            'first_name' => $data['firstname'],
            'last_name' => $data['lastname'],
            'name' => $fullName,
            'email' => $data['email'],
            'phone' => $data['phone'],
            'password' => Hash::make($data['phone']), // Use phone number as password
            'role' => 'rider',
            'is_active' => true,
        ]);
    }

    /**
     * Update rider status
     */
    public function updateRiderStatus(Rider $rider, string $status, ?string $rejectionReason = null): Rider
    {
        DB::beginTransaction();

        try {
            $rider->update(['status' => $status]);

            // If approved, activate the user account
            if ($status === 'approved') {
                $rider->user()->update(['is_active' => true]);
            } elseif ($status === 'rejected') {
                // Optionally deactivate the user account for rejected applications
                $rider->user()->update(['is_active' => false]);
            }

           
            // $this->logStatusChange($rider, $status, $rejectionReason);

           
            // $this->sendStatusUpdateNotification($rider, $status, $rejectionReason);

            DB::commit();

            return $rider;
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Upload file to storage
     */
    private function uploadFile(UploadedFile $file, string $path): string
    {
        return $file->store($path, 'public');
    }

    /**
     * Get rider by user ID
     */
    public function getRiderByUserId(int $userId): ?Rider
    {
        return Rider::where('user_id', $userId)
            ->with(['user', 'currentAssignment.campaign'])
            ->first();
    }

    /**
     * Update rider wallet balance
     */
    public function updateWalletBalance(Rider $rider, float $amount, string $type = 'add'): Rider
    {
        DB::beginTransaction();

        try {
            if ($type === 'add') {
                $rider->increment('wallet_balance', $amount);
            } else {
                $rider->decrement('wallet_balance', $amount);
            }

            $rider->refresh();

            DB::commit();

            return $rider;
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Get riders available for assignment
     */
    public function getAvailableRiders(): \Illuminate\Database\Eloquent\Collection
    {
        return Rider::approved()
            ->whereDoesntHave('currentAssignment')
            ->with(['user:id,first_name,last_name,name,email,phone'])
            ->get();
    }

    /**
     * Update rider profile information
     */
    public function updateRiderProfile(Rider $rider, array $data): Rider
    {
        DB::beginTransaction();

        try {
            
            $userFields = ['firstname', 'lastname', 'email', 'phone'];
            $userData = [];

            foreach ($userFields as $field) {
                if (isset($data[$field])) {
                    switch ($field) {
                        case 'firstname':
                            $userData['first_name'] = $data[$field];
                            break;
                        case 'lastname':
                            $userData['last_name'] = $data[$field];
                            break;
                        default:
                            $userData[$field] = $data[$field];
                            break;
                    }
                }
            }

            // Update full name if first or last name changed
            if (isset($userData['first_name']) || isset($userData['last_name'])) {
                $firstName = $userData['first_name'] ?? $rider->user->first_name;
                $lastName = $userData['last_name'] ?? $rider->user->last_name;
                $userData['name'] = trim($firstName . ' ' . $lastName);
            }

            if (!empty($userData)) {
                $rider->user()->update($userData);
            }

            // Update rider-specific information
            $riderData = collect($data)->except($userFields)->toArray();
            if (!empty($riderData)) {
                $rider->update($riderData);
            }

            $rider->refresh();
            $rider->load('user');

            DB::commit();

            return $rider;
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Get rider details with all relationships for show page
     */
    public function getRiderForShow(int $riderId): ?Rider
    {
        return Rider::with([
            'user:id,first_name,last_name,name,email,phone',
            'currentAssignment.campaign:id,name',
            'currentAssignment' => function ($query) {
                $query->select('id', 'rider_id', 'campaign_id', 'assigned_at', 'status');
            }
        ])->find($riderId);
    }

    /**
     * Alternative method using Rider model instance
     */
    public function loadRiderDetailsForShow(Rider $rider): Rider
    {
        return $rider->load([
            'user:id,first_name,last_name,name,email,phone',
            'currentAssignment.campaign:id,name',
            'currentAssignment' => function ($query) {
                $query->select('id', 'rider_id', 'campaign_id', 'assigned_at', 'status');
            }
        ]);
    }



    /**
     * Check if email is already taken (excluding current rider if updating)
     */
    public function isEmailTaken(string $email, ?int $excludeUserId = null): bool
    {
        $query = User::where('email', $email);

        if ($excludeUserId) {
            $query->where('id', '!=', $excludeUserId);
        }

        return $query->exists();
    }

    /**
     * Check if phone is already taken (excluding current rider if updating)
     */
    public function isPhoneTaken(string $phone, ?int $excludeUserId = null): bool
    {
        $query = User::where('phone', $phone);

        if ($excludeUserId) {
            $query->where('id', '!=', $excludeUserId);
        }

        return $query->exists();
    }
}
