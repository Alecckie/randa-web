<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAdvertiserProfileRequest extends FormRequest
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
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'user_id' => 'required',
            'integer',
            'exists:users,id',
            Rule::unique('riders', 'user_id'),
            'company_name' => 'required|string|max:255',
            'business_registration' => 'nullable|string|max:255',
            'address' => 'required|string|max:1000',
            'status' => 'sometimes|in:pending,approved,rejected',
        ];
    }

    public function messages(): array
    {
        return [
            'company_name.required' => 'Company name is required.',
            'company_name.max' => 'Company name cannot exceed 255 characters.',
            'address.required' => 'Company address is required.',
            'address.max' => 'Address cannot exceed 1000 characters.',
            'user_id.exists' => 'Selected user does not exist.',
            'user_id.unique' => 'This user already has an advertiser profile.',
            'business_registration.max' => 'Business registration cannot exceed 255 characters.',
        ];
    }

    public function attributes(): array
    {
        return [
            'company_name' => 'company name',
            'business_registration' => 'business registration number',
            'address' => 'company address',
        ];
    }

   
}
