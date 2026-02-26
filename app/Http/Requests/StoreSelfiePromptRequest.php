<?php


namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class StoreSelfiePromptRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; 
    }

    public function rules(): array
    {
        return [
            'device_token' => ['nullable', 'string', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [];
    }
}