<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

/**
 * Payment channel - Advertisers can only listen to their own payment updates
 */
Broadcast::channel('payment.{advertiserId}', function ($user, $advertiserId) {
    return $user && $user->advertiser && (int) $user->advertiser->id === (int) $advertiserId;
});

/**
 * Campaign channel - used for live GPS heatmap and tracking updates.
 * Admin can subscribe to any campaign.
 * Advertiser can only subscribe to campaigns that belong to them.
 */
Broadcast::channel('campaign.{campaignId}', function ($user, $campaignId) {
    if (!$user) {
        return false;
    }

    if ($user->role === 'admin') {
        return true;
    }

    if ($user->role === 'advertiser' && $user->advertiser) {
        return \App\Models\Campaign::where('id', $campaignId)
            ->where('advertiser_id', $user->advertiser->id)
            ->exists();
    }

    return false;
});
