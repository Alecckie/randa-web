<?php
namespace App\Http\Requests\Api\Auth;

use App\Http\Requests\Api\BaseApiRequest;
use App\Models\User;
use Illuminate\Validation\Rules;

class RegisterRequest extends BaseApiRequest
{
    public function rules(): array
    {
        return [
            'first_name' => [
                'nullable',
                'string',
                'max:255',
                'regex:/^[a-zA-Z\s]+$/', 
            ],
            'last_name' => [
                'nullable',
                'string',
                'max:255',
                'regex:/^[a-zA-Z\s]+$/', 
            ],
            
            'email' => [
                'required',
                'string',
                'lowercase',
                'email',
                'max:255',
                'unique:' . User::class,
            ],
            'password' => [
                'required',
                Rules\Password::defaults(),
            ],
            'role' => [
                'required',
                'in:admin,rider,advertiser',
            ],
            'phone' => [
                'nullable',
                'string',
                'max:15',
                'regex:/^[\+]?[0-9\-\(\)\s]+$/', 
            ],
        ];
    }

    public function messages(): array
    {
        return [
            // 'name.required' => 'Full name is required.',
            // 'name.min' => 'Name must be at least 2 characters long.',
            'email.required' => 'Email address is required.',
            'email.email' => 'Please provide a valid email address.',
            'email.unique' => 'This email address is already registered.',
            'password.required' => 'Password is required.',
            'role.required' => 'User role is required.',
            'role.in' => 'Invalid user role. Must be admin, rider, or advertiser.',
            'phone.regex' => 'Please provide a valid phone number.',
            'first_name.regex' => 'First name can only contain letters and spaces.',
            'last_name.regex' => 'Last name can only contain letters and spaces.',
        ];
    }

    /**
     * Get custom attributes for validator errors.
     */
    public function attributes(): array
    {
        return [
            'first_name' => 'first name',
            'last_name' => 'last name',
            'email' => 'email address',
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        // Trim whitespace and ensure consistent formatting
        $this->merge([
            // 'name' => trim($this->name ?? ''),
            'first_name' => trim($this->first_name ?? ''),
            'last_name' => trim($this->last_name ?? ''),
            'phone' => $this->phone ? preg_replace('/[^\d\+\-\(\)\s]/', '', $this->phone) : null,
        ]);
    }
}