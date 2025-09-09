<?php

namespace App\Http\Controllers\Api;

use App\Http\Resources\CountyResource;
use App\Http\Resources\SubCountyResource;
use App\Http\Resources\WardResource;
use App\Http\Resources\LocationDetailsResource;
use App\Services\LocationService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class LocationController extends BaseApiController
{
    public function __construct(
        private readonly LocationService $locationService
    ) {}

    public function counties(Request $request)
    {
        $request->validate([
            'search' => 'sometimes|string|max:255',
            'limit' => 'sometimes|integer|min:1|max:100'
        ]);

        if ($request->has('search')) {
            $counties = $this->locationService->searchCounties(
                $request->search,
                $request->limit ?? 20
            );
        } else {
            $counties = $this->locationService->getAllCounties();
        }

        $resource = CountyResource::collection($counties);

        return $this->respondBasedOnRequest($request, $resource, 'locations/counties');
    }

    public function sub_counties(Request $request, int $countyId)
    {
        $request->validate([
            'search' => 'sometimes|string|max:255',
            'limit' => 'sometimes|integer|min:1|max:100'
        ]);

        if ($request->has('search')) {
            $sub_counties = $this->locationService->searchSub_counties(
                $countyId,
                $request->search,
                $request->limit ?? 20
            );
        } else {
            $sub_counties = $this->locationService->getSub_countiesByCounty($countyId);
        }

        $resource = SubCountyResource::collection($sub_counties);

        return $this->respondBasedOnRequest($request, $resource, 'locations/sub_counties');
    }

    public function wards(Request $request, int $subcountyId)
    {
        $request->validate([
            'search' => 'sometimes|string|max:255',
            'limit' => 'sometimes|integer|min:1|max:100'
        ]);

        if ($request->has('search')) {
            $wards = $this->locationService->searchWards(
                $subcountyId,
                $request->search,
                $request->limit ?? 20
            );
        } else {
            $wards = $this->locationService->getWardsBySubCounty($subcountyId);
        }

        $resource = WardResource::collection($wards);

        return $this->respondBasedOnRequest($request, $resource, 'locations/wards');
    }

    public function validateLocation(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'county_id' => 'required|integer|exists:counties,id',
                'sub_county_id' => 'required|integer|exists:sub_counties,id',
                'ward_id' => 'required|integer|exists:wards,id'
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'valid' => false,
                'errors' => $e->errors()
            ], 422);
        }

        $isValid = $this->locationService->validateLocationHierarchy(
            $request->county_id,
            $request->sub_county_id,
            $request->ward_id
        );

        return response()->json([
            'valid' => $isValid,
            'message' => $isValid 
                ? 'Location hierarchy is valid' 
                : 'Invalid location hierarchy'
        ]);
    }

    public function locationDetails(Request $request, int $wardId)
    {
        $details = $this->locationService->getLocationDetails($wardId);

        if (!$details) {
            return $this->respondBasedOnRequest(
                $request, 
                ['error' => 'Location not found'], 
                null, 
                404
            );
        }

        $resource = new LocationDetailsResource($details);

        return $this->respondBasedOnRequest($request, $resource, 'locations/details');
    }

    /**
     * Respond based on request type (API vs Web)
     */
    private function respondBasedOnRequest(
        Request $request, 
        $data, 
        ?string $inertiaView = null, 
        int $status = 200
    ) {
        if ($request->wantsJson() || $request->is('api/*')) {
            return response()->json($data, $status);
        }

        // For Inertia (web) requests
        if ($inertiaView && $status === 200) {
            return Inertia::render($inertiaView, [
                'data' => $data
            ]);
        }

        return response()->json($data, $status);
    }
}