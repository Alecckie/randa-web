<?php

namespace App\Http\Requests\Api\Auth;

use App\Http\Requests\Api\BaseApiRequest;
use Illuminate\Auth\Events\Lockout;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use App\Models\User;

class LoginRequest extends BaseApiRequest
{
    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email', 'max:255'],
            'password' => ['required', 'string'],
        ];
    }

    /**
     * Custom messages for better API responses
     */
    public function messages(): array
    {
        return [
            'email.required' => 'Email address is required.',
            'email.email' => 'Please provide a valid email address.',
            'email.max' => 'Email address is too long.',
            'password.required' => 'Password is required.',
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'email' => trim(strtolower($this->email ?? '')),
            'password' => $this->password ?? '',
        ]);
    }

    /**
     * Authenticate user for API (returns user model, doesn't create session)
     * 
     * @return \App\Models\User
     * @throws \Illuminate\Http\Exceptions\HttpResponseException
     */
    public function authenticateForApi(): User
{
    $this->ensureIsNotRateLimited();

    // Use input() or validated() array, not validated('key')
    $email = $this->input('email');
    $password = $this->input('password');

    // DEBUG: Log what we're searching for
    \Log::info('Login attempt', [
        'email' => $email,
        'password_length' => strlen($password),
        'raw_email' => $this->email,
    ]);

    // Find user by email
    $user = User::where('email', $email)->first();

    // DEBUG: Log if user was found
    \Log::info('User lookup', [
        'found' => $user ? 'yes' : 'no',
        'user_email' => $user?->email,
        'user_password_hash' => $user?->password,
    ]);

    if (!$user) {
        \Log::warning('User not found for email: ' . $email);
        RateLimiter::hit($this->throttleKey());

        throw new HttpResponseException(
            response()->json([
                'success' => false,
                'message' => 'Invalid credentials',
                'errors' => ['email' => ['The provided credentials are incorrect.']]
            ], 401)
        );
    }

    // DEBUG: Check password
    $passwordMatches = Hash::check($password, $user->password);
    \Log::info('Password check', [
        'matches' => $passwordMatches,
        'input_password' => $password,
        'hash_in_db' => $user->password,
    ]);

    if (!$passwordMatches) {
        \Log::warning('Password mismatch for user: ' . $user->email);
        RateLimiter::hit($this->throttleKey());

        throw new HttpResponseException(
            response()->json([
                'success' => false,
                'message' => 'Invalid credentials',
                'errors' => ['email' => ['The provided credentials are incorrect.']]
            ], 401)
        );
    }

    // Check if user account is active
    if (!$user->is_active) {
        throw new HttpResponseException(
            response()->json([
                'success' => false,
                'message' => 'Account deactivated',
                'errors' => ['email' => ['Your account has been deactivated.']]
            ], 403)
        );
    }

    RateLimiter::clear($this->throttleKey());

    return $user;
}
    /**
     * Ensure the login request is not rate limited (API version)
     */
    public function ensureIsNotRateLimited(): void
    {
        if (!RateLimiter::tooManyAttempts($this->throttleKey(), 5)) {
            return;
        }

        event(new Lockout($this));

        $seconds = RateLimiter::availableIn($this->throttleKey());

        throw new HttpResponseException(
            response()->json([
                'success' => false,
                'message' => 'Too many login attempts',
                'errors' => [
                    'email' => [trans('auth.throttle', [
                        'seconds' => $seconds,
                        'minutes' => ceil($seconds / 60),
                    ])]
                ]
            ], 429) // Too Many Requests
        );
    }

    /**
     * Get the rate limiting throttle key for the request.
     */
    public function throttleKey(): string
    {
        return Str::transliterate(Str::lower($this->string('email')) . '|' . $this->ip());
    }
}
