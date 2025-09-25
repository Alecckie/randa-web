<?php

namespace App\Services;

use App\Models\CoverageArea;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

class CoverageAreasService
{
   
    public function paginate(int $perPage = 15): LengthAwarePaginator
    {
        return CoverageArea::with(['county', 'subCounty', 'ward'])
            ->orderBy('name')
            ->paginate($perPage);
    }

    
    public function find(int $id): ?CoverageArea
    {
        return CoverageArea::with(['county', 'subCounty', 'ward'])->find($id);
    }

   
    public function forSelect(?string $search = null, int $limit = 20): Collection
    {
        $query = CoverageArea::query()->select('id', 'name')->orderBy('name');

        if ($search) {
            $query->where('name', 'like', "%{$search}%");
        }

        return $query->limit($limit)->get();
    }

   
    public function create(array $data): CoverageArea
    {
        return CoverageArea::create($data);
    }

    
    public function update(CoverageArea $coverageArea, array $data): CoverageArea
    {
        $coverageArea->update($data);
        return $coverageArea->fresh(['county', 'subCounty', 'ward']);
    }

    
    public function delete(CoverageArea $coverageArea): bool
    {
        return (bool) $coverageArea->delete();
    }
}
