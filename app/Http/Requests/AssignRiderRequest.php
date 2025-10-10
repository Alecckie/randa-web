<?php

// app/Http/Requests/AssignRiderRequest.php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use App\Models\Rider;
use App\Models\Helmet;
use App\Models\CampaignAssignment;

class AssignRiderRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        
        return $this->user()->role === 'admin' || 
               ($this->user()->role === 'advertiser' && 
                $this->route('campaign')->advertiser_id === $this->user()->advertiser->id);
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'rider_id' => [
                'required',
                'integer',
                'exists:riders,id',
                function ($attribute, $value, $fail) {
                    $rider = Rider::find($value);
                    
                    if (!$rider) {
                        $fail('The selected rider does not exist.');
                        return;
                    }

                    if ($rider->status !== 'approved') {
                        $fail('The selected rider is not approved.');
                        return;
                    }

                    $existingAssignment = CampaignAssignment::where('campaign_id', $this->route('campaign')->id)
                        ->where('rider_id', $value)
                        ->where('status', 'active')
                        ->exists();

                    if ($existingAssignment) {
                        $fail('This rider is already assigned to the campaign.');
                    }
                },
            ],
            'helmet_id' => [
                'required',
                'integer',
                'exists:helmets,id',
                function ($attribute, $value, $fail) {
                    $existingAssignment = CampaignAssignment::where('helmet_id', $value)
                        ->where('status', 'active')
                        ->exists();

                    if ($existingAssignment) {
                        $fail('This helmet is already assigned to another campaign.');
                    }
                },
            ],
            'count' => 'sometimes|integer|min:1|max:10',
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'rider_id.required' => 'Please select a rider to assign.',
            'rider_id.exists' => 'The selected rider does not exist.',
            'helmet_id.required' => 'Please select a helmet for assignment.',
            'helmet_id.exists' => 'The selected helmet does not exist.',
            'count.min' => 'Assignment count must be at least 1.',
            'count.max' => 'You can only assign up to 10 riders at once.',
        ];
    }

    /**
     * Handle a failed validation attempt.
     */
    protected function failedValidation(\Illuminate\Contracts\Validation\Validator $validator)
    {
        throw new \Illuminate\Http\Exceptions\HttpResponseException(
            redirect()
                ->back()
                ->withErrors($validator)
                ->withInput()
                ->with('error', 'Failed to assign rider. Please check the form and try again.')
        );
    }
}