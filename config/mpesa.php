<?php

return [

    /*
    |--------------------------------------------------------------------------
    | M-Pesa Environment
    |--------------------------------------------------------------------------
    |
    | This value determines the M-Pesa environment to use.
    | Options: 'sandbox', 'production'
    |
    */
    'environment' => env('MPESA_ENVIRONMENT', 'sandbox'),

    /*
    |--------------------------------------------------------------------------
    | M-Pesa Consumer Key
    |--------------------------------------------------------------------------
    |
    | Your M-Pesa application consumer key
    |
    */
    'consumer_key' => env('MPESA_CONSUMER_KEY'),

    /*
    |--------------------------------------------------------------------------
    | M-Pesa Consumer Secret
    |--------------------------------------------------------------------------
    |
    | Your M-Pesa application consumer secret
    |
    */
    'consumer_secret' => env('MPESA_CONSUMER_SECRET'),

    /*
    |--------------------------------------------------------------------------
    | M-Pesa Business Short Code
    |--------------------------------------------------------------------------
    |
    | Your M-Pesa paybill or till number
    |
    */
    'business_short_code' => env('MPESA_BUSINESS_SHORT_CODE'),

    /*
    |--------------------------------------------------------------------------
    | M-Pesa Passkey
    |--------------------------------------------------------------------------
    |
    | Your M-Pesa passkey for generating the password
    |
    */
    'passkey' => env('MPESA_PASSKEY'),

    /*
    |--------------------------------------------------------------------------
    | M-Pesa API URLs
    |--------------------------------------------------------------------------
    |
    | M-Pesa API endpoints based on environment
    |
    */
    'api_url' => env('MPESA_ENVIRONMENT', 'sandbox') === 'production'
        ? 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
        : 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',

    'token_url' => env('MPESA_ENVIRONMENT', 'sandbox') === 'production'
        ? 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
        : 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',

    'query_url' => env('MPESA_ENVIRONMENT', 'sandbox') === 'production'
        ? 'https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query'
        : 'https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query',

    /*
    |--------------------------------------------------------------------------
    | M-Pesa Callback URL
    |--------------------------------------------------------------------------
    |
    | The URL where M-Pesa will send payment notifications
    |
    */
    'callback_url' => env('MPESA_CALLBACK_URL', env('APP_URL') . '/api/mpesa/callback'),

    /*
    |--------------------------------------------------------------------------
    | M-Pesa Timeout URL
    |--------------------------------------------------------------------------
    |
    | The URL where M-Pesa will send timeout notifications
    |
    */
    'timeout_url' => env('MPESA_TIMEOUT_URL', env('APP_URL') . '/api/mpesa/timeout'),

];