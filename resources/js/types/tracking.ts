// resources/js/types/tracking.ts

export interface Rider {
    id: number | null;
    name: string | null;
    email: string | null;
    phone: string | null;
    status: string | null;
}

export interface Campaign {
    id: number;
    name: string;
}

export interface LocationCoordinates {
    latitude: number | null;
    longitude: number | null;
    accuracy: number | null;
    speed: number | null;
    heading: number | null;
    address?: string | null;  // Added address
}

/**
 * EnrichedLocation matches the backend enrichLocation() method output
 * 
 * Backend structure from RiderTrackingService::enrichLocation():
 * {
 *   id, rider_id, rider: {...}, location: {...}, campaign: {...}, 
 *   recorded_at, time_ago, is_recent
 * }
 * 
 * Can also have flat properties for backward compatibility:
 * { latitude, longitude, speed, heading, accuracy, address, ... }
 */
export interface EnrichedLocation {
    id: number;
    rider_id: number;
    rider: Rider;
    
    // Nested location object (primary structure from enrichLocation())
    location: LocationCoordinates;
    
    // Also support flat properties for backward compatibility
    latitude?: number;
    longitude?: number;
    accuracy?: number | null;
    speed?: number | null;
    heading?: number | null;
    address?: string | null;
    
    campaign: Campaign | null;
    recorded_at: string;
    time_ago: string;
    is_recent: boolean;
}

export interface TrackingStats {
    active_riders: number;
    total_distance: number;
    total_locations: number;
    active_campaigns: number;
    avg_speed: number;
    coverage_areas: number;
}

export interface LiveTrackingData {
    active_riders: number;
    locations: EnrichedLocation[];
    last_updated: string;
    refresh_interval?: number;
}

export interface RiderRoute {
    id: number;
    rider_id: number;
    date: string;
    started_at: string;
    ended_at: string | null;
    total_distance: number;
    total_duration: number;
    avg_speed: number | null;
    max_speed: number | null;
    location_points_count: number;
    coverage_areas: number[];
    status: string;
    tracking_status: string;
    total_pause_duration: number;
}

export interface RouteLocation {
    id: number;
    latitude: number;
    longitude: number;
    speed: number | null;
    heading?: number | null;
    accuracy?: number | null;
    recorded_at: string;
    address?: string | null;
}

export interface RiderTrackingData {
    rider: Rider;
    route: RiderRoute | null;
    summary: {
        distance: number;
        duration: number;
        avg_speed: number;
        coverage_areas_count: number;
    } | null;
    locations: RouteLocation[];
    polyline: string | null;
}

export interface TrackingFilters {
    campaign_id: number | null;
    rider_ids: number[];
    date: string;
    view_mode: 'live' | 'historical';
}

export interface RiderListItem {
    id: number;
    name: string;
    email: string;
    phone: string;
    status: string;
    current_campaign: {
        id: number;
        name: string;
    } | null;
    tracking_status: {
        is_active: boolean;
        last_seen: string | null;
        last_seen_human: string;
    };
}

export interface TrackingPageProps {
    stats: TrackingStats;
    campaigns: Array<{ value: string; label: string }>;
    riders: Array<{ value: string; label: string }>;
    initialData: LiveTrackingData;
}

export interface MapBounds {
    north: number;
    south: number;
    east: number;
    west: number;
}

export type ViewMode = 'live' | 'historical' | 'heatmap';
export type MapStyle = 'default' | 'satellite' | 'terrain';