<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CampaignFilterRequest extends FormRequest
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
            'search' => 'nullable|string|max:255',
            'status' => 'nullable|string|in:draft,pending_payment,paid,active,paused,completed,cancelled',
            'advertiser_id' => 'nullable|integer|exists:advertisers,id',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'payment_status' => 'nullable|string|in:paid,pending,unpaid',
            'coverage_area_ids' => 'nullable|array',
            'coverage_area_ids.*' => 'integer|exists:coverage_areas,id',
            'sort_by' => 'nullable|string|in:created_at,updated_at,start_date,end_date,name',
            'sort_order' => 'nullable|string|in:asc,desc',
            'per_page' => 'nullable|integer|min:5|max:100',
        ];
    }

    /**
     * Prevent advertisers from filtering by other advertisers
     */
    protected function prepareForValidation(): void
    {
        if ($this->user()?->role === 'advertiser') {
            $this->merge([
                'advertiser_id' => null, // Remove advertiser_id filter for advertisers
            ]);
        }
    }
}