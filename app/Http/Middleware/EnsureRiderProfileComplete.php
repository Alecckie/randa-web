<?php

namespace App\Http\Middleware;

use App\Services\RiderService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Str;


class EnsureRiderProfileComplete
{
    public function __construct(
        private RiderService $riderService
    ) {}

    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = Auth::user();

        // Only apply to riders
        if ($user && $user->role === 'rider') {
            // Check if rider profile exists
            $rider = $this->riderService->getRiderByUserId($user->id);

            // Allow access to profile page, logout, and API routes
            $allowedRoutes = [
                'rider.profile',
                'rider.profile.store',
                'logout',
                'locations.*', // Allow location API calls for dropdowns
            ];

            // Check if current route is allowed
            $currentRoute = $request->route()->getName();
            $isAllowedRoute = collect($allowedRoutes)->contains(function ($pattern) use ($currentRoute) {
                return Str::is($pattern, $currentRoute);
            });

            // If no rider profile exists, redirect to profile page
            if (!$rider && !$isAllowedRoute) {
                return redirect()
                    ->route('rider.profile')
                    ->with('warning', 'Please complete your rider profile to access the dashboard.');
            }

            // If rider profile exists but not approved, restrict access
            if ($rider && $rider->status !== 'approved' && !$isAllowedRoute) {
                return redirect()
                    ->route('rider.profile')
                    ->with('info', 'Your profile is under review. You will be notified once approved.');
            }
        }

        return $next($request);
    }
}