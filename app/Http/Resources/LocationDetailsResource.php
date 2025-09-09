<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LocationDetailsResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'county' => new CountyResource($this['county']),
            'subcounty' => new SubcountyResource($this['subcounty']),
            'ward' => new WardResource($this['ward']),
        ];
    }
}
