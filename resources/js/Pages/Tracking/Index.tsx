import { useState, useEffect, useCallback, useRef } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import {
    Drawer,
    Button,
    Modal,
    Text,
    Group,
    Alert,
    Badge,
    Divider,
    ScrollArea,
    Skeleton,
} from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import {
    Map  as MapIcon,
    Filter,
    List,
    AlertCircle,
    Download,
    Pause,
    Play,
    Navigation,
    Clock,
    Gauge,
    TrendingUp,
    MapPin,
} from 'lucide-react';
import TrackingMap from '@/Components/tracking/TrackingMap';
import TrackingFilters from '@/Components/tracking/TrackingFilters';
import TrackingStats from '@/Components/tracking/TrackingStats';
import RiderList from '@/Components/tracking/RiderList';
import TrackingService from '@/Services/TrackingService';
import { notifications } from '@mantine/notifications';
import type {
    TrackingPageProps,
    TrackingFilters as Filters,
    EnrichedLocation,
    TrackingStats as Stats,
    RiderListItem,
    RiderTrackingData,
    RouteLocation,
} from '@/types/tracking';

const MODAL_Z_INDEX = 2000;
const REFRESH_INTERVAL_MS = 30_000;

// ─────────────────────────────────────────────────────────────────────────────

export default function Index({
    stats: initialStats,
    campaigns,
    riders: riderOptions,
    initialData,
}: TrackingPageProps) {
    // ── State ──────────────────────────────────────────────────────────────────

    const [locations, setLocations] = useState<EnrichedLocation[]>(
        initialData?.locations ?? []
    );
    const [stats, setStats]       = useState<Stats>(initialStats);
    const [riders, setRiders]     = useState<RiderListItem[]>([]);
    const [filters, setFilters]   = useState<Filters>({
        campaign_id: null,
        rider_ids: [],
        date: new Date().toISOString().split('T')[0],
        view_mode: 'live',
    });
    const [loading, setLoading]                         = useState(false);
    const [autoRefresh, setAutoRefresh]                 = useState(true);
    const [selectedRiderId, setSelectedRiderId]         = useState<number | null>(null);
    const [selectedRiderData, setSelectedRiderData]     = useState<RiderTrackingData | null>(null);
    const [riderDetailLoading, setRiderDetailLoading]   = useState(false);

    /**
     * Route map: riderId → ordered GPS points.
     * Built when a rider marker is clicked and the route endpoint returns locations.
     */
    const [routeMap, setRouteMap] = useState<Map<number, RouteLocation[]>>(new Map());

    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const [filtersOpen, { open: openFilters, close: closeFilters }] = useDisclosure(false);
    const [ridersOpen,  { open: openRiders,  close: closeRiders  }] = useDisclosure(false);
    const [detailOpen,  { open: openDetail,  close: closeDetail  }] = useDisclosure(false);

    const isMobile  = useMediaQuery('(max-width: 768px)');
    const isTablet  = useMediaQuery('(max-width: 1024px)');

    // ── Data fetching ──────────────────────────────────────────────────────────

    const fetchTracking = useCallback(async () => {
        try {
            setLoading(true);

            const [trackingData, statsData, ridersData] = await Promise.all([
                TrackingService.getLiveTracking(filters),
                TrackingService.getDashboardStats('today'),
                TrackingService.getRidersList({
                    status: filters.view_mode === 'live' ? 'active' : 'all',
                    campaign_id: filters.campaign_id ?? undefined,
                }),
            ]);

            setLocations(trackingData?.locations ?? []);
            setStats(statsData);
            setRiders(ridersData?.data ?? []);
        } catch (err) {
            console.error('Tracking fetch failed:', err);
            notifications.show({
                title: 'Fetch failed',
                message: 'Could not load tracking data. Retrying…',
                color: 'red',
            });
        } finally {
            setLoading(false);
        }
    }, [filters]);

    // Initial fetch + re-fetch when filters change
    useEffect(() => {
        fetchTracking();
    }, [fetchTracking]);

    // Auto-refresh — only in live mode
    useEffect(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);

        if (filters.view_mode === 'live' && autoRefresh) {
            intervalRef.current = setInterval(fetchTracking, REFRESH_INTERVAL_MS);
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [filters.view_mode, autoRefresh, fetchTracking]);

    // ── Rider detail ───────────────────────────────────────────────────────────

    const handleRiderClick = useCallback(async (riderId: number) => {
        setSelectedRiderId(riderId);
        setSelectedRiderData(null);
        setRiderDetailLoading(true);
        openDetail();

        try {
            const data = await TrackingService.getRiderTracking(riderId, filters.date);
            setSelectedRiderData(data);

            // Build route map entry so the polyline renders on the map
            if (data?.locations && data.locations.length >= 2) {
                setRouteMap((prev) => {
                    const next = new Map(prev);
                    next.set(riderId, data.locations);
                    return next;
                });
            }
        } catch (err) {
            console.error('Rider detail fetch failed:', err);
            notifications.show({
                title: 'Error',
                message: 'Could not load rider route data.',
                color: 'red',
            });
        } finally {
            setRiderDetailLoading(false);
        }
    }, [filters.date, openDetail]);

    const handleMarkerClick = useCallback((location: EnrichedLocation) => {
        const riderId = location.rider_id ?? location.rider?.id;
        if (riderId != null) handleRiderClick(riderId);
    }, [handleRiderClick]);

    // ── Export ─────────────────────────────────────────────────────────────────

    const handleExport = async () => {
        try {
            await TrackingService.exportTrackingData({
                format: 'csv',
                date_from: filters.date,
                date_to: filters.date,
                campaign_id: filters.campaign_id ?? undefined,
                rider_ids: filters.rider_ids,
            });
            notifications.show({
                title: 'Export requested',
                message: 'You will receive an email when the export is ready.',
                color: 'green',
            });
        } catch {
            notifications.show({
                title: 'Export failed',
                message: 'Please try again.',
                color: 'red',
            });
        }
    };

    // ── Detail modal helpers ───────────────────────────────────────────────────

    const riderInfo  = selectedRiderData?.rider;
    const routeInfo  = selectedRiderData?.route;
    const summary    = selectedRiderData?.summary;
    const routePts   = selectedRiderData?.locations ?? [];

    const closeDetailAndClear = () => {
        closeDetail();
        // Keep routeMap so polyline stays visible after modal closes
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold
                                       text-gray-900 dark:text-white
                                       flex items-center gap-2">
                            <MapIcon size={26} />
                            Live Rider Tracking
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            Monitor rider locations and routes in real-time
                        </p>
                    </div>

                    <Group gap={8}>
                        {(isMobile || isTablet) && (
                            <>
                                <Button
                                    variant="light"
                                    leftSection={<Filter size={14} />}
                                    onClick={openFilters}
                                    size="sm"
                                    radius="md"
                                >
                                    Filters
                                </Button>
                                <Button
                                    variant="light"
                                    leftSection={<List size={14} />}
                                    onClick={openRiders}
                                    size="sm"
                                    radius="md"
                                >
                                    Riders
                                </Button>
                            </>
                        )}
                        <Button
                            variant="light"
                            leftSection={<Download size={14} />}
                            onClick={handleExport}
                            size="sm"
                            radius="md"
                        >
                            Export
                        </Button>
                    </Group>
                </div>
            }
        >
            <Head title="Rider Tracking" />

            <div className="space-y-4">

                {/* Stats */}
                <TrackingStats stats={stats} loading={loading} />

                {/* Live refresh banner */}
                {filters.view_mode === 'live' && (
                    <Alert
                        icon={<AlertCircle size={16} />}
                        color={autoRefresh ? 'green' : 'gray'}
                        variant="light"
                        radius="md"
                    >
                        <Group justify="space-between" wrap="nowrap">
                            <Text size="sm">
                                {autoRefresh
                                    ? 'Auto-refreshing every 30 seconds'
                                    : 'Auto-refresh paused'}
                            </Text>
                            <Button
                                size="xs"
                                variant="subtle"
                                leftSection={
                                    autoRefresh
                                        ? <Pause size={12} />
                                        : <Play size={12} />
                                }
                                onClick={() => setAutoRefresh((p) => !p)}
                            >
                                {autoRefresh ? 'Pause' : 'Resume'}
                            </Button>
                        </Group>
                    </Alert>
                )}

                {/* Main layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

                    {/* Sidebar — hidden on tablet/mobile */}
                    {!isTablet && (
                        <div className="lg:col-span-3 space-y-4">
                            <TrackingFilters
                                campaigns={campaigns}
                                riders={riderOptions}
                                filters={filters}
                                onFilterChange={setFilters}
                                onRefresh={fetchTracking}
                                loading={loading}
                            />
                            <RiderList
                                riders={riders}
                                onRiderClick={handleRiderClick}
                                selectedRiderId={selectedRiderId}
                                loading={loading}
                            />
                        </div>
                    )}

                    {/* Map — isolation:isolate prevents Leaflet z-index leaking */}
                    <div
                        className="lg:col-span-9"
                        style={{ isolation: 'isolate', height: '680px' }}
                    >
                        <TrackingMap
                            locations={locations}
                            routes={routeMap}
                            onMarkerClick={handleMarkerClick}
                            loading={loading}
                        />
                    </div>
                </div>

                {/* ── Mobile drawers ─────────────────────────────────────── */}

                <Drawer
                    opened={filtersOpen}
                    onClose={closeFilters}
                    title="Filters"
                    position="left"
                    size="sm"
                    styles={{ inner: { zIndex: MODAL_Z_INDEX } }}
                >
                    <TrackingFilters
                        campaigns={campaigns}
                        riders={riderOptions}
                        filters={filters}
                        onFilterChange={(f) => { setFilters(f); closeFilters(); }}
                        onRefresh={() => { fetchTracking(); closeFilters(); }}
                        loading={loading}
                    />
                </Drawer>

                <Drawer
                    opened={ridersOpen}
                    onClose={closeRiders}
                    title="Riders"
                    position="right"
                    size="sm"
                    styles={{ inner: { zIndex: MODAL_Z_INDEX } }}
                >
                    <RiderList
                        riders={riders}
                        onRiderClick={(id) => { handleRiderClick(id); closeRiders(); }}
                        selectedRiderId={selectedRiderId}
                        loading={loading}
                    />
                </Drawer>

                {/* ── Rider detail modal ─────────────────────────────────── */}

                <Modal
                    opened={detailOpen}
                    onClose={closeDetailAndClear}
                    title={
                        <Group gap={8}>
                            <Navigation size={18} className="text-blue-500" />
                            <Text fw={600}>Route details</Text>
                        </Group>
                    }
                    size="lg"
                    centered
                    zIndex={MODAL_Z_INDEX}
                    radius="lg"
                    styles={{
                        overlay: { zIndex: MODAL_Z_INDEX - 1 },
                        inner:   { zIndex: MODAL_Z_INDEX },
                    }}
                >
                    {riderDetailLoading ? (
                        <div className="space-y-3 py-2">
                            <Skeleton height={20} width="60%" />
                            <Skeleton height={12} width="40%" />
                            <Divider my="sm" />
                            <div className="grid grid-cols-2 gap-3">
                                {[1,2,3,4].map((i) => (
                                    <div key={i} className="space-y-1">
                                        <Skeleton height={10} width="50%" />
                                        <Skeleton height={24} width="70%" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : selectedRiderData ? (
                        <ScrollArea>
                            <div className="space-y-4 pb-2">

                                {/* Rider header */}
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-500
                                                    flex items-center justify-center
                                                    text-white font-bold text-sm flex-shrink-0">
                                        {riderInfo?.name?.charAt(0).toUpperCase() ?? '?'}
                                    </div>
                                    <div>
                                        <Text fw={600} size="md">
                                            {riderInfo?.name ?? 'Unknown Rider'}
                                        </Text>
                                        {riderInfo?.email && (
                                            <Text size="xs" c="dimmed">{riderInfo.email}</Text>
                                        )}
                                        {riderInfo?.phone && (
                                            <Text size="xs" c="dimmed">{riderInfo.phone}</Text>
                                        )}
                                    </div>
                                </div>

                                {/* Route status badge */}
                                {routeInfo && (
                                    <Badge
                                        variant="light"
                                        color={routeInfo.tracking_status === 'active' ? 'green' : 'gray'}
                                    >
                                        {routeInfo.tracking_status}
                                    </Badge>
                                )}

                                <Divider />

                                {/* Summary grid */}
                                {summary ? (
                                    <div className="grid grid-cols-2 gap-4">
                                        <StatItem
                                            icon={<MapPin size={16} className="text-green-500" />}
                                            label="Distance"
                                            value={`${Number(summary.distance).toFixed(2)} km`}
                                        />
                                        <StatItem
                                            icon={<Clock size={16} className="text-blue-500" />}
                                            label="Duration"
                                            value={
                                                summary.duration != null
                                                    ? `${Math.floor(summary.duration / 60)}h ${summary.duration % 60}m`
                                                    : '—'
                                            }
                                        />
                                        <StatItem
                                            icon={<Gauge size={16} className="text-orange-500" />}
                                            label="Avg speed"
                                            value={
                                                summary.avg_speed != null
                                                    ? `${Number(summary.avg_speed).toFixed(1)} km/h`
                                                    : '—'
                                            }
                                        />
                                        <StatItem
                                            icon={<TrendingUp size={16} className="text-purple-500" />}
                                            label="Coverage areas"
                                            value={summary.coverage_areas_count.toString()}
                                        />
                                    </div>
                                ) : (
                                    <Text size="sm" c="dimmed">No route summary available for this date.</Text>
                                )}

                                {/* Route timing */}
                                {routeInfo && (
                                    <>
                                        <Divider />
                                        <div className="grid grid-cols-2 gap-4">
                                            <StatItem
                                                icon={<Clock size={16} className="text-gray-400" />}
                                                label="Started at"
                                                value={
                                                    routeInfo.started_at
                                                        ? new Date(routeInfo.started_at).toLocaleTimeString()
                                                        : '—'
                                                }
                                            />
                                            <StatItem
                                                icon={<Clock size={16} className="text-gray-400" />}
                                                label="Ended at"
                                                value={
                                                    routeInfo.ended_at
                                                        ? new Date(routeInfo.ended_at).toLocaleTimeString()
                                                        : 'Ongoing'
                                                }
                                            />
                                        </div>
                                    </>
                                )}

                                {/* Point count */}
                                <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50
                                                border border-gray-200 dark:border-gray-700
                                                px-4 py-3">
                                    <Text size="xs" c="dimmed" mb={2}>GPS points recorded</Text>
                                    <Text fw={600}>{routePts.length.toLocaleString()}</Text>
                                </div>

                                {/* Pause history */}
                                {routeInfo?.pause_history && routeInfo.pause_history.length > 0 && (
                                    <>
                                        <Divider label="Pause history" labelPosition="left" />
                                        <div className="space-y-2">
                                            {routeInfo.pause_history.map((p, i) => (
                                                <div key={i}
                                                     className="flex items-center justify-between
                                                                text-xs text-gray-600 dark:text-gray-400
                                                                bg-gray-50 dark:bg-gray-800/50
                                                                rounded-md px-3 py-2">
                                                    <span>
                                                        {new Date(p.paused_at).toLocaleTimeString()}
                                                        {' → '}
                                                        {new Date(p.resumed_at).toLocaleTimeString()}
                                                    </span>
                                                    <Badge size="xs" variant="light">
                                                        {p.duration_minutes} min
                                                    </Badge>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </ScrollArea>
                    ) : (
                        <Text size="sm" c="dimmed">No data available for this rider.</Text>
                    )}
                </Modal>
            </div>
        </AuthenticatedLayout>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Small helper component — avoids repetition in the modal grid
// ─────────────────────────────────────────────────────────────────────────────

function StatItem({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
}) {
    return (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg
                        border border-gray-200 dark:border-gray-700 px-4 py-3">
            <div className="flex items-center gap-1.5 mb-1">
                {icon}
                <Text size="xs" c="dimmed">{label}</Text>
            </div>
            <Text fw={600} size="md">{value}</Text>
        </div>
    );
}