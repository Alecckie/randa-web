<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\SubmitSelfieRequest;
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


    /**
     * POST /api/rider/selfie-prompts
     */
    public function storePrompt(): JsonResponse
    {
        try {
            $rider = $this->riderService->getRiderByUserId(Auth::id());

            if (!$rider) {
                return $this->sendError('Rider profile not found.', [], 404);
            }

            $prompt = $this->selfieService->createPrompt($rider);

            return $this->sendResponse(
                ['prompt' => $this->selfieService->formatPrompt($prompt)],
                'Prompt saved successfully.',
                201
            );
        } catch (\Exception $e) {
            return $this->sendError('Failed to save prompt: ' . $e->getMessage(), [], 500);
        }
    }


    /**
     * PATCH /api/rider/selfie-prompts/{prompt}/accept
     */
    public function acceptPrompt(SelfiePrompt $prompt): JsonResponse
    {
        try {
            $this->authorizePromptOwnership($prompt);

            $prompt = $this->selfieService->acceptPrompt($prompt);

            return $this->sendResponse(
                ['prompt' => $this->selfieService->formatPrompt($prompt)],
                'Prompt accepted. Please scan your helmet QR code.'
            );
        } catch (\RuntimeException $e) {
            return $this->sendError($e->getMessage(), [], 422);
        } catch (\Exception $e) {
            return $this->sendError('Failed to accept prompt: ' . $e->getMessage(), [], 500);
        }
    }


     /**
     * PATCH /api/rider/selfie-prompts/{prompt}/reject
     */
    public function rejectPrompt(SelfiePrompt $prompt): JsonResponse
    {
        try {
            $this->authorizePromptOwnership($prompt);

            $prompt = $this->selfieService->rejectPrompt($prompt);

            return $this->sendResponse(
                ['prompt' => $this->selfieService->formatPrompt($prompt)],
                'Prompt rejected. Please scan your helmet QR code.'
            );
        } catch (\RuntimeException $e) {
            return $this->sendError($e->getMessage(), [], 422);
        } catch (\Exception $e) {
            return $this->sendError('Failed to reject prompt: ' . $e->getMessage(), [], 500);
        }
    }


    /**
     * POST /api/rider/selfie-prompts/{prompt}/submit
     *
     * Body (JSON): { qr_code, latitude, longitude }
     */
    public function submitQr(SubmitSelfieRequest $request, SelfiePrompt $prompt): JsonResponse
    {
        try {
            $this->authorizePromptOwnership($prompt);

            if (!$prompt->isAccepted()) {
                return $this->sendError(
                    'You must accept the prompt before submitting a QR scan.',
                    [],
                    422
                );
            }

            $rider = $this->riderService->getRiderByUserId(Auth::id());

            $submission = $this->selfieService->submitSelfie(
                $prompt,
                $rider,
                $request->validated()   // qr_code, latitude, longitude — all plain values
            );

            return $this->sendResponse(
                ['submission' => $this->selfieService->formatSubmission($submission)],
                'QR code submitted successfully!',
                201
            );
        } catch (\RuntimeException $e) {
            // Covers: QR code does not match the rider's assigned helmet
            return $this->sendError($e->getMessage(), [], 403);
        } catch (\Exception $e) {
            return $this->sendError('Failed to submit QR scan: ' . $e->getMessage(), [], 500);
        }
    }

    // ─── Read: Active prompt for rider ───────────────────────────────────────

    /**
     * GET /api/rider/selfie-prompts/active
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

    // ─── Read: Prompt history for rider ──────────────────────────────────────

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

            return $this->sendResponse($prompts, 'Prompts retrieved.');
        } catch (\Exception $e) {
            return $this->sendError($e->getMessage(), [], 500);
        }
    }

    // ─── Private helpers ─────────────────────────────────────────────────────

    private function authorizePromptOwnership(SelfiePrompt $prompt): void
    {
        if ($prompt->user_id !== Auth::id()) {
            abort(403, 'You are not authorized to access this prompt.');
        }
    }
}