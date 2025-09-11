<?php

namespace App\Services;

use App\Models\Rider;
use App\Models\RiderLocation;
use App\Models\RiderLocationChangeLog;
use App\Models\RejectionReason;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;
use Exception;

class RiderService
{
    /**
     * Get paginated riders with filters
     */
    public function getRidersPaginated(array $filters, int $perPage = 15): LengthAwarePaginator
    {
        $query = Rider::query()
            ->with(['user:id,first_name,last_name,name,email,phone', 'currentAssignment.campaign:id,name', 'currentLocation.county', 'currentLocation.subcounty', 'currentLocation.ward'])
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
     * Create a new rider with location data
     */
    public function createRider(array $data): Rider
    {
        return DB::transaction(function () use ($data) {
            // Create or get user
            $user = $this->createOrGetUser($data);
            
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
            
            // Create rider
            $rider = $this->createRiderRecord($user, $data);
            
            // Create rider location
            $location = $this->createRiderLocation($rider, $data['location']);
            
            // Log the initial location assignment
            $this->logLocationChange($rider, null, $location, 'initial');
            
            return $rider->load(['user', 'currentLocation.county', 'currentLocation.subcounty', 'currentLocation.ward']);
        });
    }

    /**
     * Create or get existing user
     */
    private function createOrGetUser(array $data): User
    {
        // If user_id is provided, get existing user
        if (!empty($data['user_id'])) {
            return User::findOrFail($data['user_id']);
        }

        // Create new user
        return User::create([
            'name' => trim($data['firstname'] . ' ' . $data['lastname']),
            'first_name' => $data['firstname'],
            'last_name' => $data['lastname'],
            'email' => $data['email'],
            'phone' => $data['phone'],
            'password' => Hash::make($data['phone']), // Use phone number as password
            'role' => 'rider',
            'is_active' => true,
        ]);
    }

    /**
     * Create rider record
     */
    private function createRiderRecord(User $user, array $data): Rider
    {
        // Prepare rider data (remove user fields and location data)
        $riderData = collect($data)->except([
            'firstname',
            'lastname', 
            'email',
            'phone',
            'location'
        ])->merge([
            'user_id' => $user->id,
            'status' => 'pending', // Default status
            'wallet_balance' => 0.00,
            'location_changes_count' => 0,
        ])->toArray();

        return Rider::create($riderData);
    }

    /**
     * Create rider location record
     */
    private function createRiderLocation(Rider $rider, array $locationData): RiderLocation
    {
        $location = RiderLocation::create([
            'rider_id' => $rider->id,
            'county_id' => $locationData['county_id'],
            'sub_county_id' => $locationData['sub_county_id'],
            'ward_id' => $locationData['ward_id'],
            'stage_name' => $locationData['stage_name'],
            'latitude' => $locationData['latitude'] ?: null,
            'longitude' => $locationData['longitude'] ?: null,
            'is_current' => true,
            'effective_from' => now()->toDateString(), 
            'effective_to' => null,
            'status' => 'active',
            'notes' => $locationData['notes'] ?? null,
        ]);

        // Update rider's location tracking
        $rider->update([
            'location_last_updated' => now(),
            'location_changes_count' => 1,
        ]);

        return $location;
    }

    /**
     * Log location change
     */
    private function logLocationChange(Rider $rider, ?RiderLocation $oldLocation, RiderLocation $newLocation, string $changeType, ?string $reason = null): RiderLocationChangeLog
    {
        return RiderLocationChangeLog::create([
            'rider_id' => $rider->id,
            'old_location_id' => $oldLocation?->id,
            'new_location_id' => $newLocation->id,
            'change_type' => $changeType,
            'reason' => $reason,
            'metadata' => [
                'changed_by_type' => 'system',
                'changed_by_id' => null,
                'rider_name' => $rider->user->name,
                'old_location_display' => $oldLocation?->full_address,
                'new_location_display' => $newLocation->full_address,
            ],
            'changed_at' => now(),
        ]);
    }

    /**
     * Approve rider application
     */
    public function approveRider(Rider $rider): Rider
    {
        return DB::transaction(function () use ($rider) {
            // Update rider status
            $rider->update(['status' => 'approved']);

            // Activate the user account
            $rider->user()->update(['is_active' => true]);

            $rider->refresh();

            return $rider->load(['user', 'currentLocation.county', 'currentLocation.subcounty', 'currentLocation.ward']);
        });
    }

    /**
     * Reject rider application with reason
     */
    public function rejectRider(Rider $rider, string $reason, ?int $rejectedBy = null): Rider
    {
        return DB::transaction(function () use ($rider, $reason, $rejectedBy) {
            // Update rider status
            $rider->update(['status' => 'rejected']);

            // Create rejection reason record
            $rejectionReason = new RejectionReason([
                'rejected_by' => $rejectedBy ?? Auth::id(),
                'reason' => $reason,
            ]);

            $rider->rejectionReasons()->save($rejectionReason);

            // Optionally deactivate the user account for rejected applications
            $rider->user()->update(['is_active' => false]);

            $rider->refresh();

            return $rider->load([
                'user', 
                'currentLocation.county', 
                'currentLocation.subcounty', 
                'currentLocation.ward',
                'rejectionReasons.rejectedBy'
            ]);
        });
    }

    /**
     * Update rider status (legacy method - kept for backward compatibility)
     */
    public function updateRiderStatus(Rider $rider, string $status, ?string $rejectionReason = null): Rider
    {
        DB::beginTransaction();

        try {
            if ($status === 'approved') {
                return $this->approveRider($rider);
            } elseif ($status === 'rejected' && $rejectionReason) {
                return $this->rejectRider($rider, $rejectionReason);
            } else {
                $rider->update(['status' => $status]);
                
                if ($status === 'approved') {
                    $rider->user()->update(['is_active' => true]);
                } elseif ($status === 'rejected') {
                    $rider->user()->update(['is_active' => false]);
                }
            }

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
     * Change rider location
     */
    public function changeRiderLocation(Rider $rider, array $locationData, string $reason = null): RiderLocation
    {
        return DB::transaction(function () use ($rider, $locationData, $reason) {
            // Get current location
            $oldLocation = $rider->currentLocation;
            
            // Deactivate current location
            if ($oldLocation) {
                $oldLocation->update([
                    'is_current' => false,
                    'effective_to' => now()->toDateString(),
                    'status' => 'inactive',
                ]);
            }
            
            // Create new location
            $newLocation = RiderLocation::create([
                'rider_id' => $rider->id,
                'county_id' => $locationData['county_id'],
                'sub_county_id' => $locationData['sub_county_id'],
                'ward_id' => $locationData['ward_id'],
                'stage_name' => $locationData['stage_name'],
                'latitude' => $locationData['latitude'] ?: null,
                'longitude' => $locationData['longitude'] ?: null,
                'is_current' => true,
                'effective_from' => now()->toDateString(),
                'effective_to' => null,
                'status' => 'active',
                'notes' => $locationData['notes'] ?? null,
            ]);
            
            // Update rider's location tracking
            $rider->increment('location_changes_count');
            $rider->update(['location_last_updated' => now()]);
            
            // Log the location change
            $this->logLocationChange($rider, $oldLocation, $newLocation, 'transfer', $reason);
            
            return $newLocation->load(['county', 'subcounty', 'ward']);
        });
    }

    /**
     * Get rider location history
     */
    public function getRiderLocationHistory(Rider $rider): \Illuminate\Database\Eloquent\Collection
    {
        return $rider->locationHistory()
            ->with(['county', 'subcounty', 'ward'])
            ->get();
    }

    /**
     * Get riders by location
     */
    public function getRidersByLocation(int $wardId = null, int $subcountyId = null, int $countyId = null): \Illuminate\Database\Eloquent\Collection
    {
        $query = Rider::approved()->withCurrentLocation();
        
        if ($wardId) {
            $query->byLocation($wardId);
        } elseif ($subcountyId) {
            $query->bySubCounty($subcountyId);
        } elseif ($countyId) {
            $query->byCounty($countyId);
        }
        
        return $query->get();
    }

    /**
     * Get rider by user ID
     */
    public function getRiderByUserId(int $userId): ?Rider
    {
        return Rider::where('user_id', $userId)
            ->with(['user', 'currentAssignment.campaign', 'currentLocation.county', 'currentLocation.subcounty', 'currentLocation.ward'])
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
            ->with(['user:id,first_name,last_name,name,email,phone', 'currentLocation.county', 'currentLocation.subcounty', 'currentLocation.ward'])
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
            },
            'currentLocation.county',
            'currentLocation.subcounty', 
            'currentLocation.ward',
            'rejectionReasons.rejectedBy'
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
            },
            'currentLocation.county',
            'currentLocation.subcounty', 
            'currentLocation.ward',
            'rejectionReasons.rejectedBy'
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