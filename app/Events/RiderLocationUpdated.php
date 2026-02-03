<?php

namespace App\Events;

use App\Models\RiderLocation;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class RiderLocationUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public RiderLocation $location;

    /**
     * Create a new event instance.
     */
    public function __construct(RiderLocation $location)
    {
        $this->location = $location;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new Channel('rider-tracking'),
            new PrivateChannel('campaign.' . $this->location->campaign_assignment_id),
            new PrivateChannel('rider.' . $this->location->rider_id),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'RiderLocationUpdated';
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'location' => [
                'id' => $this->location->id,
                'rider_id' => $this->location->rider_id,
                'latitude' => (float) $this->location->latitude,
                'longitude' => (float) $this->location->longitude,
                'accuracy' => $this->location->accuracy ? (float) $this->location->accuracy : null,
                'speed' => $this->location->speed ? (float) $this->location->speed : null,
                'heading' => $this->location->heading ? (float) $this->location->heading : null,
                'recorded_at' => $this->location->recorded_at->toIso8601String(),
            ],
            'rider' => [
                'id' => $this->location->rider->id,
                'name' => $this->location->rider->user->name,
            ],
            'campaign_assignment_id' => $this->location->campaign_assignment_id,
            'timestamp' => now()->toIso8601String(),
        ];
    }

    /**
     * Determine if this event should broadcast.
     */
    public function shouldBroadcast(): bool
    {
        // Only broadcast if location is recent (within last 5 minutes)
        return $this->location->recorded_at->isAfter(now()->subMinutes(5));
    }
}