<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCampaignRequest extends FormRequest
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
        return [
           
            'name' => [
                'required',
                'string',
                'max:255',
                'min:3'
            ],
            'description' => [
                'nullable',
                'string',
                'max:1000'
            ],
            'start_date' => [
                'required',
                'date',
                'after_or_equal:today'
            ],
            'end_date' => [
                'required',
                'date',
                'after:start_date'
            ],
            'coverage_areas' => [
                'required',
                'array',
                'min:1'
            ],
            'coverage_areas.*' => [
                'required',
                'string',
                Rule::in([
                    'nairobi_cbd',
                    'westlands',
                    'karen',
                    'kilimani',
                    'parklands',
                    'kasarani',
                    'embakasi',
                    'langata',
                    'dagoretti',
                    'kibra',
                    'roysambu',
                    'mathare'
                ])
            ],
            'helmet_count' => [
                'required',
                'integer',
                'min:1',
                'max:10000'
            ],
            'budget' => [
                'required',
                'numeric',
                'min:100',
                'max:10000000'
            ],
            'status' => [
                'sometimes',
                'string',
                Rule::in(['draft', 'active', 'paused', 'completed', 'cancelled'])
            ]
        ];
    }

    /**
     * Get custom validation messages
     */
    public function messages(): array
    {
        return [
            'advertiser_id.required' => 'Please select an advertiser.',
            'advertiser_id.exists' => 'The selected advertiser must be approved.',
            'name.required' => 'Campaign name is required.',
            'name.min' => 'Campaign name must be at least 3 characters.',
            'start_date.required' => 'Start date is required.',
            'start_date.after_or_equal' => 'Start date cannot be in the past.',
            'end_date.required' => 'End date is required.',
            'end_date.after' => 'End date must be after start date.',
            'coverage_areas.required' => 'Please select at least one coverage area.',
            'coverage_areas.min' => 'Please select at least one coverage area.',
            'coverage_areas.*.in' => 'Invalid coverage area selected.',
            'helmet_count.required' => 'Number of helmets is required.',
            'helmet_count.min' => 'At least 1 helmet is required.',
            'helmet_count.max' => 'Maximum 10,000 helmets allowed.',
            'budget.required' => 'Budget is required.',
            'budget.min' => 'Minimum budget is KES 100.',
            'budget.max' => 'Maximum budget is KES 10,000,000.',
        ];
    }

    /**
     * Get custom attributes for validator errors.
     */
    public function attributes(): array
    {
        return [
            'advertiser_id' => 'advertiser',
            'start_date' => 'start date',
            'end_date' => 'end date',
            'coverage_areas' => 'coverage areas',
            'helmet_count' => 'number of helmets',
        ];
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            // Additional validation for date range
            if ($this->start_date && $this->end_date) {
                $startDate = strtotime($this->start_date);
                $endDate = strtotime($this->end_date);
                $maxDuration = 365 * 24 * 60 * 60; // 1 year in seconds

                if (($endDate - $startDate) > $maxDuration) {
                    $validator->errors()->add('end_date', 'Campaign duration cannot exceed 1 year.');
                }
            }
        });
    }
}