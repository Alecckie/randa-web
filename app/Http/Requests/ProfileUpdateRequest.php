<?php

namespace App\Http\Requests;

use App\Http\Requests\Api\BaseApiRequest;
use Illuminate\Validation\Rule;

class ProfileUpdateRequest extends BaseApiRequest
{
     public function rules(): array
    {
        return [
            'first_name' => [
                'sometimes',
                'nullable',
                'string',
                'max:255',
                'regex:/^[a-zA-Z\s]+$/',
            ],
            'last_name' => [
                'sometimes',
                'nullable',
                'string',
                'max:255',
                'regex:/^[a-zA-Z\s]+$/',
            ],
            'name' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                'min:2',
            ],
            'email' => [
                'sometimes',
                'required',
                'string',
                'lowercase',
                'email:rfc,dns',
                'max:255',
                Rule::unique('users')->ignore($this->user()->id),
            ],
            'phone' => [
                'sometimes',
                'nullable',
                'string',
                'max:15',
                'regex:/^[\+]?[0-9\-\(\)\s]+$/',
            ],
            'current_password' => [
                'sometimes',
                'required_with:password',
                'string',
                'current_password',
            ],
            'password' => [
                'sometimes',
                'required',
                'confirmed',
                Rules\Password::defaults(),
                'different:current_password',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Full name is required.',
            'name.min' => 'Name must be at least 2 characters long.',
            'email.required' => 'Email address is required.',
            'email.email' => 'Please provide a valid email address.',
            'email.unique' => 'This email address is already taken.',
            'phone.regex' => 'Please provide a valid phone number.',
            'current_password.required_with' => 'Current password is required when changing password.',
            'current_password.current_password' => 'Current password is incorrect.',
            'password.confirmed' => 'Password confirmation does not match.',
            'password.different' => 'New password must be different from current password.',
            'first_name.regex' => 'First name can only contain letters and spaces.',
            'last_name.regex' => 'Last name can only contain letters and spaces.',
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('name')) {
            $this->merge(['name' => trim($this->name)]);
        }
        
        if ($this->has('first_name')) {
            $this->merge(['first_name' => trim($this->first_name ?? '')]);
        }
        
        if ($this->has('last_name')) {
            $this->merge(['last_name' => trim($this->last_name ?? '')]);
        }
        
        if ($this->has('phone')) {
            $this->merge(['phone' => $this->phone ? preg_replace('/[^\d\+\-\(\)\s]/', '', $this->phone) : null]);
        }
    }
}
