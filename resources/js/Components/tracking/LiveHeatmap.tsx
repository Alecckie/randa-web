import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';
import { Loader } from '@mantine/core';

// Types for leaflet.heat are declared in resources/js/types/leaflet-heat.d.ts

type HeatPoint = [number, number, number]; // [lat, lng, intensity]

// ── Internal map layer controller ─────────────────────────────────────────────

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

// ── Public component ──────────────────────────────────────────────────────────

export type HeatmapPeriod = 'today' | '7days' | '30days';

interface LiveHeatmapProps {
    /** Single campaign to scope data to (advertiser view) */
    campaignId?: number | null;
    /** Multiple campaign IDs to subscribe to live updates */
    campaignIds?: number[];
    height?: number | string;
    period?: HeatmapPeriod;
    /** Override the heatmap data API endpoint (default: advertiser endpoint) */
    apiEndpoint?: string;
}

export default function LiveHeatmap({
    campaignId,
    campaignIds = [],
    height = 400,
    period = 'today',
    apiEndpoint = '/advertiser/tracking/heatmap',
}: LiveHeatmapProps) {
    const [points, setPoints] = useState<HeatPoint[]>([]);
    const [maxIntensity, setMaxIntensity] = useState(1);
    const [loading, setLoading] = useState(true);

    // ── Fetch historical heatmap data ─────────────────────────────────────────

    useEffect(() => {
        const fetchHeatmap = async () => {
            try {
                setLoading(true);

                const params: Record<string, string | number> = {};

                if (campaignId) {
                    params.campaign_id = campaignId;
                }

                const today = new Date().toISOString().split('T')[0];

                if (period === 'today') {
                    params.date_from = today;
                    params.date_to   = today;
                } else if (period === '7days') {
                    const from = new Date();
                    from.setDate(from.getDate() - 7);
                    params.date_from = from.toISOString().split('T')[0];
                    params.date_to   = today;
                } else if (period === '30days') {
                    const from = new Date();
                    from.setDate(from.getDate() - 30);
                    params.date_from = from.toISOString().split('T')[0];
                    params.date_to   = today;
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
            } catch (err) {
                console.error('[LiveHeatmap] fetch failed', err);
            } finally {
                setLoading(false);
            }
        };

        fetchHeatmap();
    }, [campaignId, period]);

    // ── Live WebSocket updates ─────────────────────────────────────────────────

    useEffect(() => {
        const ids = campaignId ? [campaignId] : campaignIds;
        if (ids.length === 0 || !window.Echo) return;

        ids.forEach((id) => {
            window.Echo
                .private(`campaign.${id}`)
                // The event class broadcasts as 'GpsPointRecorded'
                .listen('.GpsPointRecorded', (e: { latitude: number; longitude: number }) => {
                    if (!e.latitude || !e.longitude) return;
                    // Append new point with intensity=1; it will naturally stand out
                    // as a fresh hit on top of the historical distribution.
                    setPoints((prev) => [...prev, [e.latitude, e.longitude, 1]]);
                });
        });

        return () => {
            ids.forEach((id) => window.Echo?.leave(`campaign.${id}`));
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [campaignId, campaignIds.join(',')]);

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <div style={{ height, position: 'relative' }}>
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

                {points.length > 0 && (
                    <HeatLayerController points={points} maxIntensity={maxIntensity} />
                )}
            </MapContainer>

            {/* Gradient legend */}
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

            {/* Empty state overlay */}
            {!loading && points.length === 0 && (
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
    );
}
