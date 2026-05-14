<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class NotificationsController extends Controller
{
    /**
     * GET /notifications
     * Returns the authenticated user's recent notifications (newest first, limit 30).
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $notifications = DB::table('notifications')
            ->where('notifiable_type', get_class($user))
            ->where('notifiable_id', $user->id)
            ->orderByDesc('created_at')
            ->limit(30)
            ->get()
            ->map(function ($n) {
                return [
                    'id'         => $n->id,
                    'type'       => $n->type,
                    'data'       => json_decode($n->data, true),
                    'read_at'    => $n->read_at,
                    'created_at' => $n->created_at,
                ];
            });

        $unreadCount = DB::table('notifications')
            ->where('notifiable_type', get_class($user))
            ->where('notifiable_id', $user->id)
            ->whereNull('read_at')
            ->count();

        return response()->json([
            'notifications' => $notifications,
            'unread_count'  => $unreadCount,
        ]);
    }

    /**
     * POST /notifications/{id}/read
     * Marks a single notification as read.
     */
    public function markRead(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        DB::table('notifications')
            ->where('id', $id)
            ->where('notifiable_type', get_class($user))
            ->where('notifiable_id', $user->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['success' => true]);
    }

    /**
     * POST /notifications/read-all
     * Marks all of the user's unread notifications as read.
     */
    public function markAllRead(Request $request): JsonResponse
    {
        $user = $request->user();

        DB::table('notifications')
            ->where('notifiable_type', get_class($user))
            ->where('notifiable_id', $user->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['success' => true]);
    }
}
