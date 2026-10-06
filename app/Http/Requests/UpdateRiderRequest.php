<?php

namespace App\Http\Requests;

use App\Support\PhoneNumber;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateRiderRequest extends FormRequest
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
     * Deliberately excludes wallet_balance, status, and signed_agreement —
     * those are managed by the payout service, the approve/reject workflow,
     * and the original consent record respectively, not a generic edit form.
     */
    public function rules(): array
    {
        $rider = $this->route('rider');

        return [
            'firstname' => ['required', 'string', 'max:255', 'regex:/^[a-zA-Z\s]+$/'],
            'lastname' => ['required', 'string', 'max:255', 'regex:/^[a-zA-Z\s]+$/'],
            'email' => [
                'required',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($rider->user_id),
            ],
            'phone' => [
                'required',
                'string',
                'regex:/^254[0-9]{9}$/',
                Rule::unique('users', 'phone')->ignore($rider->user_id),
            ],
            'national_id' => [
                'required',
                'string',
                'max:20',
                'regex:/^[0-9]+$/',
                Rule::unique('riders', 'national_id')->ignore($rider->id),
            ],
            'mpesa_number' => [
                'required',
                'string',
                'regex:/^254[0-9]{9}$/',
                Rule::unique('riders', 'mpesa_number')->ignore($rider->id),
            ],
            'next_of_kin_name' => ['required', 'string', 'max:255', 'regex:/^[a-zA-Z\s]+$/'],
            'next_of_kin_phone' => ['required', 'string', 'regex:/^254[0-9]{9}$/'],
            'daily_rate' => ['sometimes', 'numeric', 'min:0', 'max:10000'],

            // Document re-uploads are optional on edit — omit to keep the
            // existing file.
            'national_id_front_photo' => ['sometimes', 'nullable', 'image', 'mimes:jpeg,png,jpg', 'max:5120'],
            'national_id_back_photo' => ['sometimes', 'nullable', 'image', 'mimes:jpeg,png,jpg', 'max:5120'],
            'passport_photo' => ['sometimes', 'nullable', 'image', 'mimes:jpeg,png,jpg', 'max:2048'],
            'good_conduct_certificate' => ['sometimes', 'nullable', 'file', 'mimes:jpeg,png,jpg,pdf', 'max:10240'],
            'motorbike_license' => ['sometimes', 'nullable', 'file', 'mimes:jpeg,png,jpg,pdf', 'max:5120'],
            'motorbike_registration' => ['sometimes', 'nullable', 'file', 'mimes:jpeg,png,jpg,pdf', 'max:5120'],
        ];
    }

    public function messages(): array
    {
        return [
            'firstname.required' => 'First name is required.',
            'firstname.regex' => 'First name must contain only letters and spaces.',
            'lastname.required' => 'Last name is required.',
            'lastname.regex' => 'Last name must contain only letters and spaces.',
            'email.required' => 'Email address is required.',
            'email.unique' => 'This email address is already registered to another account.',
            'phone.required' => 'Phone number is required.',
            'phone.regex' => 'Phone number must be in format 254xxxxxxxxx.',
            'phone.unique' => 'This phone number is already registered to another account.',
            'national_id.required' => 'National ID number is required.',
            'national_id.regex' => 'National ID must contain only numbers.',
            'national_id.unique' => 'This National ID is already registered to another rider.',
            'mpesa_number.required' => 'M-Pesa number is required.',
            'mpesa_number.regex' => 'M-Pesa number must be in format 254xxxxxxxxx.',
            'mpesa_number.unique' => 'This M-Pesa number is already registered to another rider.',
            'next_of_kin_name.required' => 'Next of kin name is required.',
            'next_of_kin_phone.required' => 'Next of kin phone number is required.',
            'next_of_kin_phone.regex' => 'Next of kin phone number must be in format 254xxxxxxxxx.',
            'daily_rate.numeric' => 'Daily rate must be a valid number.',
            'daily_rate.min' => 'Daily rate cannot be negative.',
            'daily_rate.max' => 'Daily rate cannot exceed 10,000.',
        ];
    }

    public function attributes(): array
    {
        return [
            'firstname' => 'first name',
            'lastname' => 'last name',
            'email' => 'email address',
            'phone' => 'phone number',
            'national_id' => 'national ID',
            'mpesa_number' => 'M-Pesa number',
            'next_of_kin_name' => 'next of kin name',
            'next_of_kin_phone' => 'next of kin phone',
            'daily_rate' => 'daily rate',
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'phone' => PhoneNumber::normalizeKenyan($this->phone),
            'mpesa_number' => PhoneNumber::normalizeKenyan($this->mpesa_number),
            'next_of_kin_phone' => PhoneNumber::normalizeKenyan($this->next_of_kin_phone),
        ]);
    }
}
