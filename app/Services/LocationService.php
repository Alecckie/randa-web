<?php

namespace App\Services;

use App\Models\County;
use App\Models\SubCounty;
use App\Models\Ward;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

class LocationService
{
    private const CACHE_TTL = 3600; 

    public function getAllCounties(): Collection
    {
        return Cache::remember('counties.all', self::CACHE_TTL, function () {
            return County::forDropdown()->get();
        });
    }

    public function getSub_countiesByCounty(int $countyId): Collection
    {
        $cacheKey = "sub_counties.county.{$countyId}";
        
        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($countyId) {
            return SubCounty::byCounty($countyId)->forDropdown()->get();
        });
    }

    public function getWardsBySubCounty(int $subcountyId): Collection
    {
        $cacheKey = "wards.subcounty.{$subcountyId}";
        
        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($subcountyId) {
            return Ward::bySubCounty($subcountyId)->forDropdown()->get();
        });
    }

    public function searchCounties(string $search, int $limit = 20): Collection
    {
        $cacheKey = "counties.search." . md5($search . $limit);
        
        return Cache::remember($cacheKey, self::CACHE_TTL / 2, function () use ($search, $limit) {
            return County::forDropdown()
                ->where('name', 'LIKE', "%{$search}%")
                ->limit($limit)
                ->get();
        });
    }

    public function searchSub_counties(int $countyId, string $search, int $limit = 20): Collection
    {
        $cacheKey = "sub_counties.search.{$countyId}." . md5($search . $limit);
        
        return Cache::remember($cacheKey, self::CACHE_TTL / 2, function () use ($countyId, $search, $limit) {
            return SubCounty::byCounty($countyId)
                ->forDropdown()
                ->where('name', 'LIKE', "%{$search}%")
                ->limit($limit)
                ->get();
        });
    }

    public function searchWards(int $subcountyId, string $search, int $limit = 20): Collection
    {
        $cacheKey = "wards.search.{$subcountyId}." . md5($search . $limit);
        
        return Cache::remember($cacheKey, self::CACHE_TTL / 2, function () use ($subcountyId, $search, $limit) {
            return Ward::bySubCounty($subcountyId)
                ->forDropdown()
                ->where('name', 'LIKE', "%{$search}%")
                ->limit($limit)
                ->get();
        });
    }

    public function validateLocationHierarchy(int $countyId, int $subcountyId, int $wardId): bool
    {
        $cacheKey = "location.validate.{$countyId}.{$subcountyId}.{$wardId}";
        
        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($countyId, $subcountyId, $wardId) {
            return Ward::whereHas('subcounty', function ($query) use ($countyId, $subcountyId) {
                $query->where('id', $subcountyId)
                      ->where('county_id', $countyId);
            })->where('id', $wardId)->exists();
        });
    }

    public function getLocationDetails(int $wardId): ?array
    {
        $cacheKey = "location.details.{$wardId}";
        
        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($wardId) {
            $ward = Ward::with(['subcounty.county'])
                ->find($wardId);

            if (!$ward) {
                return null;
            }

            return [
                'ward' => [
                    'id' => $ward->id,
                    'name' => $ward->name
                ],
                'subcounty' => [
                    'id' => $ward->subcounty->id,
                    'name' => $ward->subcounty->name
                ],
                'county' => [
                    'id' => $ward->subcounty->county->id,
                    'name' => $ward->subcounty->county->name
                ]
            ];
        });
    }

    public function clearLocationCache(): void
    {
        Cache::forget('counties.all');
        
        
        if (Cache::getStore() instanceof \Illuminate\Cache\RedisStore) {
            Cache::flush();
        }
    }
}