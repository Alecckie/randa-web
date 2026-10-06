import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L, { DivIcon } from 'leaflet';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';
import { Checkbox, Loader } from '@mantine/core';
import { Users } from 'lucide-react';

// Types for leaflet.heat are declared in resources/js/types/leaflet-heat.d.ts

type HeatPoint = [number, number, number]; // [lat, lng, intensity]

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

function riderColor(riderId: number): string {
    return RIDER_COLORS[riderId % RIDER_COLORS.length];
}

function initials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ── Internal map layer controllers ─────────────────────────────────────────────

interface HeatLayerControllerProps {
    points: HeatPoint[];
    maxIntensity: number;
}

function HeatLayerController({ points, maxIntensity }: HeatLayerControllerProps) {
    const map = useMap();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const heatRef = useRef<any>(null);

    useEffect(() => {
        // leaflet.heat patches L as a side-effect, no named export needed
        // @ts-ignore – no published @types package for leaflet.heat
        import('leaflet.heat').then(() => {
            if (heatRef.current) {
                map.removeLayer(heatRef.current);
            }

            // Normalize intensities to 0–1 range so the gradient is meaningful
            const max = maxIntensity > 0 ? maxIntensity : 1;
            const normalized: HeatPoint[] = points.map(
                ([lat, lng, intensity]) => [lat, lng, intensity / max]
            );

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            heatRef.current = (L as any).heatLayer(normalized, {
                radius: 25,
                blur: 18,
                maxZoom: 17,
                minOpacity: 0.35,
                gradient: {
                    0.2: '#3b82f6', // blue   – sparse
                    0.4: '#06b6d4', // cyan
                    0.6: '#84cc16', // lime
                    0.8: '#facc15', // yellow
                    1.0: '#ef4444', // red    – dense
                },
            });

            heatRef.current.addTo(map);
        });

        return () => {
            if (heatRef.current) {
                map.removeLayer(heatRef.current);
                heatRef.current = null;
            }
        };
    }, [points, maxIntensity, map]);

    return null;
}

function riderMarkerIcon(participant: Participant): DivIcon {
    const color = riderColor(participant.id);

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
                color: white;
                font-size: 11px;
                font-weight: 700;
                ${participant.is_live ? 'animation: pulse 2s infinite;' : 'opacity: 0.7;'}
            ">${initials(participant.name)}</div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16],
    });
}

interface MarkerLayerControllerProps {
    participants: Participant[];
}

function MarkerLayerController({ participants }: MarkerLayerControllerProps) {
    return (
        <>
            {participants.map((p) => (
                <Marker key={p.id} position={[p.latitude, p.longitude]} icon={riderMarkerIcon(p)}>
                    <Popup>
                        <div className="text-sm">
                            <p className="font-semibold">{p.name}</p>
                            <p className="text-xs text-gray-500">
                                {p.is_live ? p.last_seen_human : `Last seen ${p.last_seen_human}`}
                            </p>
                        </div>
                    </Popup>
                </Marker>
            ))}
        </>
    );
}

interface RouteLayerControllerProps {
    routes: RiderRoute[];
}

function RouteLayerController({ routes }: RouteLayerControllerProps) {
    return (
        <>
            {routes
                .filter((r) => r.points.length > 1)
                .map((r) => (
                    <Polyline
                        key={r.rider_id}
                        positions={r.points}
                        pathOptions={{ color: riderColor(r.rider_id), weight: 4, opacity: 0.7 }}
                    />
                ))}
        </>
    );
}

// ── Public component ──────────────────────────────────────────────────────────

export type HeatmapPeriod = 'today' | '7days' | '30days' | 'custom';
export type HeatmapMode = 'heat' | 'markers';

interface LiveHeatmapProps {
    /** Single campaign to scope data to (advertiser view) */
    campaignId?: number | null;
    /** Multiple campaign IDs to subscribe to live updates */
    campaignIds?: number[];
    height?: number | string;
    period?: HeatmapPeriod;
    /** Required when period === 'custom' — the single day to view, 'YYYY-MM-DD' */
    customDate?: string | null;
    /** Override the heatmap data API endpoint (default: advertiser endpoint) */
    apiEndpoint?: string;
    /** 'heat' renders a density heatmap, 'markers' renders one pin per rider */
    mode?: HeatmapMode;
    /**
     * Show the rider roster sidebar (names, checkboxes, live dots). Default
     * true. Advertiser-facing views must pass false — advertisers get proof
     * of movement only, never rider identity (the API also never sends
     * participant data for those endpoints, this is defense in depth).
     */
    showRoster?: boolean;
}

