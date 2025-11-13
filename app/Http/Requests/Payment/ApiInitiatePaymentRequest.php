<?php

namespace App\Http\Requests\Payment;

use Illuminate\Foundation\Http\FormRequest;

class ApiInitiatePaymentRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        // User must be authenticated
        if (!$this->user()) {
            return false;
        }

        // If advertiser_id is provided, verify it belongs to the authenticated user
        if ($this->has('advertiser_id')) {
            return $this->user()->advertiser 
                && (int)$this->user()->advertiser->id === (int)$this->input('advertiser_id');
        }

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
                'exists:advertisers,id'
            ],
            'phone_number' => [
                'required',
                'string',
                'regex:/^(254|0)?[17]\d{8}$/'
            ],
            'amount' => [
                'required',
                'numeric',
                'min:1',
                'max:150000'
            ],
            'campaign_id' => [
                'nullable',
                'integer',
                'exists:campaigns,id'
            ],
            'campaign_data' => [
                'nullable',
                'array'
            ],
            'campaign_data.name' => [
                'nullable',
                'string',
                'max:255'
            ],
            'campaign_data.helmet_count' => [
                'nullable',
                'integer',
                'min:1',
                'max:10000'
            ],
            'campaign_data.duration' => [
                'nullable',
                'integer',
                'min:1',
                'max:365'
            ],
            'description' => [
                'nullable',
                'string',
                'max:500'
            ]
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'advertiser_id.required' => 'Advertiser ID is required',
            'advertiser_id.exists' => 'The selected advertiser does not exist',
            'phone_number.required' => 'Phone number is required',
            'phone_number.regex' => 'Phone number must be in format 254XXXXXXXXX or 07XXXXXXXX',
            'amount.required' => 'Payment amount is required',
            'amount.min' => 'Minimum payment amount is KES 1',
            'amount.max' => 'Maximum payment amount is KES 150,000',
            'campaign_id.exists' => 'The selected campaign does not exist',
        ];
    }

    /**
     * Get advertiser ID from request
     */
    public function getAdvertiserId(): int
    {
        return (int)$this->input('advertiser_id');
    }

    /**
     * Get custom attributes for validator errors.
     */
    public function attributes(): array
    {
        return [
            'phone_number' => 'M-Pesa phone number',
            'campaign_data.name' => 'campaign name',
            'campaign_data.helmet_count' => 'helmet count',
            'campaign_data.duration' => 'campaign duration',
        ];
    }

    /**
     * Handle a failed authorization attempt.
     */
    protected function failedAuthorization(): void
    {
        throw new \Illuminate\Auth\Access\AuthorizationException(
            'You are not authorized to make payments for this advertiser.'
        );
    }
}