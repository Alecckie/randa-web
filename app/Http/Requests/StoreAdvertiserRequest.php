<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAdvertiserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'user_id' => [
                'nullable',
                'exists:users,id',
                Rule::unique('advertisers', 'user_id')->ignore($this->advertiser),
            ],
            'first_name' => 'required_without:user_id|string|max:255',
            'last_name' => 'required_without:user_id|string|max:255',
            'email' => [
                'required_without:user_id',
                'email',
                'max:255',
                Rule::unique('users', 'email')->when($this->user_id, function ($query) {
                    return $query->where('id', '!=', $this->user_id);
                }),
            ],
            'phone' => 'required_without:user_id|string|max:20|regex:/^254[0-9]{9}$/',
            'company_name' => 'required|string|max:255',
            'business_registration' => 'nullable|string|max:255',
            'address' => 'required|string|max:1000',
            'status' => 'sometimes|in:pending,approved,rejected',
        ];
    }

    public function messages(): array
    {
        return [
            'first_name.required_without' => 'First name is required when creating a new user.',
            'first_name.max' => 'First name cannot exceed 255 characters.',
            'last_name.required_without' => 'Last name is required when creating a new user.',
            'last_name.max' => 'Last name cannot exceed 255 characters.',
            'email.required_without' => 'Email is required when creating a new user.',
            'email.email' => 'Please provide a valid email address.',
            'email.unique' => 'This email is already registered.',
            'phone.required_without' => 'Phone number is required when creating a new user.',
            'phone.regex' => 'Phone number must be in format 254XXXXXXXXX.',
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
            'user_id' => 'user',
            'first_name' => 'first name',
            'last_name' => 'last name',
            'email' => 'email address',
            'phone' => 'phone number',
            'company_name' => 'company name',
            'business_registration' => 'business registration number',
            'address' => 'company address',
        ];
    }

    protected function prepareForValidation(): void
    {
        // Clean up phone number format
        if ($this->has('phone') && $this->phone) {
            $phone = preg_replace('/[^0-9]/', '', $this->phone);
            
            // Convert local format to international
            if (strlen($phone) === 9 && substr($phone, 0, 1) === '7') {
                $phone = '254' . $phone;
            } elseif (strlen($phone) === 10 && substr($phone, 0, 2) === '07') {
                $phone = '254' . substr($phone, 1);
            }
            
            $this->merge(['phone' => $phone]);
        }

        // Set default status if not provided
        if (!$this->has('status')) {
            $this->merge(['status' => 'pending']);
        }
    }
}