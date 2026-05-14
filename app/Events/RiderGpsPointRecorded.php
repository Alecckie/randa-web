<?php

namespace App\Events;

use App\Models\RiderGpsPoint;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Fired every time a rider records a GPS point.
 *
 * Broadcasts on two channels:
 *  - rider-tracking       → public, consumed by admin tracking dashboard
 *  - private-campaign.{id} → private, consumed by the campaign's advertiser
 */
class RiderGpsPointRecorded implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly RiderGpsPoint $gpsPoint,
        public readonly int $campaignId,
    ) {}

    public function broadcastOn(): array
    {
        return [
            new Channel('rider-tracking'),
            new PrivateChannel("campaign.{$this->campaignId}"),
        ];
    }

    public function broadcastAs(): string
    {
        return 'GpsPointRecorded';
    }

    public function broadcastWith(): array
    {
        $rider = $this->gpsPoint->rider;
        $user  = $rider?->user;

        return [
            'rider_id'    => $this->gpsPoint->rider_id,
            'campaign_id' => $this->campaignId,
            'rider'       => [
                'id'   => $rider?->id,
                'name' => $user?->name,
            ],
            'latitude'    => $this->gpsPoint->latitude,
            'longitude'   => $this->gpsPoint->longitude,
            'speed'       => $this->gpsPoint->speed,
            'heading'     => $this->gpsPoint->heading,
            'recorded_at' => $this->gpsPoint->recorded_at->toIso8601String(),
        ];
    }

    /**
     * Only broadcast points recorded within the last 5 minutes.
     * Stale offline-sync batches should not pollute live dashboards.
     */
    public function broadcastWhen(): bool
    {
        return $this->gpsPoint->recorded_at->isAfter(now()->subMinutes(5));
    }
}
