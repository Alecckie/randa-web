<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CountyResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $data = parent::toArray($request);

        
        if ($request->has('include_counts')) {
            $data['sub_counties_count'] = $this->when(
                $this->relationLoaded('sub_counties') || isset($this->sub_counties_count),
                $this->sub_counties_count ?? 0
            );
        }

        return $data;
    }
}
