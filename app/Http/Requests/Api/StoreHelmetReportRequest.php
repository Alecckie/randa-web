<?php



namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class StoreHelmetReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'helmet_image'       => ['required', 'image', 'mimes:jpeg,jpg,png', 'max:10240'],
            'status_description' => ['required', 'string', 'min:10', 'max:2000'],
            'priority_level'     => ['required', 'string', 'in:low,medium,high'],
        ];
    }

    public function messages(): array
    {
        return [
            'helmet_image.required'       => 'A helmet image is required.',
            'helmet_image.image'          => 'The uploaded file must be an image.',
            'helmet_image.mimes'          => 'Only JPEG and PNG images are accepted.',
            'helmet_image.max'            => 'The helmet image must not exceed 10 MB.',
            'status_description.required' => 'Please describe the helmet issue.',
            'status_description.min'      => 'The description must be at least 10 characters.',
            'priority_level.required'     => 'Please select a priority level.',
            'priority_level.in'           => 'Priority level must be low, medium, or high.',
        ];
    }
}