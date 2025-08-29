<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRiderRequest extends FormRequest
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
            'firstname' => [
                'required',
                'string',
                'max:255',
                'regex:/^[a-zA-Z\s]+$/',
            ],
            'lastname' => [
                'required',
                'string',
                'max:255',
                'regex:/^[a-zA-Z\s]+$/',
            ],
            'email' => [
                'required',
                'email:rfc,dns',
                'max:255',
                'unique:users,email',
            ],
            'phone' => [
                'required',
                'string',
                'regex:/^254[0-9]{9}$/',
                'unique:users,phone',
            ],
            'user_id' => [
                'sometimes',
                'nullable',
                'integer',
                'exists:users,id',
                Rule::unique('riders', 'user_id'),
            ],
            'national_id' => [
                'required',
                'string',
                'max:20',
                'regex:/^[0-9]+$/',
                'unique:riders,national_id',
            ],
            'national_id_front_photo' => [
                'required',
                'image',
                'mimes:jpeg,png,jpg',
                'max:5120', // 5MB
            ],
            'national_id_back_photo' => [
                'required',
                'image',
                'mimes:jpeg,png,jpg',
                'max:5120', // 5MB
            ],
            'passport_photo' => [
                'required',
                'image',
                'mimes:jpeg,png,jpg',
                'max:2048', // 2MB
            ],
            'good_conduct_certificate' => [
                'required',
                'file',
                'mimes:jpeg,png,jpg,pdf',
                'max:10240', // 10MB
            ],
            'motorbike_license' => [
                'required',
                'file',
                'mimes:jpeg,png,jpg,pdf',
                'max:5120', // 5MB
            ],
            'motorbike_registration' => [
                'required',
                'file',
                'mimes:jpeg,png,jpg,pdf',
                'max:5120', // 5MB
            ],
            'mpesa_number' => [
                'required',
                'string',
                'regex:/^254[0-9]{9}$/',
                'unique:riders,mpesa_number',
            ],
            'next_of_kin_name' => [
                'required',
                'string',
                'max:255',
                'regex:/^[a-zA-Z\s]+$/',
            ],
            'next_of_kin_phone' => [
                'required',
                'string',
                'regex:/^254[0-9]{9}$/',
            ],
            'signed_agreement' => [
                'required',
                'string',
                'min:10',
            ],
            'daily_rate' => [
                'sometimes',
                'numeric',
                'min:0',
                'max:10000',
            ],
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'firstname.required' => 'First name is required.',
            'firstname.regex' => 'First name must contain only letters and spaces.',
            'firstname.max' => 'First name cannot exceed 255 characters.',
            
            'lastname.required' => 'Last name is required.',
            'lastname.regex' => 'Last name must contain only letters and spaces.',
            'lastname.max' => 'Last name cannot exceed 255 characters.',
            
            'email.required' => 'Email address is required.',
            'email.email' => 'Please enter a valid email address.',
            'email.unique' => 'This email address is already registered.',
            'email.max' => 'Email address cannot exceed 255 characters.',
            
            'phone.required' => 'Phone number is required.',
            'phone.regex' => 'Phone number must be in format 254xxxxxxxxx.',
            'phone.unique' => 'This phone number is already registered.',
            
            'user_id.unique' => 'This user already has a rider application.',
            'user_id.exists' => 'The selected user does not exist.',
            
            'national_id.required' => 'National ID number is required.',
            'national_id.regex' => 'National ID must contain only numbers.',
            'national_id.unique' => 'This National ID is already registered.',
            'national_id.max' => 'National ID number cannot exceed 20 characters.',
            
            'national_id_front_photo.required' => 'Front photo of National ID is required.',
            'national_id_front_photo.image' => 'National ID front photo must be an image.',
            'national_id_front_photo.mimes' => 'National ID front photo must be in JPEG, PNG, or JPG format.',
            'national_id_front_photo.max' => 'National ID front photo size cannot exceed 5MB.',
            
            'national_id_back_photo.required' => 'Back photo of National ID is required.',
            'national_id_back_photo.image' => 'National ID back photo must be an image.',
            'national_id_back_photo.mimes' => 'National ID back photo must be in JPEG, PNG, or JPG format.',
            'national_id_back_photo.max' => 'National ID back photo size cannot exceed 5MB.',
            
            'passport_photo.required' => 'Passport photo is required.',
            'passport_photo.image' => 'Passport photo must be an image.',
            'passport_photo.mimes' => 'Passport photo must be in JPEG, PNG, or JPG format.',
            'passport_photo.max' => 'Passport photo size cannot exceed 2MB.',
            
            'good_conduct_certificate.required' => 'Good conduct certificate is required.',
            'good_conduct_certificate.mimes' => 'Good conduct certificate must be in JPEG, PNG, JPG, or PDF format.',
            'good_conduct_certificate.max' => 'Good conduct certificate size cannot exceed 10MB.',
            
            'motorbike_license.required' => 'Motorbike license is required.',
            'motorbike_license.mimes' => 'Motorbike license must be in JPEG, PNG, JPG, or PDF format.',
            'motorbike_license.max' => 'Motorbike license size cannot exceed 5MB.',
            
            'motorbike_registration.required' => 'Motorbike registration is required.',
            'motorbike_registration.mimes' => 'Motorbike registration must be in JPEG, PNG, JPG, or PDF format.',
            'motorbike_registration.max' => 'Motorbike registration size cannot exceed 5MB.',
            
            'mpesa_number.required' => 'M-Pesa number is required.',
            'mpesa_number.regex' => 'M-Pesa number must be in format 254xxxxxxxxx.',
            'mpesa_number.unique' => 'This M-Pesa number is already registered.',
            
            'next_of_kin_name.required' => 'Next of kin name is required.',
            'next_of_kin_name.regex' => 'Next of kin name must contain only letters and spaces.',
            'next_of_kin_name.max' => 'Next of kin name cannot exceed 255 characters.',
            
            'next_of_kin_phone.required' => 'Next of kin phone number is required.',
            'next_of_kin_phone.regex' => 'Next of kin phone number must be in format 254xxxxxxxxx.',
            
            'signed_agreement.required' => 'Signed agreement is required.',
            'signed_agreement.min' => 'Signed agreement must be at least 10 characters long.',
            
            'daily_rate.numeric' => 'Daily rate must be a valid number.',
            'daily_rate.min' => 'Daily rate cannot be negative.',
            'daily_rate.max' => 'Daily rate cannot exceed 10,000.',
        ];
    }

    /**
     * Get custom attributes for validator errors.
     */
    public function attributes(): array
    {
        return [
            'firstname' => 'first name',
            'lastname' => 'last name',
            'email' => 'email address',
            'phone' => 'phone number',
            'user_id' => 'user',
            'national_id' => 'national ID',
            'national_id_front_photo' => 'national ID front photo',
            'national_id_back_photo' => 'national ID back photo',
            'passport_photo' => 'passport photo',
            'good_conduct_certificate' => 'good conduct certificate',
            'motorbike_license' => 'motorbike license',
            'motorbike_registration' => 'motorbike registration',
            'mpesa_number' => 'M-Pesa number',
            'next_of_kin_name' => 'next of kin name',
            'next_of_kin_phone' => 'next of kin phone',
            'signed_agreement' => 'signed agreement',
            'daily_rate' => 'daily rate',
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        // Format phone numbers to include country code if not present
        if ($this->phone && !str_starts_with($this->phone, '254')) {
            if (str_starts_with($this->phone, '0')) {
                $this->merge([
                    'phone' => '254' . substr($this->phone, 1)
                ]);
            }
        }

        if ($this->mpesa_number && !str_starts_with($this->mpesa_number, '254')) {
            if (str_starts_with($this->mpesa_number, '0')) {
                $this->merge([
                    'mpesa_number' => '254' . substr($this->mpesa_number, 1)
                ]);
            }
        }

        if ($this->next_of_kin_phone && !str_starts_with($this->next_of_kin_phone, '254')) {
            if (str_starts_with($this->next_of_kin_phone, '0')) {
                $this->merge([
                    'next_of_kin_phone' => '254' . substr($this->next_of_kin_phone, 1)
                ]);
            }
        }
    }
}