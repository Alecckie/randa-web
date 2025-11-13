<?php

namespace App\Http\Requests\Payment;

use Illuminate\Foundation\Http\FormRequest;


class QueryPaymentStatusRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'checkout_request_id' => [
                'required',
                'string',
                'min:10',
                'max:100'
            ]
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'checkout_request_id.required' => 'Checkout request ID is required',
            'checkout_request_id.string' => 'Invalid checkout request ID format',
        ];
    }
}
