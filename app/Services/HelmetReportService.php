<?php

namespace App\Services;

use App\Models\Helmet;
use App\Models\HelmetReport;
use App\Models\Rider;
use Illuminate\Http\UploadedFile;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class HelmetReportService
{
    /**
     * Create a new helmet status report submitted by a rider.
     */
    public function createReport(Rider $rider, array $data): HelmetReport
    {
        return DB::transaction(function () use ($rider, $data) {
            // Upload helmet image
            $imagePath = $this->uploadHelmetImage($rider, $data['helmet_image']);

            // Attempt to resolve the helmet from the rider's current assignment
            $helmetId = $data['helmet_id'] ?? $rider->currentAssignment?->helmet_id ?? null;

            $report = HelmetReport::create([
                'rider_id'           => $rider->id,
                'user_id'            => $rider->user_id,
                'helmet_id'          => $helmetId,
                'helmet_image'       => $imagePath,
                'status_description' => $data['status_description'],
                'priority_level'     => $data['priority_level'],
                'report_status'      => 'open',
            ]);

            Log::info('Helmet report created', [
                'rider_id'  => $rider->id,
                'report_id' => $report->id,
                'priority'  => $data['priority_level'],
            ]);

            return $report->load(['rider.user', 'helmet']);
        });
    }

    /**
     * Get paginated reports (admin view).
     */
    public function getAllReports(array $filters = []): LengthAwarePaginator
    {
        $query = HelmetReport::query()
            ->with(['rider.user', 'helmet'])
            ->latest();

        if (!empty($filters['priority_level'])) {
            $query->where('priority_level', $filters['priority_level']);
        }

        if (!empty($filters['report_status'])) {
            $query->where('report_status', $filters['report_status']);
        }

        if (!empty($filters['rider_id'])) {
            $query->where('rider_id', $filters['rider_id']);
        }

        if (!empty($filters['helmet_id'])) {
            $query->where('helmet_id', $filters['helmet_id']);
        }

        return $query->paginate($filters['per_page'] ?? 15);
    }

    /**
     * Get paginated reports for a specific rider.
     */
    public function getReportsForRider(Rider $rider, array $filters = []): LengthAwarePaginator
    {
        $query = HelmetReport::where('rider_id', $rider->id)
            ->with('helmet')
            ->latest();

        if (!empty($filters['report_status'])) {
            $query->where('report_status', $filters['report_status']);
        }

        if (!empty($filters['priority_level'])) {
            $query->where('priority_level', $filters['priority_level']);
        }

        return $query->paginate($filters['per_page'] ?? 15);
    }

    /**
     * Resolve a helmet report (admin action).
     */
    public function resolveReport(HelmetReport $report, int $resolvedBy, string $resolutionNotes): HelmetReport
    {
        $report->update([
            'report_status'    => 'resolved',
            'resolution_notes' => $resolutionNotes,
            'resolved_by'      => $resolvedBy,
            'resolved_at'      => now(),
        ]);

        return $report->fresh(['rider.user', 'helmet', 'resolvedBy']);
    }

    /**
     * Get summary stats (admin dashboard).
     */
    public function getReportStats(): array
    {
        return [
            'total_reports'     => HelmetReport::count(),
            'open_reports'      => HelmetReport::where('report_status', 'open')->count(),
            'in_progress'       => HelmetReport::where('report_status', 'in_progress')->count(),
            'resolved_reports'  => HelmetReport::where('report_status', 'resolved')->count(),
            'high_priority'     => HelmetReport::where('priority_level', 'high')->where('report_status', '!=', 'resolved')->count(),
            'medium_priority'   => HelmetReport::where('priority_level', 'medium')->where('report_status', '!=', 'resolved')->count(),
            'low_priority'      => HelmetReport::where('priority_level', 'low')->where('report_status', '!=', 'resolved')->count(),
        ];
    }

    /**
     * Format a report for API response.
     */
    public function formatReport(HelmetReport $report): array
    {
        return [
            'id'                 => $report->id,
            'helmet_image_url'   => $report->helmet_image_url,
            'status_description' => $report->status_description,
            'priority_level'     => $report->priority_level,
            'report_status'      => $report->report_status,
            'resolution_notes'   => $report->resolution_notes,
            'resolved_at'        => $report->resolved_at?->toIso8601String(),
            'created_at'         => $report->created_at?->toIso8601String(),
            'rider' => $report->rider ? [
                'id'   => $report->rider->id,
                'name' => $report->rider->user?->name,
            ] : null,
            'helmet' => $report->helmet ? [
                'id'          => $report->helmet->id,
                'helmet_code' => $report->helmet->helmet_code,
            ] : null,
        ];
    }

    /**
     * Upload the helmet image to storage.
     */
    private function uploadHelmetImage(Rider $rider, UploadedFile $file): string
    {
        $path = "riders/helmet-reports/{$rider->id}/" . date('Y/m');
        return $file->store($path, 'public');
    }
}