<?php

namespace App\Http\Requests\Payment;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Web Payment Request - Session Authentication
 * Advertiser ID is automatically retrieved from authenticated user
 */
class WebInitiatePaymentRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        // User must be authenticated and have an advertiser profile
        return $this->user() && $this->user()->advertiser !== null;
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
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
            'phone_number.required' => 'Phone number is required',
            'phone_number.regex' => 'Phone number must be in format 254XXXXXXXXX or 07XXXXXXXX',
            'amount.required' => 'Payment amount is required',
            'amount.min' => 'Minimum payment amount is KES 1',
            'amount.max' => 'Maximum payment amount is KES 150,000',
            'campaign_id.exists' => 'The selected campaign does not exist',
        ];
    }

    /**
     * Get advertiser ID from authenticated user
     */
    public function getAdvertiserId(): int
    {
        return $this->user()->advertiser->id;
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
            'You must have an advertiser profile to initiate payments.'
        );
    }
}

