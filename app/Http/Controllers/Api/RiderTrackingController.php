<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreBatchLocationRequest;
use App\Http\Requests\StoreLocationRequest;
use App\Services\RiderTrackingService;
use App\Services\RiderService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;
use Exception;

/**
 * Rider Location Tracking Controller (Mobile API)
 *
 * Thin controller: validates input, delegates to RiderTrackingService,
 * formats JSON responses. No business logic lives here.
 */
class RiderTrackingController extends Controller
{
    public function __construct(
        private RiderTrackingService $trackingService,
        private RiderService $riderService
    ) {}

    // ──────────────────────────────────────────────────────────────────────
    // POST /api/rider/location  — single point (real-time)
    // ──────────────────────────────────────────────────────────────────────

    public function store(StoreLocationRequest $request): JsonResponse
    {
        try {
            $rider = $this->getRider();

            $locationData = [
                'latitude'    => $request->latitude,
                'longitude'   => $request->longitude,
                'accuracy'    => $request->accuracy,
                'altitude'    => $request->altitude,
                'speed'       => $request->speed,
                'heading'     => $request->heading,
                'recorded_at' => $request->recorded_at
                    ? Carbon::parse($request->recorded_at)
                    : now(),
                'source'      => $this->getSource($request),
                'metadata'    => $request->metadata,
            ];

            $gpsPoint = $this->trackingService->recordLocation($rider->id, $locationData);

            return $this->success([
                'gps_point_id' => $gpsPoint->id,
                'recorded_at'  => $gpsPoint->recorded_at->toIso8601String(),
                'latitude'     => (float) $gpsPoint->latitude,
                'longitude'    => (float) $gpsPoint->longitude,
            ], 'Location recorded successfully.', 201);

        } catch (Exception $e) {
            return $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // ──────────────────────────────────────────────────────────────────────
    // POST /api/rider/locations/batch  — offline sync
    // ──────────────────────────────────────────────────────────────────────

    public function storeBatch(StoreBatchLocationRequest $request): JsonResponse
    {
        try {
            $rider = $this->getRider();

            // recordBatchLocations now returns a stats array, not a plain int
            $result = $this->trackingService->recordBatchLocations(
                $rider->id,
                $request->locations
            );

            return $this->success([
                'stored'              => $result['stored'],
                'original'            => $result['original'],
                'after_dedup'         => $result['after_dedup'],
                'dedup_reduction_pct' => $result['dedup_reduction_pct'],
                'rdp_reduction_pct'   => $result['rdp_reduction_pct'],
                'timestamp'           => now()->toIso8601String(),
            ], "{$result['stored']} of {$result['original']} locations stored after optimisation.", 201);

        } catch (Exception $e) {
            return $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // ──────────────────────────────────────────────────────────────────────
    // GET /api/rider/location/current
    // ──────────────────────────────────────────────────────────────────────

    public function current(): JsonResponse
    {
        try {
            $rider    = $this->getRider();
            $gpsPoint = $this->trackingService->getCurrentLocation($rider->id);

            if (! $gpsPoint) {
                return $this->success(null, 'No location data found.');
            }

            return $this->success([
                'id'          => $gpsPoint->id,
                'latitude'    => (float) $gpsPoint->latitude,
                'longitude'   => (float) $gpsPoint->longitude,
                'accuracy'    => $gpsPoint->accuracy ? (float) $gpsPoint->accuracy : null,
                'speed'       => $gpsPoint->speed    ? (float) $gpsPoint->speed    : null,
                'heading'     => $gpsPoint->heading  ? (float) $gpsPoint->heading  : null,
                'recorded_at' => $gpsPoint->recorded_at->toIso8601String(),
                'time_ago'    => $gpsPoint->recorded_at->diffForHumans(),
                'is_recent'   => $gpsPoint->is_recent,
            ]);

        } catch (Exception $e) {
            return $this->error($e->getMessage());
        }
    }

    // ──────────────────────────────────────────────────────────────────────
    // GET /api/rider/tracking/status
    // ──────────────────────────────────────────────────────────────────────

    public function trackingStatus(): JsonResponse
    {
        try {
            $rider  = $this->getRider();
            $status = $this->trackingService->getTrackingStatus($rider->id);

            return $this->success($status);

        } catch (Exception $e) {
            return $this->error($e->getMessage());
        }
    }

    // ──────────────────────────────────────────────────────────────────────
    // GET /api/rider/routes/today
    // ──────────────────────────────────────────────────────────────────────

    public function getTodayRoute(): JsonResponse
    {
        try {
            $rider = $this->getRider();
            $stats = $this->trackingService->getRiderStats($rider->id, today());

            return $this->success($stats);

        } catch (Exception $e) {
            return $this->error($e->getMessage());
        }
    }

    // ──────────────────────────────────────────────────────────────────────
    // GET /api/rider/routes/history
    // ──────────────────────────────────────────────────────────────────────

    public function getRouteHistory(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'date_from' => 'nullable|date',
            'date_to'   => 'nullable|date|after_or_equal:date_from',
            'limit'     => 'nullable|integer|min:1|max:1000',
        ]);

        try {
            $rider = $this->getRider();

            $filters = [
                'date_from' => $validated['date_from'] ?? now()->subDays(30),
                'date_to'   => $validated['date_to']   ?? today(),
                'limit'     => $validated['limit']     ?? 1000,
            ];

            $gpsPoints = $this->trackingService->getRiderLocations($rider->id, $filters);

            return $this->success([
                'count'     => $gpsPoints->count(),
                'locations' => $gpsPoints->map(fn ($point) => [
                    'id'          => $point->id,
                    'latitude'    => (float) $point->latitude,
                    'longitude'   => (float) $point->longitude,
                    'speed'       => $point->speed ? (float) $point->speed : null,
                    'recorded_at' => $point->recorded_at->toIso8601String(),
                ]),
            ]);

        } catch (Exception $e) {
            return $this->error($e->getMessage());
        }
    }

    // ──────────────────────────────────────────────────────────────────────
    // GET /api/rider/tracking/stats
    // ──────────────────────────────────────────────────────────────────────

    public function stats(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'date' => 'nullable|date',
        ]);

        try {
            $rider = $this->getRider();
            $date  = isset($validated['date']) ? Carbon::parse($validated['date']) : today();

            return $this->success($this->trackingService->getRiderStats($rider->id, $date));

        } catch (Exception $e) {
            return $this->error($e->getMessage());
        }
    }

