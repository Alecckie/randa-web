<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreBatchLocationRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // Authorization handled by middleware
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'locations' => 'required|array|min:1|max:500',
            'locations.*.latitude' => 'required|numeric|between:-90,90',
            'locations.*.longitude' => 'required|numeric|between:-180,180',
            'locations.*.accuracy' => 'nullable|numeric|min:0',
            'locations.*.altitude' => 'nullable|numeric',
            'locations.*.speed' => 'nullable|numeric|min:0',
            'locations.*.heading' => 'nullable|numeric|between:0,360',
            'locations.*.recorded_at' => 'nullable|date',
            'locations.*.metadata' => 'nullable|array',
            'locations.*.metadata.battery_level' => 'nullable|numeric|between:0,100',
            'locations.*.metadata.network_type' => 'nullable|string|in:wifi,cellular,none',
            'locations.*.metadata.app_version' => 'nullable|string|max:20',
        ];
    }
}
