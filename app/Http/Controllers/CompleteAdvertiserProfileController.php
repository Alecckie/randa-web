<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreAdvertiserProfileRequest;
use App\Services\AdvertiserService;
use Illuminate\Http\Request;

class CompleteAdvertiserProfileController extends Controller
{
    /**
     * Handle the incoming request.
     */
    public function __invoke(StoreAdvertiserProfileRequest $request,AdvertiserService $advertiser_service)
    {
        $data = $request->validated();
        try {
           $advertiser_service->createAdvertiserProfile($data);
             return redirect()
                ->route('advert-dash.index')
                ->with('success', 'Profile Successfully Completed.');
        }
        catch (\Exception $e)
        {
            return redirect()
                ->back()
                ->withInput()
                ->with('error', 'Failed to create profile. Please try again.');
        }
    }
}
