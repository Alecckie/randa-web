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
                    'nairobi_cbd', 'westlands', 'karen', 'kilimani',
                    'parklands', 'kasarani', 'embakasi', 'langata',
                    'dagoretti', 'kibra', 'roysambu', 'mathare'
                ])
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
                'max:10240', 
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
            'target_audience' => [
                'nullable',
                'string',
                'max:1000'
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
            'rider_demographics.gender' => [
                'nullable',
                'array'
            ],
            'rider_demographics.gender.*' => [
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
            'vat_number' => [
                'nullable',
                'string',
                'max:50',
                Rule::requiredIf($this->boolean('require_vat_receipt'))
            ],
            
            'additional_services' => [
                'nullable',
                'array'
            ],
            'additional_services.*' => [
                'string',
                Rule::in(['gps_tracking', 'daily_reports', 'photo_verification', 'custom_analytics'])
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
            
            
            'budget' => [
                'nullable',
                'numeric',
                'min:100',
                'max:10000000'
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
            'name.required' => 'Campaign name is required.',
            'name.min' => 'Campaign name must be at least 3 characters.',
            'name.max' => 'Campaign name cannot exceed 255 characters.',
            
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
            
            'design_file.required_unless' => 'Please upload a design file or request design services.',
            'design_file.mimes' => 'Design file must be: JPG, JPEG, PNG, PDF, AI, or PSD.',
            'design_file.max' => 'Design file cannot exceed 10MB.',
            'design_requirements.required_if' => 'Please describe your design requirements.',
            
           
           
            'billing_address.required' => 'Billing address is required.',
            
            'vat_number.required_if' => 'VAT number is required when requesting VAT receipt.',
            
            'agree_to_terms.required' => 'You must agree to the terms and conditions.',
            'agree_to_terms.accepted' => 'You must accept the terms and conditions.',
            
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
            'start_date' => 'start date',
            'end_date' => 'end date',
            'coverage_areas' => 'coverage areas',
            'helmet_count' => 'number of helmets',
            'need_design' => 'design service requirement',
            'design_file' => 'design file',
            'design_requirements' => 'design requirements',
            // 'contact_person' => 'contact person',
            // 'contact_phone' => 'contact phone',
            // 'contact_email' => 'contact email',
            // 'billing_address' => 'billing address',
            'require_vat_receipt' => 'VAT receipt requirement',
            'vat_number' => 'VAT number',
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

            // Validate VAT number format if provided
            if ($this->vat_number && !preg_match('/^[A-Z0-9]{11}$/', $this->vat_number)) {
                $validator->errors()->add('vat_number', 'VAT number must be 11 characters (letters and numbers only).');
            }

            // Validate phone number format
            if ($this->contact_phone) {
                $cleanPhone = preg_replace('/[^\d+]/', '', $this->contact_phone);
                if (strlen($cleanPhone) < 10 || strlen($cleanPhone) > 15) {
                    $validator->errors()->add('contact_phone', 'Phone number must be between 10-15 digits.');
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

        // Clean and format phone number
        if ($this->contact_phone) {
            $this->merge([
                'contact_phone' => preg_replace('/[^\d+\-\(\)\s]/', '', $this->contact_phone)
            ]);
        }

        // Clean VAT number
        if ($this->vat_number) {
            $this->merge([
                'vat_number' => strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $this->vat_number))
            ]);
        }
    }
}