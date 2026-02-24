import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { Card, Badge, Text, Group, Button, Loader } from '@mantine/core';
import { DivIcon, LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { NavigationIcon, ClockIcon, GaugeIcon, MapPinIcon } from 'lucide-react';
import type { EnrichedLocation, RouteLocation } from '@/types/tracking';

// Rider colors for multiple riders
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

// Component to handle map bounds fitting
function MapBoundsHandler({ locations }: { locations: EnrichedLocation[] }) {
    const map = useMap();

    useEffect(() => {
        if (locations.length > 0) {
            // 1. Map to a simple array of number tuples
            const points = locations.map(loc => [loc.latitude, loc.longitude] as [number, number]);

            if (points.length === 1) {
                map.setView(points[0], 13);
            } else {
                // 2. Pass the points directly; Leaflet handles the conversion to bounds
                map.fitBounds(points, { padding: [50, 50] });
            }
        }
    }, [locations, map]);

    return null;
}

// Create custom marker icon
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

export default function TrackingMap({
    locations,
    routes,
    center = [-1.286389, 36.817223], // Nairobi default
    zoom = 12,
    onMarkerClick,
    loading = false
}: TrackingMapProps) {
    const [selectedLocation, setSelectedLocation] = useState<EnrichedLocation | null>(null);

    // Get color for rider
    const getRiderColor = (riderId: number): string => {
        return RIDER_COLORS[riderId % RIDER_COLORS.length];
    };

    // Handle marker click
    const handleMarkerClick = (location: EnrichedLocation) => {
        setSelectedLocation(location);
        if (onMarkerClick) {
            onMarkerClick(location);
        }
    };

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

    return (
        <Card className="h-full p-0 overflow-hidden relative bg-white dark:bg-gray-800">
            {/* Map Legend */}
            <div className="absolute top-4 right-4 z-[1000] bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg">
                <Text size="xs" fw={700} mb="xs">Legend</Text>
                <div className="space-y-2">
                    <Group gap="xs">
                        <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                        <Text size="xs">Active (&lt; 5 min)</Text>
                    </Group>
                    <Group gap="xs">
                        <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                        <Text size="xs">Inactive (&gt; 5 min)</Text>
                    </Group>
                </div>
            </div>

            {/* Location Count Badge */}
            {locations.length > 0 && (
                <div className="absolute top-4 left-4 z-[1000]">
                    <Badge size="lg" variant="filled" color="blue">
                        {locations.length} Active Rider{locations.length !== 1 ? 's' : ''}
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

                {/* Fit bounds to show all markers */}
                <MapBoundsHandler locations={locations} />

                {/* Render rider markers */}
                {locations.map((location) => {
                    const color = getRiderColor(location.rider_id);
                    const markerIcon = createRiderIcon(color, location.is_recent);

                    return (
                        <Marker
                            key={location.id}
                            position={[location.latitude, location.longitude] as LatLngExpression}
                            icon={markerIcon}
                            eventHandlers={{
                                click: () => handleMarkerClick(location)
                            }}
                        >
                            <Popup>
                                <div className="p-2 min-w-[250px]">
                                    {/* Rider Info */}
                                    <div className="mb-3">
                                        <Text size="sm" fw={700} className="text-gray-900">
                                            {location.rider.name}
                                        </Text>
                                        <Text size="xs" c="dimmed">
                                            {location.rider.phone}
                                        </Text>
                                    </div>

                                    {/* Campaign */}
                                    {location.campaign && (
                                        <div className="mb-3">
                                            <Badge size="sm" variant="light" color="blue">
                                                {location.campaign.name}
                                            </Badge>
                                        </div>
                                    )}

                                    {/* Location Details */}
                                    <div className="space-y-2">
                                        {location.speed !== null && (
                                            <Group gap="xs">
                                                <GaugeIcon size={14} className="text-gray-500" />
                                                <Text size="xs">
                                                    {location.speed.toFixed(1)} km/h
                                                </Text>
                                            </Group>
                                        )}

                                        {location.heading !== null && (
                                            <Group gap="xs">
                                                <NavigationIcon size={14} className="text-gray-500" />
                                                <Text size="xs">
                                                    Heading: {location.heading.toFixed(0)}°
                                                </Text>
                                            </Group>
                                        )}

                                        {location.accuracy !== null && (
                                            <Group gap="xs">
                                                <MapPinIcon size={14} className="text-gray-500" />
                                                <Text size="xs">
                                                    ±{location.accuracy.toFixed(0)}m accuracy
                                                </Text>
                                            </Group>
                                        )}

                                        <Group gap="xs">
                                            <ClockIcon size={14} className="text-gray-500" />
                                            <Text size="xs">
                                                {location.time_ago}
                                            </Text>
                                        </Group>

                                        {location.address && (
                                            <div className="mt-2 pt-2 border-t border-gray-200">
                                                <Text size="xs" c="dimmed">
                                                    {location.address}
                                                </Text>
                                            </div>
                                        )}
                                    </div>

                                    {/* View Details Button */}
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

                {/* Render routes if provided */}
                {routes && Array.from(routes.entries()).map(([riderId, routeLocations]) => {
                    const color = getRiderColor(riderId);
                    const positions = routeLocations.map(loc => [loc.latitude, loc.longitude] as LatLngExpression);

                    return (
                        <Polyline
                            key={riderId}
                            positions={positions}
                            pathOptions={{
                                color: color,
                                weight: 4,
                                opacity: 0.7,
                            }}
                        />
                    );
                })}
            </MapContainer>

            {/* No Data Message */}
            {locations.length === 0 && !loading && (
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

            {/* Add pulse animation styles */}
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