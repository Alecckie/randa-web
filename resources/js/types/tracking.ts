// ─────────────────────────────────────────────────────────────────────────────
// Shared GPS / Location types
// ─────────────────────────────────────────────────────────────────────────────

export interface RiderInfo {
    id: number | null;
    name: string | null;
    phone: string | null;
    email: string | null;
    status: string | null;
}

export interface LocationInfo {
    latitude: number | null;
    longitude: number | null;
    accuracy: number | null;
    speed: number | null;
    heading: number | null;
    address: string | null;
}

export interface CampaignInfo {
    id: number;
    name: string;
}

/** A single GPS point enriched with rider + campaign info — returned by the API */
export interface EnrichedLocation {
    id: number;
    rider_id: number | null;
    rider: RiderInfo;
    location: LocationInfo;
    campaign: CampaignInfo | null;
    recorded_at: string;
    time_ago: string;
    is_recent: boolean;

    // Flat aliases kept for map library compatibility
    latitude: number | null;
    longitude: number | null;
    accuracy: number | null;
    speed: number | null;
    heading: number | null;
    address: string | null;
}

/** A raw GPS point used inside a route polyline */
export interface RouteLocation {
    id: number;
    latitude: number;
    longitude: number;
    speed: number | null;
    recorded_at: string;
    accuracy?: number | null;
    heading?: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Route / Stats types
// ─────────────────────────────────────────────────────────────────────────────

export interface RouteSummary {
    distance: number;
    duration: number;
    avg_speed: number | null;
    coverage_areas_count: number;
}

export interface RouteDetail {
    id: number;
    date: string;
    total_distance: number;
    total_duration: number;
    avg_speed: number | null;
    max_speed: number | null;
    location_points_count: number;
    tracking_status: string;
    started_at: string | null;
    ended_at: string | null;
    total_pause_duration: number;
    pause_history: PauseHistoryEntry[] | null;
}

export interface PauseHistoryEntry {
    paused_at: string;
    resumed_at: string;
    duration_minutes: number;
    latitude: number | null;
    longitude: number | null;
    reason: string | null;
}

export interface RiderTrackingData {
    rider: RiderInfo;
    route: RouteDetail | null;
    summary: RouteSummary | null;
    locations: RouteLocation[];
    polyline: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard stats
// ─────────────────────────────────────────────────────────────────────────────

export interface TrackingStats {
    active_riders: number;
    total_distance: number;
    total_locations: number;
    active_campaigns: number;
    avg_speed: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Live tracking response
// ─────────────────────────────────────────────────────────────────────────────

export interface LiveTrackingData {
    active_riders: number;
    locations: EnrichedLocation[];
    last_updated: string;
    refresh_interval?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Rider list
// ─────────────────────────────────────────────────────────────────────────────

export interface TrackingStatus {
    is_active: boolean;
    last_seen: string | null;
    last_seen_human: string;
}

export interface RiderListItem {
    id: number;
    name: string;
    email: string;
    phone: string;
    status: string;
    current_campaign: CampaignInfo | null;
    tracking_status: TrackingStatus;
}

// ─────────────────────────────────────────────────────────────────────────────
// Filters
// ─────────────────────────────────────────────────────────────────────────────

export type ViewMode = 'live' | 'historical';

export interface TrackingFilters {
    campaign_id: number | null;
    rider_ids: number[];
    date: string;
    view_mode: ViewMode;
}

// ─────────────────────────────────────────────────────────────────────────────
// Inertia page props
// ─────────────────────────────────────────────────────────────────────────────

export interface SelectOption {
    value: string;
    label: string;
}

export interface TrackingPageProps {
    stats: TrackingStats;
    campaigns: SelectOption[];
    riders: SelectOption[];
    initialData: LiveTrackingData;
}