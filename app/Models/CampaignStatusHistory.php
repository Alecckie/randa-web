<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CampaignStatusHistory extends Model
{
    use HasFactory;

    protected $table = 'campaign_status_history';

    protected $fillable = [
        'campaign_id',
        'user_id',
        'old_status',
        'new_status',
        'notes',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the campaign that owns this status history.
     */
    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class);
    }

    /**
     * Get the user who made the status change.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get formatted old status
     */
    public function getFormattedOldStatusAttribute(): string
    {
        return ucwords(str_replace('_', ' ', $this->old_status));
    }

    /**
     * Get formatted new status
     */
    public function getFormattedNewStatusAttribute(): string
    {
        return ucwords(str_replace('_', ' ', $this->new_status));
    }
}