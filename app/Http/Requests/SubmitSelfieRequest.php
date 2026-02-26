<?php
namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class SubmitSelfieRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'selfie_image' => ['required', 'image', 'mimes:jpeg,jpg,png', 'max:10240'],
            'latitude'     => ['required', 'numeric', 'between:-90,90'],
            'longitude'    => ['required', 'numeric', 'between:-180,180'],
        ];
    }

    public function messages(): array
    {
        return [
            'selfie_image.required' => 'A selfie image is required.',
            'selfie_image.image'    => 'The uploaded file must be an image.',
            'selfie_image.mimes'    => 'Only JPEG and PNG images are accepted.',
            'selfie_image.max'      => 'The selfie image must not exceed 10 MB.',
            'latitude.required'     => 'GPS latitude is required.',
            'latitude.between'      => 'Latitude must be between -90 and 90.',
            'longitude.required'    => 'GPS longitude is required.',
            'longitude.between'     => 'Longitude must be between -180 and 180.',
        ];
    }
}