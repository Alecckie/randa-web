<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreLocationRequest extends FormRequest
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
     */
    public function rules(): array
    {
        return [
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'accuracy' => 'nullable|numeric|min:0',
            'altitude' => 'nullable|numeric',
            'speed' => 'nullable|numeric|min:0',
            'heading' => 'nullable|numeric|between:0,360',
            'recorded_at' => 'nullable|date',
            'metadata' => 'nullable|array',
            'metadata.battery_level' => 'nullable|numeric|between:0,100',
            'metadata.network_type' => 'nullable|string|in:wifi,cellular,none',
            'metadata.app_version' => 'nullable|string|max:20',
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'latitude.required' => 'Latitude is required for location tracking.',
            'latitude.between' => 'Latitude must be between -90 and 90.',
            'longitude.required' => 'Longitude is required for location tracking.',
            'longitude.between' => 'Longitude must be between -180 and 180.',
            'accuracy.min' => 'Accuracy must be a positive number.',
            'speed.min' => 'Speed must be a positive number.',
            'heading.between' => 'Heading must be between 0 and 360 degrees.',
        ];
    }

    /**
     * Get custom attributes for validator errors.
     */
    public function attributes(): array
    {
        return [
            'metadata.battery_level' => 'battery level',
            'metadata.network_type' => 'network type',
            'metadata.app_version' => 'app version',
        ];
    }
}