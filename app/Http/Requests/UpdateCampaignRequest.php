<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCampaignRequest extends FormRequest
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
     *
     * Editing is more lenient than creation: fields are only validated
     * when present, since an edit may only touch a subset of the campaign
     * (e.g. renaming it shouldn't require re-uploading a design file).
     */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255', 'min:3'],
            'description' => ['nullable', 'string', 'max:1000'],

            'start_date' => ['sometimes', 'required', 'date'],
            'end_date' => ['sometimes', 'required', 'date', 'after_or_equal:start_date'],

            'coverage_area_ids' => ['sometimes', 'required', 'array', 'min:1'],
            'coverage_area_ids.*' => ['integer', 'exists:coverage_areas,id'],

            'helmet_count' => ['sometimes', 'required', 'integer', 'min:1', 'max:10000'],

            'need_design' => ['boolean'],
            'design_file' => ['nullable', 'file', 'mimes:jpg,jpeg,png,pdf,ai,psd', 'max:10240'],
            'design_requirements' => ['nullable', 'string', 'max:2000'],

            'business_type' => ['nullable', 'string', 'max:100'],

            'rider_demographics' => ['nullable', 'array'],
            'rider_demographics.age_groups' => ['nullable', 'array'],
            'rider_demographics.age_groups.*' => ['string', Rule::in(['18-25', '26-35', '36-45', '46-55', '55+'])],
            'rider_demographics.genders' => ['nullable', 'array'],
            'rider_demographics.genders.*' => ['string', Rule::in(['male', 'female', 'any'])],
            'rider_demographics.rider_types' => ['nullable', 'array'],
            'rider_demographics.rider_types.*' => ['string', Rule::in(['courier', 'boda', 'delivery', 'taxi'])],

            'require_vat_receipt' => ['boolean'],
            'special_instructions' => ['nullable', 'string', 'max:2000'],
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation()
    {
        $this->merge([
            'need_design' => $this->boolean('need_design'),
            'require_vat_receipt' => $this->boolean('require_vat_receipt'),
        ]);

        if ($this->has('coverage_area_ids') && is_array($this->coverage_area_ids)) {
            $this->merge([
                'coverage_area_ids' => array_map('intval', $this->coverage_area_ids),
            ]);
        }
    }
}
