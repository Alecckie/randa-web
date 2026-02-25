<?php

namespace App\Services;

use App\Models\Helmet;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Str;

class HelmetService
{
    public function getAllHelmets(array $filters = []): LengthAwarePaginator
    {
        $query = Helmet::query()->with(['currentAssignment.campaign', 'currentAssignment.rider.user']);

        // Apply filters
        if (!empty($filters['search'])) {
            $query->where(function ($q) use ($filters) {
                $q->where('helmet_code', 'like', '%' . $filters['search'] . '%')
                  ->orWhere('qr_code', 'like', '%' . $filters['search'] . '%')
                  ->orWhere('current_branding', 'like', '%' . $filters['search'] . '%');
            });
        }

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        return $query->orderBy('created_at', 'desc')->paginate(15);
    }

    public function createHelmet(array $data): Helmet
    {
        // Generate QR code if not provided
        if (empty($data['qr_code'])) {
            $data['qr_code'] = $this->generateQrCode($data['helmet_code']);
        }

        return Helmet::create($data);
    }

    public function updateHelmet(Helmet $helmet, array $data): Helmet
    {
        $helmet->update($data);
        return $helmet->fresh();
    }

    public function deleteHelmet(Helmet $helmet): bool
    {
        // Check if helmet has any active assignments
        if ($helmet->currentAssignment) {
            throw new \Exception('Cannot delete helmet with active assignments.');
        }

        return $helmet->delete();
    }

    public function getHelmetStats(): array
    {
        return [
            'total_helmets' => Helmet::count(),
            'available_helmets' => Helmet::where('status', 'available')->count(),
            'assigned_helmets' => Helmet::where('status', 'assigned')->count(),
            'maintenance_helmets' => Helmet::where('status', 'maintenance')->count(),
            'retired_helmets' => Helmet::where('status', 'retired')->count(),
        ];
    }

    public function getAvailableHelmets(): \Illuminate\Database\Eloquent\Collection
    {
        return Helmet::available()->orderBy('helmet_code')->get();
    }

    private function generateQrCode(string $helmetCode): string
    {
        // Generate a unique QR code based on helmet code and timestamp
        return 'QR_' . strtoupper($helmetCode) . '_' . time();
    }

    public function bulkUpdateStatus(array $helmetIds, string $status): int
    {
        return Helmet::whereIn('id', $helmetIds)->update(['status' => $status]);
    }

    public function getRidersWithoutHelmets(): \Illuminate\Database\Eloquent\Collection
    {
        try {
            return \App\Models\Rider::whereDoesntHave('assignments', function($query) {
                $query->where('status', 'active');
            })
            ->where('status', 'approved')
            ->with('user')
            ->get();
        } catch (\Exception $e) {
            \Log::error('Error getting riders without helmets: ' . $e->getMessage());
            return collect(); // Return empty collection on error
        }
    }

    public function assignHelmetToRider(Helmet $helmet, int $riderId): \App\Models\CampaignAssignment
    {
        if ($helmet->status !== 'available') {
            throw new \Exception('Helmet is not available for assignment.');
        }

        $rider = \App\Models\Rider::findOrFail($riderId);
        
        if ($rider->currentAssignment) {
            throw new \Exception('Rider already has an active assignment.');
        }

        $assignment = \App\Models\CampaignAssignment::create([
            'rider_id' => $riderId,
            'helmet_id' => $helmet->id,
            'assigned_at' => now(),
            'status' => 'active'
        ]);

        $helmet->update(['status' => 'assigned']);

        return $assignment;
    }
}