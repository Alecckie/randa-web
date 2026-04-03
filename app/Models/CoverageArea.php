<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
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
        // Spatial columns added by migration
        'center_latitude',
        'center_longitude',
        'radius_metres',
    ];

    protected $casts = [
        'center_latitude'  => 'float',
        'center_longitude' => 'float',
        'radius_metres'    => 'integer',
    ];

    protected $dates = ['deleted_at'];

    // ──────────────────────────────────────────────────────────────────────
    // Relationships
    // ──────────────────────────────────────────────────────────────────────

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
        return $this->belongsToMany(
            Campaign::class,
            'campaign_coverage_areas',
            'coverage_area_id',
            'campaign_id'
        );
    }

    public function areaVisits(): HasMany
    {
        return $this->hasMany(RiderAreaVisit::class, 'coverage_area_id');
    }

    // ──────────────────────────────────────────────────────────────────────
    // Spatial helpers
    // ──────────────────────────────────────────────────────────────────────

    /**
     * Whether this area has a center point + radius defined.
     * Areas without geometry are skipped during visit detection.
     */
    public function hasGeometry(): bool
    {
        return $this->center_latitude !== null
            && $this->center_longitude !== null
            && $this->radius_metres > 0;
    }

    /**
     * Check whether a GPS coordinate falls inside this area's geo-fence.
     * Uses the Haversine formula — same as GpsPathSimplifier::haversine().
     *
     * @param  float  $lat  GPS point latitude
     * @param  float  $lng  GPS point longitude
     */
    public function containsPoint(float $lat, float $lng): bool
    {
        if (! $this->hasGeometry()) {
            return false;
        }

        $earthRadius = 6_371_000.0;

        $dLat = deg2rad($lat - $this->center_latitude);
        $dLng = deg2rad($lng - $this->center_longitude);

        $a = sin($dLat / 2) ** 2
           + cos(deg2rad($this->center_latitude))
           * cos(deg2rad($lat))
           * sin($dLng / 2) ** 2;

        $distanceMetres = 2 * $earthRadius * asin(sqrt($a));

        return $distanceMetres <= $this->radius_metres;
    }

    // ──────────────────────────────────────────────────────────────────────
    // Scopes
    // ──────────────────────────────────────────────────────────────────────

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

    /**
     * Only areas that have geometry defined — used by AreaVisitService
     * to skip areas that haven't been configured yet.
     */
    public function scopeWithGeometry($query)
    {
        return $query->whereNotNull('center_latitude')
                     ->whereNotNull('center_longitude')
                     ->where('radius_metres', '>', 0);
    }

    public function scopeSearch($query, $search)
    {
        return $query->where(function ($q) use ($search) {
            $q->where('name', 'like', "%{$search}%")
              ->orWhere('area_code', 'like', "%{$search}%");
        });
    }

    public function scopeWithLocation($query)
    {
        return $query->with(['county', 'subCounty', 'ward']);
    }

    // ──────────────────────────────────────────────────────────────────────
    // Accessors
    // ──────────────────────────────────────────────────────────────────────

    public function getFullNameAttribute(): string
    {
        $parts = array_filter([
            $this->name,
            $this->ward?->name,
            $this->subCounty?->name,
            $this->county?->name,
        ]);

        return implode(', ', $parts);
    }

    public function getLocationHierarchyAttribute(): array
    {
        return [
            'coverage_area' => $this->name,
            'ward'          => $this->ward?->name,
            'sub_county'    => $this->subCounty?->name,
            'county'        => $this->county?->name,
        ];
    }

    public function getShortNameAttribute(): string
    {
        $parts = array_filter([$this->name, $this->county?->name]);
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

    // ──────────────────────────────────────────────────────────────────────
    // Mutators
    // ──────────────────────────────────────────────────────────────────────

    public function setNameAttribute($value): void
    {
        $this->attributes['name'] = trim($value);
    }

    // ──────────────────────────────────────────────────────────────────────
    // Static helpers
    // ──────────────────────────────────────────────────────────────────────

    public static function generateAreaCode(string $name, ?int $countyId = null): string
    {
        $baseCode = strtoupper(Str::slug($name, '_'));

        if ($countyId) {
            $county = County::find($countyId);
            if ($county) {
                $countyCode = strtoupper(substr($county->name, 0, 3));
                $baseCode   = $countyCode . '_' . $baseCode;
            }
        }

        $counter   = 1;
        $finalCode = $baseCode;

        while (self::where('area_code', $finalCode)->exists()) {
            $finalCode = $baseCode . '_' . $counter++;
        }

        return $finalCode;
    }

    public static function createWithCode(array $data): self
    {
        if (empty($data['area_code'])) {
            $data['area_code'] = self::generateAreaCode(
                $data['name'],
                $data['county_id'] ?? null
            );
        }

        return self::create($data);
    }

    public static function findByCode(string $areaCode): ?self
    {
        return self::where('area_code', $areaCode)->first();
    }

    public function getLocationPath(): string
    {
        $path = [];
        if ($this->county)    $path[] = $this->county->name;
        if ($this->subCounty) $path[] = $this->subCounty->name;
        if ($this->ward)      $path[] = $this->ward->name;
        $path[] = $this->name;
        return implode(' > ', $path);
    }

    public function getCampaignStats(): array
    {
        $campaigns = $this->campaigns();
        return [
            'total_campaigns'     => $campaigns->count(),
            'active_campaigns'    => $campaigns->where('status', 'active')->count(),
            'completed_campaigns' => $campaigns->where('status', 'completed')->count(),
            'draft_campaigns'     => $campaigns->where('status', 'draft')->count(),
        ];
    }

    public function canBeDeleted(): bool
    {
        return ! $this->campaigns()->where('status', 'active')->exists();
    }

    public function toSelectOption(): array
    {
        return [
            'value'           => $this->id,
            'label'           => $this->full_name,
            'area_code'       => $this->area_code,
            'county'          => $this->county?->name,
            'sub_county'      => $this->subCounty?->name,
            'ward'            => $this->ward?->name,
            'has_geometry'    => $this->hasGeometry(),
            'campaigns_count' => $this->total_campaigns_count,
        ];
    }

    public function toArray(): array
    {
        $array = parent::toArray();
        $array['full_name']           = $this->full_name;
        $array['location_hierarchy']  = $this->location_hierarchy;
        $array['location_path']       = $this->getLocationPath();
        $array['has_geometry']        = $this->hasGeometry();
        return $array;
    }

    // ──────────────────────────────────────────────────────────────────────
    // Lifecycle hooks
    // ──────────────────────────────────────────────────────────────────────

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function ($model) {
            if (! $model->area_code) {
                $model->area_code = self::generateAreaCode(
                    $model->name,
                    $model->county_id
                );
            }
        });

        static::updating(function ($model) {
            if ($model->isDirty(['name', 'county_id'])) {
                $model->area_code = self::generateAreaCode(
                    $model->name,
                    $model->county_id
                );
            }
        });

        static::deleting(function ($model) {
            if ($model->campaigns()->where('status', 'active')->exists()) {
                throw new \Exception(
                    'Cannot delete a coverage area with active campaigns.'
                );
            }
        });
    }
}