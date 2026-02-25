
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { Card, Badge, Text, Group, Button, Loader } from '@mantine/core';
import { DivIcon, LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { NavigationIcon, ClockIcon, GaugeIcon, MapPinIcon } from 'lucide-react';
import type { EnrichedLocation, RouteLocation } from '@/types/tracking';

const RIDER_COLORS = [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#84CC16', // Lime
];

interface TrackingMapProps {
    locations: EnrichedLocation[];
    routes?: Map<number, RouteLocation[]>;
    center?: [number, number];
    zoom?: number;
    onMarkerClick?: (location: EnrichedLocation) => void;
    loading?: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Safely extract a [lat, lng] tuple from an EnrichedLocation.
 * Handles both flat structure and nested location.location structure
 */
function safeLatLng(location: EnrichedLocation): [number, number] | null {
    // Try direct properties first
    let lat: number | null | undefined = location.latitude;
    let lng: number | null | undefined = location.longitude;
    
    // If not found or null, try nested location object (from API)
    if ((lat == null) && location.location) {
        lat = location.location.latitude ?? undefined;
        lng = location.location.longitude ?? undefined;
    }

    // Validate coordinates - convert null to undefined for consistency
    const finalLat = lat ?? undefined;
    const finalLng = lng ?? undefined;

    if (finalLat == null || finalLng == null || !isFinite(finalLat) || !isFinite(finalLng)) {
        console.warn('Invalid coordinates for location:', location);
        return null;
    }
    
    return [finalLat, finalLng];
}

/**
 * Safely extract [lat, lng] from a RouteLocation
 */
function safeRouteLatLng(loc: RouteLocation): [number, number] | null {
    const lat = loc.latitude;
    const lng = loc.longitude;
    
    if (lat == null || lng == null || !isFinite(lat) || !isFinite(lng)) {
        console.warn('Invalid route coordinates:', loc);
        return null;
    }
    
    return [lat, lng];
}

/**
 * Safely extract numeric value, handling both null and undefined
 */
function safeNumber(value: number | null | undefined): number | null {
    if (value == null || !isFinite(value)) {
        return null;
    }
    return value;
}

// ── Map bounds handler ────────────────────────────────────────────────────────

function MapBoundsHandler({ locations }: { locations: EnrichedLocation[] }) {
    const map = useMap();

    useEffect(() => {
        // Only use locations with valid coordinates
        const validPoints = locations
            .map(safeLatLng)
            .filter((p): p is [number, number] => p !== null);

        if (validPoints.length === 0) return;

        if (validPoints.length === 1) {
            map.setView(validPoints[0], 13);
        } else {
            try {
                map.fitBounds(validPoints, { padding: [50, 50] });
            } catch (error) {
                console.error('Error fitting bounds:', error);
                // Fallback to center on first point
                map.setView(validPoints[0], 12);
            }
        }
    }, [locations, map]);

    return null;
}

// ── Marker icon ───────────────────────────────────────────────────────────────

function createRiderIcon(color: string, isActive: boolean): DivIcon {
    return new DivIcon({
        className: 'custom-rider-marker',
        html: `
            <div style="
                background-color: ${color};
                width: 32px;
                height: 32px;
                border-radius: 50%;
                border: 3px solid white;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                ${isActive ? 'animation: pulse 2s infinite;' : ''}
            ">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                </svg>
            </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16],
    });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TrackingMap({
    locations = [], // Default to empty array
    routes,
    center = [-1.286389, 36.817223], // Nairobi default
    zoom = 12,
    onMarkerClick,
    loading = false,
}: TrackingMapProps) {
    const [selectedLocation, setSelectedLocation] = useState<EnrichedLocation | null>(null);

    const getRiderColor = (riderId: number | null | undefined): string => {
        if (riderId == null || !isFinite(riderId)) {
            return RIDER_COLORS[0];
        }
        return RIDER_COLORS[riderId % RIDER_COLORS.length];
    };

    const handleMarkerClick = (location: EnrichedLocation) => {
        setSelectedLocation(location);
        onMarkerClick?.(location);
    };

    // ── Loading state ──────────────────────────────────────────────────────────

    if (loading) {
        return (
            <Card className="h-full flex items-center justify-center bg-white dark:bg-gray-800">
                <div className="text-center">
                    <Loader size="lg" />
                    <Text size="sm" c="dimmed" mt="md">Loading map...</Text>
                </div>
            </Card>
        );
    }

    // Pre-filter to only locations with valid coordinates
    const validLocations = locations.filter((loc) => safeLatLng(loc) !== null);

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <Card className="h-full p-0 overflow-hidden relative bg-white dark:bg-gray-800">

            {/* Legend */}
            <div className="absolute top-4 right-4 z-[1000] bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg">
                <Text size="xs" fw={700} mb="xs">Legend</Text>
                <div className="space-y-2">
                    <Group gap="xs">
                        <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                        <Text size="xs">Active (&lt; 5 min)</Text>
                    </Group>
                    <Group gap="xs">
                        <div className="w-3 h-3 rounded-full bg-gray-400" />
                        <Text size="xs">Inactive (&gt; 5 min)</Text>
                    </Group>
                </div>
            </div>

            {/* Active rider count badge */}
            {validLocations.length > 0 && (
                <div className="absolute top-4 left-4 z-[1000]">
                    <Badge size="lg" variant="filled" color="blue">
                        {validLocations.length} Active Rider{validLocations.length !== 1 ? 's' : ''}
                    </Badge>
                </div>
            )}

            <MapContainer
                center={center as LatLngExpression}
                zoom={zoom}
                className="h-full w-full"
                style={{ minHeight: '500px' }}
                scrollWheelZoom={true}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />

                <MapBoundsHandler locations={validLocations} />

                {/* Rider markers */}
                {validLocations.map((location) => {
                    const coords = safeLatLng(location);
                    if (!coords) return null; // Extra safety check

                    // Safely get rider info (handle both flat and nested structures)
                    const riderId = location.rider_id ?? location.rider?.id;
                    const riderName = location.rider?.name ?? 'Unknown Rider';
                    const riderPhone = location.rider?.phone ?? null;
                    
                    const color = getRiderColor(riderId);
                    const isActive = location.is_recent ?? false;

                    // Safely resolve speed / heading / accuracy from either structure
                    // Use safeNumber to handle null/undefined properly
                    const speed = safeNumber(location.speed ?? location.location?.speed);
                    const heading = safeNumber(location.heading ?? location.location?.heading);
                    const accuracy = safeNumber(location.accuracy ?? location.location?.accuracy);

                    const timeAgo = location.time_ago ?? null;
                    const address = location.address ?? location.location?.address ?? null;
                    const campaign = location.campaign ?? null;

                    // Generate unique key
                    const markerKey = location.id ?? `marker-${riderId}-${coords[0]}-${coords[1]}`;

                    return (
                        <Marker
                            key={markerKey}
                            position={coords as LatLngExpression}
                            icon={createRiderIcon(color, isActive)}
                            eventHandlers={{ click: () => handleMarkerClick(location) }}
                        >
                            <Popup>
                                <div className="p-2 min-w-[250px]">

                                    {/* Rider info */}
                                    <div className="mb-3">
                                        <Text size="sm" fw={700} className="text-gray-900">
                                            {riderName}
                                        </Text>
                                        {riderPhone && (
                                            <Text size="xs" c="dimmed">
                                                {riderPhone}
                                            </Text>
                                        )}
                                    </div>

                                    {/* Campaign badge */}
                                    {campaign?.name && (
                                        <div className="mb-3">
                                            <Badge size="sm" variant="light" color="blue">
                                                {campaign.name}
                                            </Badge>
                                        </div>
                                    )}

                                    {/* Location details */}
                                    <div className="space-y-2">
                                        {speed !== null && (
                                            <Group gap="xs">
                                                <GaugeIcon size={14} className="text-gray-500" />
                                                <Text size="xs">
                                                    {speed.toFixed(1)} km/h
                                                </Text>
                                            </Group>
                                        )}

                                        {heading !== null && (
                                            <Group gap="xs">
                                                <NavigationIcon size={14} className="text-gray-500" />
                                                <Text size="xs">
                                                    Heading: {heading.toFixed(0)}°
                                                </Text>
                                            </Group>
                                        )}

                                        {accuracy !== null && (
                                            <Group gap="xs">
                                                <MapPinIcon size={14} className="text-gray-500" />
                                                <Text size="xs">
                                                    ±{accuracy.toFixed(0)}m accuracy
                                                </Text>
                                            </Group>
                                        )}

                                        {timeAgo && (
                                            <Group gap="xs">
                                                <ClockIcon size={14} className="text-gray-500" />
                                                <Text size="xs">{timeAgo}</Text>
                                            </Group>
                                        )}

                                        {address && (
                                            <div className="mt-2 pt-2 border-t border-gray-200">
                                                <Text size="xs" c="dimmed">{address}</Text>
                                            </div>
                                        )}
                                    </div>

                                    <Button
                                        size="xs"
                                        variant="light"
                                        fullWidth
                                        mt="md"
                                        onClick={() => handleMarkerClick(location)}
                                    >
                                        View Full Route
                                    </Button>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}

                {/* Route polylines */}
                {routes && Array.from(routes.entries()).map(([riderId, routeLocations]) => {
                    // Drop any points with invalid coordinates
                    const positions = routeLocations
                        .map(safeRouteLatLng)
                        .filter((p): p is [number, number] => p !== null);

                    // Need at least 2 valid points to draw a line
                    if (positions.length < 2) return null;

                    const polylineKey = `polyline-${riderId}`;

                    return (
                        <Polyline
                            key={polylineKey}
                            positions={positions as LatLngExpression[]}
                            pathOptions={{
                                color: getRiderColor(riderId),
                                weight: 4,
                                opacity: 0.7,
                            }}
                        />
                    );
                })}
            </MapContainer>

            {/* No data overlay */}
            {validLocations.length === 0 && !loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-800/80 z-[1000]">
                    <div className="text-center">
                        <div className="text-6xl mb-4">📍</div>
                        <Text size="lg" fw={500} mb="xs">No Active Riders</Text>
                        <Text size="sm" c="dimmed">
                            No location data available for the selected filters
                        </Text>
                    </div>
                </div>
            )}

            {/* Pulse animation */}
            <style>{`
                @keyframes pulse {
                    0%, 100% { 
                        box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); 
                    }
                    50% { 
                        box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); 
                    }
                }
            `}</style>
        </Card>
    );
}