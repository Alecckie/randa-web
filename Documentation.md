# M-Pesa Payment Integration - Installation Guide

## 📋 Prerequisites


- Laravel Reverb installed
- Laravel Echo installed on frontend(installed already just run npm install)
- M-Pesa Daraja API credentials

---

# Backend Setup

### Step 1: Install Required Packages

```bash

composer install


# Install Laravel Reverb (if not already installed)
php artisan install:broadcasting


### Step 6: Configure Environment Variables

Add these to your `.env` file:

```env
# M-Pesa Configuration
MPESA_ENVIRONMENT=sandbox
MPESA_CONSUMER_KEY=your_consumer_key_here
MPESA_CONSUMER_SECRET=your_consumer_secret_here
MPESA_BUSINESS_SHORT_CODE=174379
MPESA_PASSKEY=your_passkey_here
MPESA_CALLBACK_URL="${APP_URL}/api/mpesa/callback"  # APP_URL is ngrok url
MPESA_TIMEOUT_URL="${APP_URL}/api/mpesa/timeout" # Remains the same



# Broadcasting - Will be updated by this command php artisan install:broadcasting
BROADCAST_CONNECTION=reverb
REVERB_APP_ID=your_app_id
REVERB_APP_KEY=your_app_key
REVERB_APP_SECRET=your_app_secret
REVERB_HOST=localhost
REVERB_PORT=8080
REVERB_SCHEME=http

# Will be updated by this command php artisan install:broadcasting

VITE_REVERB_APP_KEY=ucqyo5etsfynwullgwyw
VITE_REVERB_HOST=localhost
VITE_REVERB_PORT=8080
VITE_REVERB_SCHEME=http

### Step 7: Run Migrations

```bash
php artisan migrate

### Step 9: Start Laravel Reverb -- run this before initiating stk push payments

```bash
php artisan reverb:start