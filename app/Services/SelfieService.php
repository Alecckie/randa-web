<?php

namespace App\Services;

use App\Models\Rider;
use App\Models\SelfiePrompt;
use App\Models\SelfieSubmission;
use Illuminate\Http\UploadedFile;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SelfieService
{
    /**
     * Save a selfie prompt sent from the mobile app.
     * The mobile app generates the scheduled datetime and calls this endpoint.
     */
    public function createPrompt(Rider $rider): SelfiePrompt
    {
        return SelfiePrompt::create([
            'rider_id'     => $rider->id,
            'user_id'      => $rider->user_id,
            'prompt_sent_at' => now(),
            'status'       => 'pending',
        ]);
    }

    /**
     * Mark a prompt as accepted by the rider (rider tapped "Take Selfie").
     */
    public function acceptPrompt(SelfiePrompt $prompt): SelfiePrompt
    {
        if (!$prompt->isPending()) {
            throw new \RuntimeException('This prompt has already been responded to or has expired.');
        }

        $prompt->update([
            'status'       => 'accepted',
            'responded_at' => now(),
        ]);

        return $prompt->fresh();
    }

    /**
     * Submit the selfie image + GPS coordinates for an accepted prompt.
     */
    public function submitSelfie(SelfiePrompt $prompt, Rider $rider, array $data): SelfieSubmission
    {
        return DB::transaction(function () use ($prompt, $rider, $data) {
            
            $imagePath = $this->uploadSelfieImage($rider, $data['selfie_image']);

            $submission = SelfieSubmission::create([
                'selfie_prompt_id' => $prompt->id,
                'rider_id'         => $rider->id,
                'user_id'          => $rider->user_id,
                'selfie_image'     => $imagePath,
                'latitude'         => $data['latitude'],
                'longitude'        => $data['longitude'],
                'submitted_at'     => now(),
                'status'           => 'pending_review',
            ]);

            // Mark prompt as completed
            $prompt->update(['status' => 'completed']);

            Log::info('Selfie submitted', [
                'rider_id'      => $rider->id,
                'prompt_id'     => $prompt->id,
                'submission_id' => $submission->id,
            ]);

            return $submission->load('selfiePrompt');
        });
    }

    /**
     * Get the current pending/accepted prompt for the logged-in rider.
     */
    public function getActivePromptForRider(Rider $rider): ?SelfiePrompt
    {
        return SelfiePrompt::where('rider_id', $rider->id)
            ->whereIn('status', ['pending', 'accepted'])
            ->latest('prompt_sent_at')
            ->first();
    }

    /**
     * Paginated list of prompts for a rider (admin or rider view).
     */
    public function getPromptsForRider(Rider $rider, array $filters = []): LengthAwarePaginator
    {
        $query = SelfiePrompt::where('rider_id', $rider->id)
            ->with('submission')
            ->latest('prompt_sent_at');

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        return $query->paginate($filters['per_page'] ?? 15);
    }

    /**
     * Upload the selfie image to storage.
     */
    private function uploadSelfieImage(Rider $rider, UploadedFile $file): string
    {
        $path = "riders/selfies/{$rider->id}/" . date('Y/m/d_His');
        return $file->store($path, 'public');
    }

    /**
     * Format a prompt for API response.
     */
    public function formatPrompt(SelfiePrompt $prompt): array
    {
        return [
            'id'           => $prompt->id,
            'status'       => $prompt->status,
            'prompt_sent_at'  => $prompt->prompt_sent_at?->toIso8601String(),
            'responded_at' => $prompt->responded_at?->toIso8601String(),
            'has_submission' => $prompt->submission !== null,
        ];
    }

    /**
     * Format a submission for API response.
     */
    public function formatSubmission(SelfieSubmission $submission): array
    {
        return [
            'id'               => $submission->id,
            'selfie_prompt_id' => $submission->selfie_prompt_id,
            'selfie_image_url' => $submission->selfie_image_url,
            'latitude'         => $submission->latitude,
            'longitude'        => $submission->longitude,
            'submitted_at'     => $submission->submitted_at?->toIso8601String(),
            'status'           => $submission->status,
        ];
    }
}
