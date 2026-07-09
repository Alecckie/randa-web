<?php

namespace App\Http\Middleware;

use App\Models\Advertiser;
use App\Models\Payment;
use App\Models\Rider;
use Illuminate\Http\Request;
use Inertia\Middleware;
use Tighten\Ziggy\Ziggy;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user(),
            ],
            'ziggy' => fn() => [
                ...(new Ziggy)->toArray(),
                'location' => $request->url(),
            ],
            'flash' => [
                'success' => fn() => $request->session()->get('success'),
                'error' => fn() => $request->session()->get('error'),
                'warning' => fn() => $request->session()->get('warning'),
                'message' => fn() => $request->session()->get('message'),
                'reference' => fn() => $request->session()->get('reference'),
                'payment_id' => fn() => $request->session()->get('payment_id'),
                'checkout_request_id' => fn() => $request->session()->get('checkout_request_id'),
                'paybill_details' => fn() => $request->session()->get('paybill_details'),
                'receipt_number' => fn() => $request->session()->get('receipt_number'),
                'requires_approval' => fn() => $request->session()->get('requires_approval'),
            ],

            'nav_counts' => function () use ($request) {
                $user = $request->user();
                if (!$user) {
                    return [];
                }

                $unreadNotifications = $user->notifications()->whereNull('read_at')->count();

                if ($user->isAdmin()) {
                    return [
                        'pending_riders'       => Rider::where('status', 'pending')->count(),
                        'pending_advertisers'  => Advertiser::where('status', 'pending')->count(),
                        'pending_payments'     => Payment::where('status', 'pending_verification')->count(),
                        'unread_notifications' => $unreadNotifications,
                    ];
                }

                if ($user->role === 'advertiser') {
                    $advertiserId = $user->advertiser?->id;
                    return [
                        'pending_payments' => $advertiserId
                            ? Payment::where('advertiser_id', $advertiserId)->where('status', 'pending_verification')->count()
                            : 0,
                        'unread_notifications' => $unreadNotifications,
                    ];
                }

                return [
                    'unread_notifications' => $unreadNotifications,
                ];
            },

            'errors' => fn() => $request->session()->get('errors')
                ? $request->session()->get('errors')->getBag('default')->getMessages()
                : (object) [],
        ];
    }
}
