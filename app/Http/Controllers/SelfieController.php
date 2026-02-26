<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\Api\StoreSelfiePromptRequest;
use App\Http\Requests\Api\SubmitSelfieRequest;
use App\Models\SelfiePrompt;
use App\Services\RiderService;
use App\Services\SelfieService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class SelfieController extends BaseApiController
{
    public function __construct(
        private SelfieService $selfieService,
        private RiderService  $riderService,
    ) {}


    public function storePrompt(): JsonResponse
    {
        try {
            $rider = $this->riderService->getRiderByUserId(Auth::id());

            if (!$rider) {
                return $this->sendError('Rider profile not found.', [], 404);
            }

            // if (!$rider->canWork()) {
            //     return $this->sendError('Your account is not active.', [], 403);
            // }

            $prompt = $this->selfieService->createPrompt($rider);

            return $this->sendResponse(
                ['prompt' => $this->selfieService->formatPrompt($prompt)],
                'Selfie prompt saved successfully.',
                201
            );
        } catch (\Exception $e) {
            return $this->sendError('Failed to save prompt: ' . $e->getMessage(), [], 500);
        }
    }


    public function acceptPrompt(SelfiePrompt $prompt): JsonResponse
    {
        try {
            $this->authorizePromptOwnership($prompt);

            $prompt = $this->selfieService->acceptPrompt($prompt);

            return $this->sendResponse(
                ['prompt' => $this->selfieService->formatPrompt($prompt)],
                'Prompt accepted. Please take your selfie.'
            );
        } catch (\RuntimeException $e) {
            return $this->sendError($e->getMessage(), [], 422);
        } catch (\Exception $e) {
            return $this->sendError('Failed to accept prompt: ' . $e->getMessage(), [], 500);
        }
    }

    // ─── Step 3: Rider submits the selfie ─────────────────────────────────────

    /**
     * POST /api/rider/selfie-prompts/{prompt}/submit
     *
     * Body (multipart/form-data): { selfie_image, latitude, longitude }
     */
    public function submitSelfie(SubmitSelfieRequest $request, SelfiePrompt $prompt): JsonResponse
    {
        try {
            $this->authorizePromptOwnership($prompt);

            if (!$prompt->isAccepted()) {
                return $this->sendError(
                    'You must accept the prompt before submitting a selfie.',
                    [],
                    422
                );
            }

            $rider = $this->riderService->getRiderByUserId(Auth::id());

            $submission = $this->selfieService->submitSelfie(
                $prompt,
                $rider,
                array_merge($request->validated(), ['selfie_image' => $request->file('selfie_image')])
            );

            return $this->sendResponse(
                ['submission' => $this->selfieService->formatSubmission($submission)],
                'Selfie submitted successfully!',
                201
            );
        } catch (\Exception $e) {
            return $this->sendError('Failed to submit selfie: ' . $e->getMessage(), [], 500);
        }
    }

    // ─── Read: Active prompt for rider ────────────────────────────────────────

    /**
     * GET /api/rider/selfie-prompts/active
     *
     * Returns the current pending/accepted prompt so the app can re-display it after a restart.
     */
    public function activePrompt(): JsonResponse
    {
        try {
            $rider = $this->riderService->getRiderByUserId(Auth::id());

            if (!$rider) {
                return $this->sendError('Rider profile not found.', [], 404);
            }

            $prompt = $this->selfieService->getActivePromptForRider($rider);

            return $this->sendResponse(
                ['prompt' => $prompt ? $this->selfieService->formatPrompt($prompt) : null],
                'Active prompt retrieved.'
            );
        } catch (\Exception $e) {
            return $this->sendError($e->getMessage(), [], 500);
        }
    }

    // ─── Read: Prompt history for rider ───────────────────────────────────────

    /**
     * GET /api/rider/selfie-prompts
     */
    public function index(): JsonResponse
    {
        try {
            $rider = $this->riderService->getRiderByUserId(Auth::id());

            if (!$rider) {
                return $this->sendError('Rider profile not found.', [], 404);
            }

            $prompts = $this->selfieService->getPromptsForRider($rider, request()->all());

            return $this->sendResponse($prompts, 'Selfie prompts retrieved.');
        } catch (\Exception $e) {
            return $this->sendError($e->getMessage(), [], 500);
        }
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    private function authorizePromptOwnership(SelfiePrompt $prompt): void
    {
        if ($prompt->user_id !== Auth::id()) {
            abort(403, 'You are not authorized to access this prompt.');
        }
    }
}