    // ──────────────────────────────────────────────────────────────────────
    // POST /api/rider/tracking/pause
    // ──────────────────────────────────────────────────────────────────────

    public function pause(): JsonResponse
    {
        try {
            $rider  = $this->getRider();
            $result = $this->trackingService->pauseTracking($rider->id);

            $checkIn    = $result['check_in'];
            $pauseEvent = $result['pause_event'];

            return $this->success([
                'check_in_id'    => $checkIn->id,
                'status'         => $checkIn->status,
                'paused_at'      => $pauseEvent->paused_at?->toIso8601String(),
                'pause_latitude' => $pauseEvent->pause_latitude,
                'pause_longitude'=> $pauseEvent->pause_longitude,
            ], $result['message']);

        } catch (Exception $e) {
            return $this->error($e->getMessage());
        }
    }

    // ──────────────────────────────────────────────────────────────────────
    // POST /api/rider/tracking/resume
    // ──────────────────────────────────────────────────────────────────────

    public function resume(): JsonResponse
    {
        try {
            $rider  = $this->getRider();
            $result = $this->trackingService->resumeTracking($rider->id);

            $checkIn    = $result['check_in'];
            $pauseEvent = $result['pause_event'];

            return $this->success([
                'check_in_id'      => $checkIn->id,
                'status'           => $checkIn->status,
                'resumed_at'       => $pauseEvent->resumed_at?->toIso8601String(),
                'duration_minutes' => $pauseEvent->duration_minutes,
            ], $result['message']);

        } catch (Exception $e) {
            return $this->error($e->getMessage());
        }
    }

    // ──────────────────────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ──────────────────────────────────────────────────────────────────────

    private function getRider()
    {
        $user = Auth::user();

        if (! $user) {
            throw new Exception('User not authenticated.', 401);
        }

        $rider = $this->riderService->getRiderByUserId($user->id);

        if (! $rider) {
            throw new Exception('Rider profile not found.', 404);
        }

        return $rider;
    }

    private function getSource(Request $request): string
    {
        return $request->header('User-Agent-Type', 'mobile');
    }

    private function success(mixed $data = null, string $message = 'Success', int $code = 200): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data'    => $data,
        ], $code);
    }

    private function error(string $message = 'An error occurred', int $code = 400): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => $message,
        ], max($code, 400));
    }
}