<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SubCountyResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $data = parent::toArray($request);
        $data['county_id'] = $this->county_id;

        if ($request->has('include_counts')) {
            $data['wards_count'] = $this->when(
                $this->relationLoaded('wards') || isset($this->wards_count),
                $this->wards_count ?? 0
            );
        }

        return $data;
    }
}
