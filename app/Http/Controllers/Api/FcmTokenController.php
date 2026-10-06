<?php

namespace App\Http\Controllers\Api;

use App\Models\FcmToken;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class FcmTokenController extends BaseApiController
{
    /**
     * POST /fcm-token
     * Registers (or reassigns) a device's FCM token to the authenticated user.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token' => ['required', 'string', 'max:255'],
            'platform' => ['nullable', 'in:android,ios'],
        ]);

        FcmToken::updateOrCreate(
            ['token' => $validated['token']],
            [
                'user_id' => Auth::id(),
                'platform' => $validated['platform'] ?? null,
                'last_used_at' => now(),
            ]
        );

        return $this->sendResponse([], 'Device registered for push notifications.');
    }

    /**
     * DELETE /fcm-token
     * Removes a single device's token, e.g. on logout.
     */
    public function destroy(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token' => ['required', 'string'],
        ]);

        FcmToken::where('token', $validated['token'])
            ->where('user_id', Auth::id())
            ->delete();

        return $this->sendResponse([], 'Device unregistered.');
    }
}
