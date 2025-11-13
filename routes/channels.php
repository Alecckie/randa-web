<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

/**
 * Payment channel - Advertisers can only listen to their own payment updates
 */
Broadcast::channel('payment.{advertiserId}', function ($user, $advertiserId) {
    // Allow if user has an advertiser and the advertiser ID matches
    return $user && $user->advertiser && (int) $user->advertiser->id === (int) $advertiserId;
});
