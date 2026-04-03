<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreBatchLocationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Authorization handled by middleware
    }

    public function rules(): array
    {
        return [
            'locations'                        => 'required|array|min:1|max:100',
            'locations.*.latitude'             => 'required|numeric|between:-90,90',
            'locations.*.longitude'            => 'required|numeric|between:-180,180',
            'locations.*.accuracy'             => 'nullable|numeric|min:0',
            'locations.*.altitude'             => 'nullable|numeric',
            'locations.*.speed'                => 'nullable|numeric|min:0',
            'locations.*.heading'              => 'nullable|numeric|between:0,360',
            'locations.*.recorded_at'          => 'required|date',
            'locations.*.source'               => 'nullable|string|in:mobile,web,api',
            'locations.*.metadata'             => 'nullable|array',
            'locations.*.metadata.battery_level' => 'nullable|numeric|between:0,100',
            'locations.*.metadata.network_type'  => 'nullable|string|in:wifi,cellular,none',
            'locations.*.metadata.app_version'   => 'nullable|string|max:20',
        ];
    }

    public function messages(): array
    {
        return [
            'locations.required'             => 'A locations array is required.',
            'locations.min'                  => 'At least one location point is required.',
            'locations.max'                  => 'A maximum of 100 location points can be sent per batch.',
            'locations.*.latitude.required'  => 'Each location must include a latitude.',
            'locations.*.latitude.between'   => 'Latitude must be between -90 and 90.',
            'locations.*.longitude.required' => 'Each location must include a longitude.',
            'locations.*.longitude.between'  => 'Longitude must be between -180 and 180.',
            'locations.*.recorded_at.required' => 'Each location must include a recorded_at timestamp.',
            'locations.*.recorded_at.date'   => 'recorded_at must be a valid date.',
        ];
    }
}