interface Participant {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    last_seen: string;
    last_seen_human: string;
    is_live: boolean;
}

interface RiderRoute {
    rider_id: number;
    points: [number, number][];
}

export default function LiveHeatmap({
    campaignId,
    campaignIds = [],
    height = 400,
    period = 'today',
    customDate = null,
    apiEndpoint = '/advertiser/tracking/heatmap',
    mode = 'heat',
    showRoster = true,
}: LiveHeatmapProps) {
    const [points, setPoints] = useState<HeatPoint[]>([]);
    const [maxIntensity, setMaxIntensity] = useState(1);
    const [loading, setLoading] = useState(true);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [routes, setRoutes] = useState<RiderRoute[]>([]);
    const [selectedRiderIds, setSelectedRiderIds] = useState<number[]>([]);

    const todayStr = new Date().toISOString().split('T')[0];

    // The single calendar day this view resolves to, if any — 'today' and a
    // 'custom' date both resolve to one day; 7/30-day rollups don't.
    const resolvedSingleDate =
        period === 'today' ? todayStr : period === 'custom' && customDate ? customDate : null;

    const isSingleDay = resolvedSingleDate !== null;
    // Only today's data moves — a past single day or a multi-day rollup
    // shouldn't churn on a timer or via websocket pushes.
    const isLivePeriod = resolvedSingleDate === todayStr;

    const selectedKey = selectedRiderIds.join(',');

    // ── Fetch heatmap/marker data (+ who's currently live) ────────────────────

    useEffect(() => {
        // Custom day selected but no date chosen yet — nothing to fetch.
        if (period === 'custom' && !customDate) {
            setPoints([]);
            setParticipants([]);
            setRoutes([]);
            setLoading(false);
            return;
        }

        const fetchHeatmap = async (isBackgroundRefresh = false) => {
            try {
                if (!isBackgroundRefresh) setLoading(true);

                const params: Record<string, string | number | number[]> = {};

                if (campaignId) {
                    params.campaign_id = campaignId;
                }

                if (selectedRiderIds.length > 0) {
                    params.rider_ids = selectedRiderIds;
                }

                if (period === 'today') {
                    params.date_from = todayStr;
                    params.date_to   = todayStr;
                } else if (period === '7days') {
                    const from = new Date();
                    from.setDate(from.getDate() - 7);
                    params.date_from = from.toISOString().split('T')[0];
                    params.date_to   = todayStr;
                } else if (period === '30days') {
                    const from = new Date();
                    from.setDate(from.getDate() - 30);
                    params.date_from = from.toISOString().split('T')[0];
                    params.date_to   = todayStr;
                } else if (period === 'custom' && customDate) {
                    params.date_from = customDate;
                    params.date_to   = customDate;
                }

                const res = await axios.get(apiEndpoint, { params });
                const data = res.data?.data;

                if (data?.points) {
                    setPoints(
                        (data.points as Array<{ lat: number; lng: number; intensity: number }>).map(
                            (p) => [p.lat, p.lng, p.intensity]
                        )
                    );
                    setMaxIntensity(data.max_intensity || 1);
                }
                setParticipants(data?.participants ?? []);
                setRoutes(
                    (data?.routes ?? []).map((r: { rider_id: number; points: [number, number][] }) => ({
                        rider_id: r.rider_id,
                        points: r.points,
                    }))
                );
            } catch (err) {
                console.error('[LiveHeatmap] fetch failed', err);
            } finally {
                if (!isBackgroundRefresh) setLoading(false);
            }
        };

        fetchHeatmap();

        // Who's "live" changes as riders move/stop even when the selected
        // period/campaign doesn't. Only worth polling for "today" — a past
        // period's data never changes underneath the admin. Plain polling —
        // no WebSocket/broadcast dependency — is the only refresh mechanism
        // here, so this interval is deliberately tighter than it needs to be
        // if there were an instant push layer on top of it.
        if (!isLivePeriod) return;

        const liveRefreshInterval = window.setInterval(() => fetchHeatmap(true), 10000);
        return () => window.clearInterval(liveRefreshInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [campaignId, period, customDate, apiEndpoint, selectedKey, isLivePeriod]);

    const displayedParticipants = useMemo(() => {
        const withPosition = participants.filter((p) => p.latitude && p.longitude);
        if (selectedRiderIds.length === 0) return withPosition;
        return withPosition.filter((p) => selectedRiderIds.includes(p.id));
    }, [participants, selectedRiderIds]);

    const displayedRoutes = useMemo(() => {
        if (selectedRiderIds.length === 0) return routes;
        return routes.filter((r) => selectedRiderIds.includes(r.rider_id));
    }, [routes, selectedRiderIds]);

    const toggleRider = (riderId: number) => {
        setSelectedRiderIds((prev) =>
            prev.includes(riderId) ? prev.filter((id) => id !== riderId) : [...prev, riderId]
        );
    };

    const filterActive = selectedRiderIds.length > 0;

    // Belt-and-suspenders: identity-bearing markers/routes/roster can only
    // render when the caller explicitly opts into showing rider identity.
    const effectiveMode: HeatmapMode = showRoster ? mode : 'heat';

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <div className="flex flex-col md:flex-row gap-3" style={{ height }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 0, height: '100%' }}>
                {loading && (
                    <div
                        className="absolute inset-0 z-[500] flex items-center justify-center rounded-lg"
                        style={{ background: 'rgba(255,255,255,0.7)' }}
                    >
                        <Loader size="md" />
                    </div>
                )}

                <MapContainer
                    center={[-1.286389, 36.817223]} // Nairobi default
                    zoom={12}
                    style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}
                    scrollWheelZoom
                >
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    />

                    {effectiveMode === 'heat' && points.length > 0 && (
                        <HeatLayerController points={points} maxIntensity={maxIntensity} />
                    )}

                    {effectiveMode === 'markers' && isSingleDay && displayedRoutes.length > 0 && (
                        <RouteLayerController routes={displayedRoutes} />
                    )}

                    {effectiveMode === 'markers' && displayedParticipants.length > 0 && (
                        <MarkerLayerController participants={displayedParticipants} />
                    )}
                </MapContainer>

                {/* Gradient legend (heat mode only) */}
                {effectiveMode === 'heat' && (
                    <div className="absolute bottom-3 right-3 z-[1000] bg-white/90 dark:bg-gray-800/90 px-3 py-2 rounded-lg shadow text-xs">
                        <p className="font-semibold mb-1 text-gray-700 dark:text-gray-200">Rider Density</p>
                        <div
                            className="h-3 w-32 rounded"
                            style={{
                                background:
                                    'linear-gradient(to right, #3b82f6, #06b6d4, #84cc16, #facc15, #ef4444)',
                            }}
                        />
                        <div className="flex justify-between mt-0.5 text-gray-500 dark:text-gray-400">
                            <span>Low</span>
                            <span>High</span>
                        </div>
                    </div>
                )}

                {/* Empty state overlay */}
                {!loading && (effectiveMode === 'heat' ? points.length === 0 : displayedParticipants.length === 0) && (
                    <div className="absolute inset-0 z-[400] flex items-center justify-center pointer-events-none">
                        <div className="text-center bg-white/80 dark:bg-gray-800/80 rounded-xl p-6 shadow">
                            <div className="text-4xl mb-2">🗺️</div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                                No tracking data for this period
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Rider roster — always shows every participant; check one or more
                to filter the map down to just those riders. Never rendered
                for advertiser-facing views (showRoster=false): advertisers
                get proof-of-movement only, never rider identity. */}
            {showRoster && (
                <div
                    className="flex-shrink-0 w-full md:w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden flex flex-col"
                    style={{ maxHeight: '100%' }}
                >
                    <div className="px-3 py-2.5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-2 flex-shrink-0">
                        <div className="flex items-center gap-2">
                            <Users size={16} className="text-gray-500 dark:text-gray-400" />
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                {participants.length} rider{participants.length !== 1 ? 's' : ''}
                            </span>
                        </div>
                        {filterActive && (
                            <button
                                type="button"
                                onClick={() => setSelectedRiderIds([])}
                                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                            >
                                Show all
                            </button>
                        )}
                    </div>
                    <div className="overflow-y-auto flex-1">
                        {participants.length === 0 ? (
                            <p className="text-xs text-gray-400 dark:text-gray-500 px-3 py-4 text-center">
                                No riders sent location for this selection.
                            </p>
                        ) : (
                            participants.map((rider) => (
                                <label
                                    key={rider.id}
                                    className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/50 last:border-0 flex items-center gap-2 cursor-pointer"
                                >
                                    <Checkbox
                                        size="xs"
                                        checked={selectedRiderIds.includes(rider.id)}
                                        onChange={() => toggleRider(rider.id)}
                                    />
                                    <span
                                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                            rider.is_live ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                                        }`}
                                    />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm text-gray-800 dark:text-gray-100 truncate">{rider.name}</p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500">
                                            {rider.is_live ? rider.last_seen_human : `Last seen ${rider.last_seen_human}`}
                                        </p>
                                    </div>
                                </label>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Pulse animation for live marker pins */}
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
        </div>
    );
}
