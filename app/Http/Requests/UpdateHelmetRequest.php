<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateHelmetRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        $helmet = $this->route('helmet');
        $helmetId = $helmet instanceof \App\Models\Helmet ? $helmet->id : $helmet;

        return [
            'helmet_code' => [
                'required',
                'string',
                'max:255',
                'regex:/^[A-Z0-9_-]+$/',
                Rule::unique('helmets', 'helmet_code')->ignore($helmetId),
            ],
            'qr_code' => [
                'nullable',
                'string',
                'max:255',
                Rule::unique('helmets', 'qr_code')->ignore($helmetId),
            ],
            'status' => [
                'required',
                Rule::in(['available', 'assigned', 'maintenance', 'retired']),
            ],
            'current_branding' => [
                'nullable',
                'string',
                'max:255',
            ],
        ];
    }

    /**
     * Get custom error messages for validation rules.
     */
    public function messages(): array
    {
        return [
            'helmet_code.required' => 'Helmet code is required.',
            'helmet_code.unique'   => 'This helmet code is already taken by another helmet.',
            'helmet_code.regex'    => 'Helmet code must only contain uppercase letters, numbers, underscores, and hyphens.',
            'qr_code.unique'       => 'This QR code is already assigned to another helmet.',
            'status.required'      => 'Status is required.',
            'status.in'            => 'Invalid status selected.',
        ];
    }

    /**
     * Get custom attributes for validator errors.
     */
    public function attributes(): array
    {
        return [
            'helmet_code'      => 'helmet code',
            'qr_code'          => 'QR code',
            'current_branding' => 'current branding',
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        if ($this->has('helmet_code')) {
            $this->merge([
                'helmet_code' => strtoupper($this->helmet_code),
            ]);
        }
    }
}