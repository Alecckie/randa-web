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
            'advertiser_id' => [
                'required',
                'integer',
                'exists:advertisers,user_id'
            ],
            'payment_id' => [
                'nullable',
                'integer',
                'exists:payments,id'
            ],
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
                'after_or_equal:start_date'
            ],
            'coverage_area_ids' => [
                'required',
                'array',
                'min:1'
            ],
            'coverage_area_ids.*' => [
                'required',
                'integer',
                'exists:coverage_areas,id'
            ],
            'helmet_count' => [
                'required',
                'integer',
                'min:1',
                'max:10000'
            ],
            
            'need_design' => [
                'boolean'
            ],
            'design_file' => [
                'nullable',
                'file',
                'mimes:jpg,jpeg,png,pdf,ai,psd',
                'max:10240', // 10MB
                Rule::requiredIf(!$this->boolean('need_design'))
            ],
            'design_requirements' => [
                'nullable',
                'string',
                'max:2000',
                Rule::requiredIf($this->boolean('need_design'))
            ],
            
            'business_type' => [
                'nullable',
                'string',
                'max:100'
            ],
            
            'rider_demographics' => [
                'nullable',
                'array'
            ],
            'rider_demographics.age_groups' => [
                'nullable',
                'array'
            ],
            'rider_demographics.age_groups.*' => [
                'string',
                Rule::in(['18-25', '26-35', '36-45', '46-55', '55+'])
            ],
            'rider_demographics.genders' => [
                'nullable',
                'array'
            ],
            'rider_demographics.genders.*' => [
                'string',
                Rule::in(['male', 'female', 'any'])
            ],
            'rider_demographics.rider_types' => [
                'nullable',
                'array'
            ],
            'rider_demographics.rider_types.*' => [
                'string',
                Rule::in(['courier', 'boda', 'delivery', 'taxi'])
            ],
            
            'require_vat_receipt' => [
                'boolean'
            ],
            
            'special_instructions' => [
                'nullable',
                'string',
                'max:2000'
            ],
            
            'agree_to_terms' => [
                'required',
                'accepted'
            ],
            
            'status' => [
                'sometimes',
                'string',
                Rule::in(['draft', 'pending_payment', 'paid', 'active', 'paused', 'completed', 'cancelled'])
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
            'advertiser_id.exists' => 'The selected advertiser is invalid.',
            'name.required' => 'Campaign name is required.',
            'name.min' => 'Campaign name must be at least 3 characters.',
            'name.max' => 'Campaign name cannot exceed 255 characters.',
            
            'start_date.required' => 'Start date is required.',
            'start_date.after_or_equal' => 'Start date cannot be in the past.',
            'end_date.required' => 'End date is required.',
            'end_date.after' => 'End date must be after start date.',
            
            'coverage_area_ids.required' => 'Please select at least one coverage area.',
            'coverage_area_ids.min' => 'Please select at least one coverage area.',
            'coverage_area_ids.*.exists' => 'One or more selected coverage areas are invalid.',
            
            'helmet_count.required' => 'Number of helmets is required.',
            'helmet_count.min' => 'At least 1 helmet is required.',
            'helmet_count.max' => 'Maximum 10,000 helmets allowed.',
            
            'design_file.required_unless' => 'Please upload a design file or request design services.',
            'design_file.mimes' => 'Design file must be: JPG, JPEG, PNG, PDF, AI, or PSD.',
            'design_file.max' => 'Design file cannot exceed 10MB.',
            'design_requirements.required_if' => 'Please describe your design requirements.',
            
            'agree_to_terms.required' => 'You must agree to the terms and conditions.',
            'agree_to_terms.accepted' => 'You must accept the terms and conditions.',
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
            'coverage_area_ids' => 'coverage areas',
            'helmet_count' => 'number of helmets',
            'need_design' => 'design service requirement',
            'design_file' => 'design file',
            'design_requirements' => 'design requirements',
            'require_vat_receipt' => 'VAT receipt requirement',
            'agree_to_terms' => 'terms and conditions',
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

                // Minimum duration validation (at least 1 day)
                if (($endDate - $startDate) < 0) {
                    $validator->errors()->add('end_date', 'Campaign must run for at least 1 day.');
                }
            }

            // Validate design requirements
            if (!$this->boolean('need_design') && !$this->hasFile('design_file')) {
                $validator->errors()->add('design_file', 'Please upload a design file or request our design services.');
            }

            // Validate rider demographics structure
            if ($this->has('rider_demographics') && is_array($this->rider_demographics)) {
                $demographics = $this->rider_demographics;
                
                // Validate each demographic array
                foreach (['age_groups', 'genders', 'rider_types'] as $field) {
                    if (isset($demographics[$field]) && !is_array($demographics[$field])) {
                        $validator->errors()->add("rider_demographics.{$field}", "The {$field} must be an array.");
                    }
                }
            }
        });
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation()
    {
        // Ensure boolean fields are properly cast
        $this->merge([
            'need_design' => $this->boolean('need_design'),
            'require_vat_receipt' => $this->boolean('require_vat_receipt'),
            'agree_to_terms' => $this->boolean('agree_to_terms'),
        ]);

        // Ensure coverage_area_ids are integers
        if ($this->has('coverage_area_ids') && is_array($this->coverage_area_ids)) {
            $this->merge([
                'coverage_area_ids' => array_map('intval', $this->coverage_area_ids)
            ]);
        }

        // Clean up rider demographics
        if ($this->has('rider_demographics')) {
            $demographics = $this->rider_demographics;
            
            // Ensure each field is an array
            foreach (['age_groups', 'genders', 'rider_types'] as $field) {
                if (!isset($demographics[$field]) || !is_array($demographics[$field])) {
                    $demographics[$field] = [];
                }
            }
            
            $this->merge(['rider_demographics' => $demographics]);
        }
    }
}