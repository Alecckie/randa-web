<?php

namespace App\Http\Requests;

use App\Http\Requests\Api\BaseApiRequest;
use Illuminate\Validation\Rules;

class UpdatePasswordRequest extends BaseApiRequest
{
    public function rules(): array
    {
        return [
            'current_password' => [
                'required',
                'string',
                'current_password',
            ],
            'password' => [
                'required',
                'string',
                'confirmed',
                'different:current_password',
                Rules\Password::defaults(),
            ],
            'password_confirmation' => [
                'required',
                'string',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'current_password.required' => 'Current password is required.',
            'current_password.current_password' => 'Current password is incorrect.',
            'password.required' => 'New password is required.',
            'password.confirmed' => 'Password confirmation does not match.',
            'password.different' => 'New password must be different from your current password.',
            'password_confirmation.required' => 'Please confirm your new password.',
        ];
    }
}