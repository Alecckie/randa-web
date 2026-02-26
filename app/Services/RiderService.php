<?php

namespace App\Services;

use App\Models\Campaign;
use App\Models\CampaignAssignment;
use App\Models\Helmet;
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
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;
use Exception;

class RiderService
{
    public function __construct(
        private RiderDocumentService $documentService
    ) {}

    /**
     * Get paginated riders with filters - includes users with rider role
     */
    public function getRidersPaginated(array $filters, int $perPage = 15): LengthAwarePaginator
    {
        // Get users with rider role and left join with riders table
        $query = User::query()
            ->where('role', 'rider')
            ->leftJoin('riders', 'users.id', '=', 'riders.user_id')
            ->with([
                'rider.currentAssignment.campaign:id,name',
                'rider.currentLocation.county',
                'rider.currentLocation.subcounty',
                'rider.currentLocation.ward'
            ])
            ->select(
                'users.*',
                'riders.id as rider_id',
                'riders.status as rider_status',
                'riders.national_id',
                'riders.mpesa_number',
                'riders.daily_rate',
                'riders.wallet_balance',
                'riders.created_at as rider_created_at'
            )
            ->latest('users.created_at');

        // Apply filters
        if (!empty($filters['status'])) {
            if ($filters['status'] === 'incomplete') {
                $query->whereNull('riders.id'); // Users without rider profiles
            } else {
                $query->where('riders.status', $filters['status']);
            }
        }

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('users.first_name', 'like', "%{$search}%")
                    ->orWhere('users.last_name', 'like', "%{$search}%")
                    ->orWhere('users.name', 'like', "%{$search}%")
                    ->orWhere('users.email', 'like', "%{$search}%")
                    ->orWhere('users.phone', 'like', "%{$search}%")
                    ->orWhere('riders.national_id', 'like', "%{$search}%")
                    ->orWhere('riders.mpesa_number', 'like', "%{$search}%");
            });
        }

        if (!empty($filters['date_from'])) {
            $query->whereDate('users.created_at', '>=', $filters['date_from']);
        }

        if (!empty($filters['date_to'])) {
            $query->whereDate('users.created_at', '<=', $filters['date_to']);
        }

        return $query->paginate($perPage);
    }

    /**
     * Get rider statistics - includes all users with rider role
     */
    public function getRiderStats(): array
    {
        $totalRiderUsers = User::where('role', 'rider')->count();
        $incompleteProfiles = User::where('role', 'rider')->whereDoesntHave('rider')->count();

        return [
            'total_riders' => $totalRiderUsers,
            'incomplete_profiles' => $incompleteProfiles,
            'pending_applications' => Rider::where('status', 'pending')->count(),
            'approved_riders' => Rider::where('status', 'approved')->count(),
            'rejected_applications' => Rider::where('status', 'rejected')->count(),
            'active_riders' => Rider::whereHas('currentAssignment')->count(),
            'total_earnings_paid' => Rider::sum('wallet_balance'),
            'average_daily_rate' => Rider::avg('daily_rate') ?? 0,
        ];
    }

    /**
     * Create initial rider record with location (Step 1)
     */
    public function createRiderWithLocation(int $userId, array $locationData): Rider
    {
        return DB::transaction(function () use ($userId, $locationData) {
            // Create rider record with minimal data
            $rider = Rider::create([
                'user_id' => $userId,
                'status' => 'incomplete', // New status for incomplete profiles
                'wallet_balance' => 0.00,
                'location_changes_count' => 0,
                'daily_rate' => 70.00, // Default daily rate
            ]);

            // Create rider location
            $location = $this->createRiderLocation($rider, $locationData);

            // Log the initial location assignment
            $this->logLocationChange($rider, null, $location, 'initial');

            return $rider->load(['user', 'currentLocation.county', 'currentLocation.subcounty', 'currentLocation.ward']);
        });
    }

    /**
     * Update rider documents (Step 2) - OPTIMIZED
     */
    public function updateRiderDocuments(Rider $rider, array $data): Rider
    {
        $updateData = [];

        // Update national ID first (non-file field)
        if (isset($data['national_id'])) {
            $rider->update(['national_id' => $data['national_id']]);
        }

        // Process file uploads ONE AT A TIME outside of transaction
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
                try {
                    // Validate file
                    $this->documentService->validateDocument($field, $data[$field]);

                    // Upload and get path
                    $path = $this->documentService->uploadDocument(
                        $rider,
                        $field,
                        $data[$field]
                    );

                    // Update database immediately (separate transaction per file)
                    DB::transaction(function () use ($rider, $field, $path) {
                        $rider->update([$field => $path]);
                    });

                    Log::info("Document uploaded successfully", [
                        'rider_id' => $rider->id,
                        'field' => $field,
                        'path' => $path
                    ]);
                } catch (\Exception $e) {
                    Log::error("Failed to upload document", [
                        'rider_id' => $rider->id,
                        'field' => $field,
                        'error' => $e->getMessage()
                    ]);

                    // Don't throw - allow partial uploads
                    // The validation will catch missing required documents
                }
            }
        }

        $rider->refresh();
        return $rider;
    }

    /**
     * Upload a single document
     */
    public function uploadSingleDocument(Rider $rider, string $fieldName, UploadedFile $file): array
    {
        try {
            // Validate file type based on field
            $allowedMimes = $this->documentService->getAllowedMimeTypes($fieldName);
            if (!in_array($file->getMimeType(), $allowedMimes)) {
                throw new \InvalidArgumentException('Invalid file type for this document');
            }

            // Validate and upload
            $this->documentService->validateDocument($fieldName, $file);
            $path = $this->documentService->uploadDocument($rider, $fieldName, $file);

            // Update database
            $rider->update([$fieldName => $path]);

            return [
                'success' => true,
                'field_name' => $fieldName,
                'path' => $path,
                'url' => Storage::url($path),
                'uploaded_documents' => $this->getUploadedDocumentsStatus($rider),
                'missing_documents' => $this->getMissingDocuments($rider),
                'has_all_documents' => $this->hasDocuments($rider),
            ];
        } catch (\Exception $e) {
            Log::error("Failed to upload single document", [
                'rider_id' => $rider->id,
                'field' => $fieldName,
                'error' => $e->getMessage()
            ]);

            throw $e;
        }
    }

    /**
     * Delete a specific document
     */
    public function deleteDocument(Rider $rider, string $fieldName): array
    {
        try {
            if ($rider->$fieldName) {
                $this->documentService->deleteDocument($rider->$fieldName);
                $rider->update([$fieldName => null]);
            }

            return [
                'success' => true,
                'field_name' => $fieldName,
                'uploaded_documents' => $this->getUploadedDocumentsStatus($rider),
                'missing_documents' => $this->getMissingDocuments($rider),
            ];
        } catch (\Exception $e) {
            Log::error("Failed to delete document", [
                'rider_id' => $rider->id,
                'field' => $fieldName,
                'error' => $e->getMessage()
            ]);

            throw $e;
        }
    }

    /**
     * Update rider contact and payment information (Step 3)
     */
    public function updateRiderContactInfo(Rider $rider, array $data): Rider
    {
        return DB::transaction(function () use ($rider, $data) {
            $rider->update([
                'mpesa_number' => $data['mpesa_number'],
                'next_of_kin_name' => $data['next_of_kin_name'],
                'next_of_kin_phone' => $data['next_of_kin_phone'],
            ]);

            $rider->refresh();

            return $rider;
        });
    }

    /**
     * Update rider agreement (Step 4)
     */
    public function updateRiderAgreement(Rider $rider, array $data): Rider
    {
        return DB::transaction(function () use ($rider, $data) {
            $rider->update([
                'signed_agreement' => $data['signed_agreement'],
            ]);

            // Check if profile is complete and update status to pending if complete
            if ($rider->isProfileComplete()) {
                $rider->update(['status' => 'pending']);
            }

            $rider->refresh();

            return $rider;
        });
    }

    /**
     * Create a new rider with all data at once (legacy method for admin use)
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
            'latitude' => $locationData['latitude'] ?? null,
            'longitude' => $locationData['longitude'] ?? null,
            'is_current' => true,
            'effective_from' => now()->toDateString(),
            'effective_to' => null,
            'status' => 'active',
            'notes' => $locationData['notes'] ?? null,
        ]);

        // Update rider's location tracking
        $rider->update([
            'location_last_updated' => now(),
            'location_changes_count' => ($rider->location_changes_count ?? 0) + 1,
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
     * Upload file to storage (legacy method)
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
                'latitude' => $locationData['latitude'] ?? null,
                'longitude' => $locationData['longitude'] ?? null,
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

    /**
     * Get campaigns assigned to a rider with minimal details
     * Riders should only see limited campaign information for privacy
     */
    public function getCampaignsForRider(Rider $rider, array $filters = []): LengthAwarePaginator
    {
        $query = Campaign::query()
            ->select([
                'campaigns.id',
                'campaigns.name',
                'campaigns.start_date',
                'campaigns.end_date',
                'campaigns.status',
                'campaign_assignments.assigned_at',
            ])
            ->join('campaign_assignments', 'campaigns.id', '=', 'campaign_assignments.campaign_id')
            ->where('campaign_assignments.rider_id', $rider->id)
            ->with([
                'assignments' => function ($query) use ($rider) {
                    $query->where('rider_id', $rider->id)
                        ->select('id', 'campaign_id', 'rider_id', 'helmet_id', 'assigned_at', 'completed_at', 'status')
                        ->with(['helmet:id,helmet_code,qr_code,status,current_branding']);
                },
                'coverageAreas:id,name,area_code,county_id,sub_county_id,ward_id',
                'coverageAreas.county:id,name',
                'coverageAreas.subcounty:id,name',
                'coverageAreas.ward:id,name',
            ])
            ->groupBy([
                'campaigns.id',
                'campaigns.name',
                'campaigns.start_date',
                'campaigns.end_date',
                'campaigns.status',
                'campaign_assignments.assigned_at',
            ]);

        // Apply filters
        if (!empty($filters['status'])) {
            $query->where('campaign_assignments.status', $filters['status']);
        }

        if (!empty($filters['campaign_status'])) {
            $query->where('campaigns.status', $filters['campaign_status']);
        }

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where('campaigns.name', 'like', "%{$search}%");
        }

        if (!empty($filters['date_from'])) {
            $query->whereDate('campaigns.start_date', '>=', $filters['date_from']);
        }

        if (!empty($filters['date_to'])) {
            $query->whereDate('campaigns.end_date', '<=', $filters['date_to']);
        }

        // Order by assignment date (most recent first)
        $query->orderBy('campaign_assignments.assigned_at', 'desc');

        return $query->paginate($filters['per_page'] ?? 15);
    }

    /**
     * Get campaign statistics for a specific rider
     */
    public function getRiderCampaignStats(Rider $rider): array
    {
        $assignments = CampaignAssignment::where('rider_id', $rider->id);

        return [
            'total_campaigns' => (clone $assignments)->distinct('campaign_id')->count('campaign_id'),
            'active_campaigns' => (clone $assignments)->where('status', 'active')->distinct('campaign_id')->count('campaign_id'),
            'completed_campaigns' => (clone $assignments)->where('status', 'completed')->distinct('campaign_id')->count('campaign_id'),
            'total_days_worked' => (clone $assignments)->where('status', 'completed')
                ->get()
                ->sum(function ($assignment) {
                    if ($assignment->assigned_at && $assignment->completed_at) {
                        return $assignment->assigned_at->diffInDays($assignment->completed_at) + 1;
                    }
                    return 0;
                }),
        ];
    }

    /**
     * Get single campaign details for rider (limited information)
     */
    public function getCampaignForRider(Rider $rider, int $campaignId): ?Campaign
    {
        return Campaign::select([
            'campaigns.id',
            'campaigns.name',
            'campaigns.description',
            'campaigns.start_date',
            'campaigns.end_date',
            'campaigns.status',
        ])
            ->whereHas('assignments', function ($query) use ($rider) {
                $query->where('rider_id', $rider->id);
            })
            ->with([
                'assignments' => function ($query) use ($rider) {
                    $query->where('rider_id', $rider->id)
                        ->select('id', 'campaign_id', 'rider_id', 'helmet_id', 'tracking_tag', 'assigned_at', 'completed_at', 'status');
                }
            ])
            ->find($campaignId);
    }

    /**
     * Check if rider has uploaded all documents
     */
    public function hasDocuments(Rider $rider): bool
    {
        return !empty($rider->national_id) &&
            !empty($rider->national_id_front_photo) &&
            !empty($rider->national_id_back_photo) &&
            !empty($rider->passport_photo) &&
            !empty($rider->good_conduct_certificate) &&
            !empty($rider->motorbike_license) &&
            !empty($rider->motorbike_registration);
    }

    /**
     * Check if rider has completed contact info
     */
    public function hasContactInfo(Rider $rider): bool
    {
        return !empty($rider->mpesa_number) &&
            !empty($rider->next_of_kin_name) &&
            !empty($rider->next_of_kin_phone);
    }

    /**
     * Get missing documents list
     */
    public function getMissingDocuments(Rider $rider): array
    {
        $required = [
            'national_id' => 'National ID Number',
            'national_id_front_photo' => 'National ID Front Photo',
            'national_id_back_photo' => 'National ID Back Photo',
            'passport_photo' => 'Passport Photo',
            'good_conduct_certificate' => 'Good Conduct Certificate',
            'motorbike_license' => 'Motorbike License',
            'motorbike_registration' => 'Motorbike Registration',
        ];

        $missing = [];
        foreach ($required as $field => $label) {
            if (empty($rider->$field)) {
                $missing[$field] = $label;
            }
        }

        return $missing;
    }

    /**
     * Get status of all document uploads
     */
    public function getUploadedDocumentsStatus(Rider $rider): array
    {
        return [
            'national_id' => !empty($rider->national_id),
            'national_id_front_photo' => !empty($rider->national_id_front_photo),
            'national_id_back_photo' => !empty($rider->national_id_back_photo),
            'passport_photo' => !empty($rider->passport_photo),
            'good_conduct_certificate' => !empty($rider->good_conduct_certificate),
            'motorbike_license' => !empty($rider->motorbike_license),
            'motorbike_registration' => !empty($rider->motorbike_registration),
        ];
    }

    /**
     * Format basic rider data for responses
     */
    public function formatBasicRiderData(Rider $rider): array
    {
        return [
            'id' => $rider->id,
            'national_id' => $rider->national_id,
            'mpesa_number' => $rider->mpesa_number,
            'next_of_kin_name' => $rider->next_of_kin_name,
            'next_of_kin_phone' => $rider->next_of_kin_phone,
            'status' => $rider->status,
            'daily_rate' => $rider->daily_rate,
            'has_location' => $rider->hasCurrentLocation(),
            'has_documents' => $this->hasDocuments($rider),
            'has_contact_info' => $this->hasContactInfo($rider),
            'has_agreement' => !empty($rider->signed_agreement),
        ];
    }

    /**
     * Format full rider data for responses
     */
    public function formatFullRiderData(Rider $rider): array
    {
        return [
            'id' => $rider->id,
            'national_id' => $rider->national_id,
            'mpesa_number' => $rider->mpesa_number,
            'next_of_kin_name' => $rider->next_of_kin_name,
            'next_of_kin_phone' => $rider->next_of_kin_phone,
            'status' => $rider->status,
            'daily_rate' => $rider->daily_rate,
            'wallet_balance' => $rider->wallet_balance,
            'location_changes_count' => $rider->location_changes_count,
            'location_last_updated' => $rider?->location_last_updated?->format('Y-m-d H:i:s') ?? null,
            'created_at' => $rider?->created_at?->format('Y-m-d H:i:s') ?? null,
            'is_profile_complete' => $rider->isProfileComplete(),
            'can_work' => $rider->canWork(),
            // 'profile_completion' => $rider->getProfileCompletionPercentage(),
            // 'next_step' => $rider->getNextIncompleteStep(),

            // User information
            'user' => [
                'id' => $rider->user->id,
                'first_name' => $rider->user->first_name,
                'last_name' => $rider->user->last_name,
                'name' => $rider->user->name,
                'full_name' => $rider->user->full_name,
                'email' => $rider->user->email,
                'phone' => $rider->user->phone,
                'is_active' => $rider->user->is_active,
                'created_at' => $rider?->user?->created_at?->format('Y-m-d H:i:s') ?? null,
            ],

            // Document URLs
            'documents' => [
                'national_id_front_photo' => $rider->national_id_front_photo ? Storage::url($rider->national_id_front_photo) : null,
                'national_id_back_photo' => $rider->national_id_back_photo ? Storage::url($rider->national_id_back_photo) : null,
                'passport_photo' => $rider->passport_photo ? Storage::url($rider->passport_photo) : null,
                'good_conduct_certificate' => $rider->good_conduct_certificate ? Storage::url($rider->good_conduct_certificate) : null,
                'motorbike_license' => $rider->motorbike_license ? Storage::url($rider->motorbike_license) : null,
                'motorbike_registration' => $rider->motorbike_registration ? Storage::url($rider->motorbike_registration) : null,
            ],

            // Current location
            'current_location' => $rider->currentLocation ? [
                'id' => $rider->currentLocation->id,
                'stage_name' => $rider->currentLocation->stage_name,
                'latitude' => $rider->currentLocation->latitude,
                'longitude' => $rider->currentLocation->longitude,
                'effective_from' => $rider->currentLocation->effective_from,
                'status' => $rider->currentLocation->status,
                'county' => [
                    'id' => $rider->currentLocation->county->id,
                    'name' => $rider->currentLocation->county->name,
                ],
                'subcounty' => [
                    'id' => $rider->currentLocation->subcounty->id,
                    'name' => $rider->currentLocation->subcounty->name,
                ],
                'ward' => [
                    'id' => $rider->currentLocation->ward->id,
                    'name' => $rider->currentLocation->ward->name,
                ],
                'full_address' => $rider->location_display_name,
            ] : null,

            // Current assignment
            'current_assignment' => $rider->currentAssignment ? [
                'id' => $rider->currentAssignment->id,
                'assigned_at' => $rider?->currentAssignment->assigned_at?->format('Y-m-d H:i:s') ?? null,
                'status' => $rider->currentAssignment->status,
                'campaign' => [
                    'id' => $rider->currentAssignment->campaign->id,
                    'name' => $rider->currentAssignment->campaign->name,
                ],
            ] : null,

            // Rejection reasons (if any)
            'rejection_reasons' => $rider->rejectionReasons->map(function ($reason) {
                return [
                    'id' => $reason->id,
                    'reason' => $reason->reason,
                    'rejected_at' => $reason?->created_at?->format('Y-m-d H:i:s') ?? null,
                    'rejected_by' => $reason->rejectedBy ? [
                        'id' => $reason->rejectedBy->id,
                        'name' => $reason->rejectedBy->name,
                    ] : null,
                ];
            })->toArray(),
        ];
    }

    /**
     * Get rider profile data (for profile page initialization)
     */
    public function getRiderProfileData(int $userId): array
    {
        $rider = $this->getRiderByUserId($userId);

        return [
            'rider' => $rider ? [
                'id' => $rider->id,
                'national_id' => $rider->national_id,
                'mpesa_number' => $rider->mpesa_number,
                'next_of_kin_name' => $rider->next_of_kin_name,
                'next_of_kin_phone' => $rider->next_of_kin_phone,
                'status' => $rider->status,
                'daily_rate' => $rider->daily_rate,
                'has_location' => $rider->hasCurrentLocation(),
                'has_documents' => $this->hasDocuments($rider),
                'has_contact_info' => $this->hasContactInfo($rider),
                'has_agreement' => !empty($rider->signed_agreement),
                'current_location' => $rider->currentLocation ? [
                    'county_id' => $rider->currentLocation->county_id,
                    'sub_county_id' => $rider->currentLocation->sub_county_id,
                    'ward_id' => $rider->currentLocation->ward_id,
                    'stage_name' => $rider->currentLocation->stage_name,
                    'notes' => $rider->currentLocation->notes,
                ] : null,
                'documents' => [
                    'national_id_front_photo' => $rider->national_id_front_photo ? Storage::url($rider->national_id_front_photo) : null,
                    'national_id_back_photo' => $rider->national_id_back_photo ? Storage::url($rider->national_id_back_photo) : null,
                    'passport_photo' => $rider->passport_photo ? Storage::url($rider->passport_photo) : null,
                    'good_conduct_certificate' => $rider->good_conduct_certificate ? Storage::url($rider->good_conduct_certificate) : null,
                    'motorbike_license' => $rider->motorbike_license ? Storage::url($rider->motorbike_license) : null,
                    'motorbike_registration' => $rider->motorbike_registration ? Storage::url($rider->motorbike_registration) : null,
                ],
            ] : null,
        ];
    }


    public function getActiveHelmet(Rider $rider): Helmet
    {
        $assignment = $rider->currentAssignment()->with('helmet')->first();

        return $assignment?->helmet ?? null;
    }
}
