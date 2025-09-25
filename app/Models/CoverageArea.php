<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class CoverageArea extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'area_code',
        'county_id',
        'sub_county_id',
        'ward_id',
       
    ];

 

    protected $dates = [
        'deleted_at',
    ];

    public function county(): BelongsTo
    {
        return $this->belongsTo(County::class);
    }

    public function subCounty(): BelongsTo
    {
        return $this->belongsTo(SubCounty::class);
    }

    public function ward(): BelongsTo
    {
        return $this->belongsTo(Ward::class);
    }

    public function campaigns(): BelongsToMany
    {
        return $this->belongsToMany(Campaign::class, 'campaign_coverage_areas', 'coverage_area_id', 'campaign_id');
    }

    // Scopes
    // public function scopeActive($query)
    // {
    //     return $query->where('is_active', true);
    // }

    public function scopeByCounty($query, $countyId)
    {
        return $query->where('county_id', $countyId);
    }

    public function scopeBySubCounty($query, $subCountyId)
    {
        return $query->where('sub_county_id', $subCountyId);
    }

    public function scopeByWard($query, $wardId)
    {
        return $query->where('ward_id', $wardId);
    }

    public function scopeSearch($query, $search)
    {
        return $query->where(function ($q) use ($search) {
            $q->where('name', 'like', "%{$search}%")
              ->orWhere('area_code', 'like', "%{$search}%")
              ->orWhere('description', 'like', "%{$search}%");
        });
    }

    public function scopeWithLocation($query)
    {
        return $query->with(['county', 'subCounty', 'ward']);
    }

    // Accessors
    public function getFullNameAttribute(): string
    {
        $parts = array_filter([
            $this->name,
            $this->ward?->name,
            $this->subCounty?->name,
            $this->county?->name
        ]);

        return implode(', ', $parts);
    }

    public function getLocationHierarchyAttribute(): array
    {
        return [
            'coverage_area' => $this->name,
            'ward' => $this->ward?->name,
            'sub_county' => $this->subCounty?->name,
            'county' => $this->county?->name,
        ];
    }

    public function getShortNameAttribute(): string
    {
        $parts = array_filter([
            $this->name,
            $this->county?->name
        ]);

        return implode(', ', $parts);
    }

    public function getActiveCampaignsCountAttribute(): int
    {
        return $this->campaigns()->where('status', 'active')->count();
    }

    public function getTotalCampaignsCountAttribute(): int
    {
        return $this->campaigns()->count();
    }

    public function setNameAttribute($value)
    {
        $this->attributes['name'] = trim($value);
    }

    public function setDescriptionAttribute($value)
    {
        $this->attributes['description'] = $value ? trim($value) : null;
    }

    // Static methods
    public static function generateAreaCode(string $name, ?int $countyId = null): string
    {
        // Start with base code from name
        $baseCode = strtoupper(Str::slug($name, '_'));
        
        // Add county prefix if available
        if ($countyId) {
            $county = County::find($countyId);
            if ($county) {
                $countyCode = strtoupper(substr($county->name, 0, 3));
                $baseCode = $countyCode . '_' . $baseCode;
            }
        }

        // Ensure uniqueness by adding a number suffix
        $counter = 1;
        $finalCode = $baseCode;
        
        while (self::where('area_code', $finalCode)->exists()) {
            $finalCode = $baseCode . '_' . $counter;
            $counter++;
        }

        return $finalCode;
    }

    public static function createWithCode(array $data): self
    {
        if (!isset($data['area_code']) || empty($data['area_code'])) {
            $data['area_code'] = self::generateAreaCode($data['name'], $data['county_id'] ?? null);
        }

        return self::create($data);
    }

    public static function findByCode(string $areaCode): ?self
    {
        return self::where('area_code', $areaCode)->first();
    }

    public static function getActiveByCounty(int $countyId): \Illuminate\Database\Eloquent\Collection
    {
        return self::active()
            ->byCounty($countyId)
            ->orderBy('name')
            ->get();
    }

    public static function getPopularAreas(int $limit = 10): \Illuminate\Database\Eloquent\Collection
    {
        return self::withCount(['campaigns' => function ($query) {
            $query->where('status', 'active');
        }])
        ->active()
        ->orderByDesc('campaigns_count')
        ->limit($limit)
        ->get();
    }

    // public function activate(): bool
    // {
    //     return $this->update(['is_active' => true]);
    // }

    // public function deactivate(): bool
    // {
    //     return $this->update(['is_active' => false]);
    // }

    public function isInCounty(int $countyId): bool
    {
        return $this->county_id === $countyId;
    }

    public function hasActiveCampaigns(): bool
    {
        return $this->campaigns()->where('status', 'active')->exists();
    }

    public function canBeDeleted(): bool
    {
        return !$this->hasActiveCampaigns();
    }

    public function getLocationPath(): string
    {
        $path = [];
        
        if ($this->county) {
            $path[] = $this->county->name;
        }
        
        if ($this->subCounty) {
            $path[] = $this->subCounty->name;
        }
        
        if ($this->ward) {
            $path[] = $this->ward->name;
        }
        
        $path[] = $this->name;
        
        return implode(' > ', $path);
    }

    public function getCampaignStats(): array
    {
        $campaigns = $this->campaigns();
        
        return [
            'total_campaigns' => $campaigns->count(),
            'active_campaigns' => $campaigns->where('status', 'active')->count(),
            'completed_campaigns' => $campaigns->where('status', 'completed')->count(),
            'draft_campaigns' => $campaigns->where('status', 'draft')->count(),
        ];
    }

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (!$model->area_code) {
                $model->area_code = self::generateAreaCode($model->name, $model->county_id);
            }
        });

        static::updating(function ($model) {
            // Regenerate area code if name or county changed
            if ($model->isDirty(['name', 'county_id'])) {
                $model->area_code = self::generateAreaCode($model->name, $model->county_id);
            }
        });

        static::deleting(function ($model) {
            if ($model->hasActiveCampaigns()) {
                throw new \Exception('Cannot delete coverage area with active campaigns. Please complete or cancel all active campaigns first.');
            }
        });
    }

    public function scopeWithCampaignStats($query)
    {
        return $query->withCount([
            'campaigns',
            'campaigns as active_campaigns_count' => function ($query) {
                $query->where('status', 'active');
            },
            'campaigns as completed_campaigns_count' => function ($query) {
                $query->where('status', 'completed');
            }
        ]);
    }

    public function scopeOrderByPopularity($query)
    {
        return $query->withCount(['campaigns' => function ($query) {
            $query->where('status', 'active');
        }])->orderByDesc('campaigns_count');
    }

    public function toArray(): array
    {
        $array = parent::toArray();
        
        $array['full_name'] = $this->full_name;
        $array['location_hierarchy'] = $this->location_hierarchy;
        $array['location_path'] = $this->getLocationPath();
        
        return $array;
    }

    public function toSelectOption(): array
    {
        return [
            'value' => $this->id,
            'label' => $this->full_name,
            'area_code' => $this->area_code,
            'county' => $this->county?->name,
            'sub_county' => $this->subCounty?->name,
            'ward' => $this->ward?->name,
            'campaigns_count' => $this->total_campaigns_count,
        ];
    }
}