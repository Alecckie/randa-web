<?php

namespace App\Http\Requests;

use App\Models\Helmet;
use Illuminate\Foundation\Http\FormRequest;

class SubmitSelfieRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // Accepts either the scanned qr_code or the typed helmet_code —
            // see Helmet::findByScanOrCode.
            'qr_code'   => [
                'required',
                'string',
                function (string $attribute, mixed $value, \Closure $fail) {
                    if (!Helmet::findByScanOrCode($value)) {
                        $fail('The scanned QR code does not match any registered helmet.');
                    }
                },
            ],
            'latitude'  => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
        ];
    }

    public function messages(): array
    {
        return [
            'qr_code.required' => 'A QR code is required.',
            'latitude.required'  => 'GPS latitude is required.',
            'latitude.between'   => 'Latitude must be between -90 and 90.',
            'longitude.required' => 'GPS longitude is required.',
            'longitude.between'  => 'Longitude must be between -180 and 180.',
        ];
    }
}