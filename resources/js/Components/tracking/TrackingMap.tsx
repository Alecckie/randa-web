import { useEffect, useRef, useState } from 'react';
import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    Polyline,
    useMap,
} from 'react-leaflet';
import type { Map as LeafletMap, DivIcon } from 'leaflet';
import { Badge, Text, Button, Loader } from '@mantine/core';
import 'leaflet/dist/leaflet.css';
import {
    Navigation,
    Clock,
    Gauge,
    MapPin,
    AlertCircle,
} from 'lucide-react';
import type { EnrichedLocation, RouteLocation } from '@/types/tracking';
import type { LatLngExpression } from 'leaflet';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const NAIROBI_CENTER: [number, number] = [-1.286389, 36.817223];

const RIDER_COLORS = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
    '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
];

// ─────────────────────────────────────────────────────────────────────────────
// Leaflet dynamic import
// Leaflet mutates `window` and `document` on import — it must never run
// during SSR. We import it once after mount and cache the module reference.
// ─────────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let leafletModule: typeof import('leaflet') | null = null;

async function getLeaflet(): Promise<typeof import('leaflet')> {
    if (!leafletModule) {
        leafletModule = await import('leaflet');
    }
    return leafletModule;
}

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface TrackingMapProps {
    locations?: EnrichedLocation[];
    routes?: Map<number, RouteLocation[]>;
    center?: [number, number];
    zoom?: number;
    onMarkerClick?: (location: EnrichedLocation) => void;
    loading?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Coordinate helpers
// ─────────────────────────────────────────────────────────────────────────────

function safeLatLng(loc: EnrichedLocation): [number, number] | null {
    const lat = loc.latitude ?? loc.location?.latitude;
    const lng = loc.longitude ?? loc.location?.longitude;
    if (lat == null || lng == null || !isFinite(lat) || !isFinite(lng)) return null;
    return [lat, lng];
}

function safeRouteLatLng(loc: RouteLocation): [number, number] | null {
    if (loc.latitude == null || loc.longitude == null) return null;
    if (!isFinite(loc.latitude) || !isFinite(loc.longitude)) return null;
    return [loc.latitude, loc.longitude];
}

// ─────────────────────────────────────────────────────────────────────────────
// Map auto-bounds handler
// ─────────────────────────────────────────────────────────────────────────────

function MapBoundsHandler({ locations }: { locations: EnrichedLocation[] }) {
    const map = useMap();
    const prevCount = useRef(0);

    useEffect(() => {
        const points = locations
            .map(safeLatLng)
            .filter((p): p is [number, number] => p !== null);

        if (points.length === 0 || points.length === prevCount.current) return;
        prevCount.current = points.length;

        if (points.length === 1) {
            map.setView(points[0], 14);
        } else {
            try {
                map.fitBounds(points, { padding: [60, 60], maxZoom: 16 });
            } catch {
                map.setView(points[0], 13);
            }
        }
    }, [locations, map]);

    return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Icon factory
//
// FIX: Instead of `new L.DivIcon(...)` (which TypeScript can't verify has a
// construct signature when L is dynamically imported), we use the Leaflet
// factory function `L.divIcon(...)` which is a plain function call.
// This resolves both:
//   - "Expected 1 arguments, but got 0"   (ts 2554)
//   - "'new' expression implicitly has 'any' type"  (ts 7009)
// ─────────────────────────────────────────────────────────────────────────────

function buildDivIconHtml(color: string, isActive: boolean): string {
    const ripple = isActive
        ? `<div style="
                position:absolute;inset:0;
                border-radius:50%;
                background:${color};
                opacity:.2;
                animation:ripple 2s ease-out infinite;
           "></div>`
        : '';

    return `
        <div style="position:relative;width:36px;height:36px;">
            ${ripple}
            <div style="
                position:absolute;inset:4px;
                background:${color};
                border-radius:50%;
                border:2.5px solid #fff;
                box-shadow:0 2px 8px rgba(0,0,0,.25);
                display:flex;
                align-items:center;
                justify-content:center;
            ">
                <svg xmlns='http://www.w3.org/2000/svg' width='14' height='14'
                     viewBox='0 0 24 24' fill='none' stroke='#fff'
                     stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'>
                    <path d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'/>
                    <circle cx='12' cy='7' r='4'/>
                </svg>
            </div>
        </div>`;
}

/**
 * Create a Leaflet DivIcon using the factory function L.divIcon() rather
 * than the class constructor new L.DivIcon().
 * Both produce identical results — the factory is just a typed wrapper.
 */
function createRiderIcon(
    L: typeof import('leaflet'),
    color: string,
    isActive: boolean
): DivIcon {
    // L.divIcon() is the correct factory — no `new` needed, fully typed
    return L.divIcon({
        className: '',
        html: buildDivIconHtml(color, isActive),
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -20],
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function TrackingMap({
    locations = [],
    routes,
    center = NAIROBI_CENTER,
    zoom = 12,
    onMarkerClick,
    loading = false,
}: TrackingMapProps) {
    // We store the resolved Leaflet module so icons can be built synchronously
    // during render once it has loaded.
    const [L, setL] = useState<typeof import('leaflet') | null>(null);

    useEffect(() => {
        getLeaflet().then(setL);
    }, []);

    const getRiderColor = (riderId: number | null | undefined): string =>
        riderId != null && isFinite(riderId)
            ? RIDER_COLORS[Math.abs(riderId) % RIDER_COLORS.length]
            : RIDER_COLORS[0];

    const validLocations = locations.filter((l) => safeLatLng(l) !== null);

    // ── Loading / not ready ────────────────────────────────────────────────────

    if (loading || !L) {
        return (
            <div className="h-full w-full flex items-center justify-center
                            bg-gray-50 dark:bg-gray-900 rounded-xl border
                            border-gray-200 dark:border-gray-700">
                <div className="text-center space-y-3">
                    <Loader size="lg" color="blue" />
                    <Text size="sm" c="dimmed">Loading map…</Text>
                </div>
            </div>
        );
    }

    // ── Empty overlay ──────────────────────────────────────────────────────────

    const emptyOverlay = validLocations.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center
                        bg-white/80 dark:bg-gray-900/80 z-[900] rounded-xl backdrop-blur-sm">
            <div className="text-center space-y-3 p-8">
                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800
                                flex items-center justify-center mx-auto">
                    <AlertCircle size={28} className="text-gray-400" />
                </div>
                <Text size="lg" fw={600} c="dimmed">No active riders</Text>
                <Text size="sm" c="dimmed" maw={280} ta="center">
                    No location data for the selected filters.
                    Try adjusting the date or campaign.
                </Text>
            </div>
        </div>
    );

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <div className="relative h-full w-full rounded-xl overflow-hidden
                        border border-gray-200 dark:border-gray-700 shadow-sm">

            {/* Live badge */}
            <div className="absolute top-3 left-3 z-[800]">
                <Badge
                    size="md"
                    variant="filled"
                    color={validLocations.length > 0 ? 'blue' : 'gray'}
                    leftSection={
                        validLocations.length > 0
                            ? <span className="inline-block w-2 h-2 rounded-full bg-white animate-pulse" />
                            : undefined
                    }
                >
                    {validLocations.length} active rider
                    {validLocations.length !== 1 ? 's' : ''}
                </Badge>
            </div>

            {/* Legend */}
            <div className="absolute top-3 right-3 z-[800]
                            bg-white dark:bg-gray-800 rounded-lg shadow-md
                            border border-gray-200 dark:border-gray-700
                            px-3 py-2 text-xs space-y-1.5">
                <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Legend</p>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse inline-block" />
                    Active (&lt; 5 min)
                </div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-gray-400 inline-block" />
                    Inactive
                </div>
                {routes && routes.size > 0 && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <span className="w-4 h-0.5 bg-blue-500 inline-block" />
                        Route trail
                    </div>
                )}
            </div>

            <MapContainer
                center={center as LatLngExpression}
                zoom={zoom}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom
                zoomControl={false}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />

                <MapBoundsHandler locations={validLocations} />

                {/* ── Route polylines ── */}
                {routes &&
                    Array.from(routes.entries()).map(([riderId, routePoints]) => {
                        const positions = routePoints
                            .map(safeRouteLatLng)
                            .filter((p): p is [number, number] => p !== null);

                        if (positions.length < 2) return null;

                        return (
                            <Polyline
                                key={`route-${riderId}`}
                                positions={positions as LatLngExpression[]}
                                pathOptions={{
                                    color: getRiderColor(riderId),
                                    weight: 4,
                                    opacity: 0.75,
                                    lineCap: 'round',
                                    lineJoin: 'round',
                                }}
                            />
                        );
                    })}

                {/* ── Rider markers ── */}
                {validLocations.map((location) => {
                    const coords = safeLatLng(location);
                    if (!coords) return null;

                    const riderId  = location.rider_id ?? location.rider?.id;
                    const name     = location.rider?.name ?? 'Unknown Rider';
                    const phone    = location.rider?.phone ?? null;
                    const color    = getRiderColor(riderId);
                    const isActive = location.is_recent ?? false;

                    // Use the Leaflet module that is now guaranteed non-null here
                    const icon = createRiderIcon(L, color, isActive);

                    const speed    = location.speed    ?? location.location?.speed    ?? null;
                    const heading  = location.heading  ?? location.location?.heading  ?? null;
                    const accuracy = location.accuracy ?? location.location?.accuracy ?? null;
                    const timeAgo  = location.time_ago ?? null;
                    const campaign = location.campaign ?? null;

                    return (
                        <Marker
                            key={location.id ?? `m-${riderId}-${coords[0]}-${coords[1]}`}
                            position={coords as LatLngExpression}
                            icon={icon}
                            eventHandlers={{ click: () => onMarkerClick?.(location) }}
                        >
                            <Popup minWidth={240} maxWidth={300}>
                                <div className="py-1 space-y-3">

                                    {/* Header */}
                                    <div className="flex items-center gap-2">
                                        <div
                                            style={{
                                                background: color,
                                                width: 32,
                                                height: 32,
                                                borderRadius: '50%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: '#fff',
                                                fontSize: 12,
                                                fontWeight: 700,
                                                flexShrink: 0,
                                            }}
                                        >
                                            {name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-sm text-gray-900 truncate">
                                                {name}
                                            </p>
                                            {phone && (
                                                <p className="text-xs text-gray-500 truncate">{phone}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Status badge */}
                                    <div>
                                        <span className={`inline-flex items-center gap-1 text-xs
                                            px-2 py-0.5 rounded-full font-medium
                                            ${isActive
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-gray-100 text-gray-600'
                                            }`}
                                        >
                                            <span className={`w-1.5 h-1.5 rounded-full
                                                ${isActive
                                                    ? 'bg-green-500 animate-pulse'
                                                    : 'bg-gray-400'
                                                }`}
                                            />
                                            {isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>

                                    {/* Campaign */}
                                    {campaign?.name && (
                                        <div className="text-xs text-blue-600 font-medium
                                                        bg-blue-50 px-2 py-1 rounded truncate">
                                            {campaign.name}
                                        </div>
                                    )}

                                    {/* Stats */}
                                    <div className="space-y-1.5 border-t border-gray-100 pt-2">
                                        {speed != null && (
                                            <div className="flex items-center gap-2 text-xs text-gray-600">
                                                <Gauge size={12} />
                                                <span>{Number(speed).toFixed(1)} km/h</span>
                                            </div>
                                        )}
                                        {heading != null && (
                                            <div className="flex items-center gap-2 text-xs text-gray-600">
                                                <Navigation size={12} />
                                                <span>Heading {Number(heading).toFixed(0)}°</span>
                                            </div>
                                        )}
                                        {accuracy != null && (
                                            <div className="flex items-center gap-2 text-xs text-gray-600">
                                                <MapPin size={12} />
                                                <span>±{Number(accuracy).toFixed(0)} m accuracy</span>
                                            </div>
                                        )}
                                        {timeAgo && (
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <Clock size={12} />
                                                <span>{timeAgo}</span>
                                            </div>
                                        )}
                                    </div>

                                    <Button
                                        size="xs"
                                        variant="light"
                                        fullWidth
                                        onClick={() => onMarkerClick?.(location)}
                                    >
                                        View full route
                                    </Button>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>

            {emptyOverlay}

            <style>{`
                @keyframes ripple {
                    0%   { transform: scale(1);   opacity: .2; }
                    100% { transform: scale(2.5); opacity: 0;  }
                }
            `}</style>
        </div>
    );
}