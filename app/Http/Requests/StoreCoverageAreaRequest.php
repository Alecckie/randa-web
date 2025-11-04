<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCoverageAreaRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // Adjust based on your authorization logic
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('coverage_areas', 'name')
                    ->where(function ($query) {
                        return $query->where('county_id', $this->county_id)
                            ->where('sub_county_id', $this->sub_county_id)
                            ->where('ward_id', $this->ward_id);
                    })
            ],
            'county_id' => [
                'required',
                'integer',
                Rule::exists('counties', 'id')
            ],
            'sub_county_id' => [
                'nullable',
                'integer',
                Rule::exists('sub_counties', 'id')
                    ->where('county_id', $this->county_id)
            ],
            'ward_id' => [
                'nullable',
                'integer',
                Rule::exists('wards', 'id')
                    ->where('sub_county_id', $this->sub_county_id)
            ],
        ];
    }

    /**
     * Get custom validation messages.
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Coverage area name is required.',
            'name.unique' => 'A coverage area with this name already exists in the selected location.',
            'county_id.required' => 'Please select a county.',
            'county_id.exists' => 'The selected county is invalid.',
            'sub_county_id.exists' => 'The selected sub-county is invalid or does not belong to the selected county.',
            'ward_id.exists' => 'The selected ward is invalid or does not belong to the selected sub-county.',
        ];
    }

    /**
     * Get custom attributes for validator errors.
     */
    public function attributes(): array
    {
        return [
            'county_id' => 'county',
            'sub_county_id' => 'sub-county',
            'ward_id' => 'ward',
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        // Convert empty strings to null for nullable fields
        $this->merge([
            'sub_county_id' => $this->sub_county_id ?: null,
            'ward_id' => $this->ward_id ?: null,
        ]);
    }
}