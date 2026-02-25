import { useState, useEffect, useCallback } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { Drawer, Button, Modal, Text, Group, Alert } from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import {
    MapIcon,
    FilterIcon,
    ListIcon,
    AlertCircleIcon,
    DownloadIcon
} from 'lucide-react';
import TrackingMap from '@/Components/tracking/TrackingMap';
import TrackingFilters from '@/Components/tracking/TrackingFilters';
import TrackingStats from '@/Components/tracking/TrackingStats';
import RiderList from '@/Components/tracking/RiderList';
import TrackingService from '@/Services/TrackingService';
import type {
    TrackingPageProps,
    TrackingFilters as Filters,
    EnrichedLocation,
    TrackingStats as Stats,
    RiderListItem,
    RiderTrackingData
} from '@/types/tracking';

// Leaflet uses z-index 400–1000 for its own layers and controls.
// Mantine's default Modal z-index is 200, which falls beneath Leaflet.
// Setting it to 2000 ensures it always renders on top.
const MODAL_Z_INDEX = 2000;

export default function Index({
    stats: initialStats,
    campaigns,
    riders: riderOptions,
    initialData
}: TrackingPageProps) {
    const [locations, setLocations] = useState<EnrichedLocation[]>(
        initialData?.locations ?? []
    );
    const [stats, setStats] = useState<Stats>(initialStats);
    const [riders, setRiders] = useState<RiderListItem[]>([]);
    const [filters, setFilters] = useState<Filters>({
        campaign_id: null,
        rider_ids: [],
        date: new Date().toISOString().split('T')[0],
        view_mode: 'live',
    });
    const [loading, setLoading] = useState(false);
    const [selectedRiderId, setSelectedRiderId] = useState<number | null>(null);
    const [selectedRiderData, setSelectedRiderData] = useState<RiderTrackingData | null>(null);
    const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);

    const [filtersOpened, { open: openFilters, close: closeFilters }] = useDisclosure(false);
    const [ridersOpened, { open: openRiders, close: closeRiders }] = useDisclosure(false);
    const [detailsOpened, { open: openDetails, close: closeDetails }] = useDisclosure(false);

    const isMobile = useMediaQuery('(max-width: 768px)');
    const isTablet = useMediaQuery('(max-width: 1024px)');

    // ── Data fetching ──────────────────────────────────────────────────────────

    const fetchTrackingData = useCallback(async () => {
        try {
            setLoading(true);

            const trackingData = await TrackingService.getLiveTracking(filters);
            setLocations(trackingData?.locations ?? []);

            const updatedStats = await TrackingService.getDashboardStats('today');
            setStats(updatedStats);

            const ridersData = await TrackingService.getRidersList({
                status: filters.view_mode === 'live' ? 'active' : 'all',
                campaign_id: filters.campaign_id ?? undefined,
            });
            setRiders(ridersData?.data ?? []);

        } catch (error) {
            console.error('Failed to fetch tracking data:', error);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchTrackingData();
    }, [fetchTrackingData]);

    useEffect(() => {
        if (filters.view_mode !== 'live' || !autoRefreshEnabled) return;

        const interval = setInterval(fetchTrackingData, 30_000);
        return () => clearInterval(interval);
    }, [filters.view_mode, autoRefreshEnabled, fetchTrackingData]);

    // ── Handlers ───────────────────────────────────────────────────────────────

    const handleFilterChange = (newFilters: Filters) => setFilters(newFilters);

    const handleRiderClick = async (riderId: number) => {
        try {
            setSelectedRiderId(riderId);
            const riderData = await TrackingService.getRiderTracking(riderId, filters.date);
            setSelectedRiderData(riderData ?? null);
            openDetails();
        } catch (error) {
            console.error('Failed to fetch rider data:', error);
        }
    };

    const handleMarkerClick = (location: EnrichedLocation) => {
        if (location?.rider_id != null) {
            handleRiderClick(location.rider_id);
        }
    };

    const handleExport = async () => {
        try {
            await TrackingService.exportTrackingData({
                format: 'csv',
                date_from: filters.date,
                date_to: filters.date,
                campaign_id: filters.campaign_id ?? undefined,
                rider_ids: filters.rider_ids,
            });
            alert('Export request submitted. You will receive an email when ready.');
        } catch (error) {
            console.error('Export failed:', error);
        }
    };

    // ── Derived values for the modal ───────────────────────────────────────────

    const rider    = selectedRiderData?.rider;
    const summary  = selectedRiderData?.summary;
    const locations_ = selectedRiderData?.locations;

    const avgSpeed = summary?.avg_speed;
    const distance = summary?.distance;
    const duration = summary?.duration;

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <MapIcon size={28} />
                            Live Rider Tracking
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Monitor rider locations and routes in real-time
                        </p>
                    </div>

                    {(isMobile || isTablet) && (
                        <Group>
                            <Button variant="light" leftSection={<FilterIcon size={16} />} onClick={openFilters} size="sm">
                                Filters
                            </Button>
                            <Button variant="light" leftSection={<ListIcon size={16} />} onClick={openRiders} size="sm">
                                Riders
                            </Button>
                        </Group>
                    )}

                    {!isMobile && (
                        <Button variant="light" leftSection={<DownloadIcon size={16} />} onClick={handleExport} size="sm">
                            Export Data
                        </Button>
                    )}
                </div>
            }
        >
            <Head title="Rider Tracking" />

            <div className="space-y-6">
                <TrackingStats stats={stats} loading={loading} />

                {filters.view_mode === 'live' && autoRefreshEnabled && (
                    <Alert icon={<AlertCircleIcon size={16} />} color="green" variant="light">
                        <Group justify="space-between">
                            <Text size="sm">
                                Live tracking active — Auto-refreshing every 30 seconds
                            </Text>
                            <Button size="xs" variant="subtle" onClick={() => setAutoRefreshEnabled(false)}>
                                Pause
                            </Button>
                        </Group>
                    </Alert>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {!isTablet && (
                        <div className="lg:col-span-3 space-y-4">
                            <TrackingFilters
                                campaigns={campaigns}
                                riders={riderOptions}
                                filters={filters}
                                onFilterChange={handleFilterChange}
                                onRefresh={fetchTrackingData}
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

                    {/*
                     * The map wrapper uses isolation: isolate to create its own
                     * stacking context. This prevents Leaflet's internal z-indexes
                     * from leaking out and competing with the Modal overlay.
                     */}
                    <div className="lg:col-span-9" style={{ isolation: 'isolate' }}>
                        <div style={{ height: '700px' }}>
                            <TrackingMap
                                locations={locations}
                                onMarkerClick={handleMarkerClick}
                                loading={loading}
                            />
                        </div>
                    </div>
                </div>

                {/* ── Mobile drawers ─────────────────────────────────────────── */}

                <Drawer opened={filtersOpened} onClose={closeFilters} title="Filters" position="left" size="sm"
                    styles={{ inner: { zIndex: MODAL_Z_INDEX } }}
                >
                    <TrackingFilters
                        campaigns={campaigns}
                        riders={riderOptions}
                        filters={filters}
                        onFilterChange={(newFilters) => { handleFilterChange(newFilters); closeFilters(); }}
                        onRefresh={fetchTrackingData}
                        loading={loading}
                    />
                </Drawer>

                <Drawer opened={ridersOpened} onClose={closeRiders} title="Active Riders" position="right" size="sm"
                    styles={{ inner: { zIndex: MODAL_Z_INDEX } }}
                >
                    <RiderList
                        riders={riders}
                        onRiderClick={(riderId) => { handleRiderClick(riderId); closeRiders(); }}
                        selectedRiderId={selectedRiderId}
                        loading={loading}
                    />
                </Drawer>

                {/* ── Rider details modal ────────────────────────────────────── */}

                {/*
                 * zIndex must exceed Leaflet's highest layer (1000).
                 * portalProps.target defaults to document.body which is correct —
                 * the modal is rendered outside the map's stacking context.
                 */}
                <Modal
                    opened={detailsOpened}
                    onClose={() => { closeDetails(); setSelectedRiderData(null); }}
                    title="Rider Route Details"
                    size="lg"
                    centered
                    zIndex={MODAL_Z_INDEX}
                    styles={{
                        overlay: { zIndex: MODAL_Z_INDEX - 1 },
                        inner:   { zIndex: MODAL_Z_INDEX },
                    }}
                >
                    {selectedRiderData ? (
                        <div className="space-y-4">

                            {/* Rider name / email */}
                            <div>
                                <Text size="lg" fw={600}>
                                    {rider?.name ?? 'Unknown Rider'}
                                </Text>
                                {rider?.email && (
                                    <Text size="sm" c="dimmed">
                                        {rider.email}
                                    </Text>
                                )}
                            </div>

                            {/* Summary grid */}
                            {summary && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Text size="xs" c="dimmed">Distance</Text>
                                        <Text size="lg" fw={600}>
                                            {distance != null ? distance.toFixed(1) : '—'} km
                                        </Text>
                                    </div>
                                    <div>
                                        <Text size="xs" c="dimmed">Duration</Text>
                                        <Text size="lg" fw={600}>
                                            {duration != null
                                                ? `${Math.floor(duration / 60)}h ${duration % 60}m`
                                                : '—'}
                                        </Text>
                                    </div>
                                    <div>
                                        <Text size="xs" c="dimmed">Avg Speed</Text>
                                        <Text size="lg" fw={600}>
                                            {avgSpeed != null ? `${avgSpeed.toFixed(1)} km/h` : '—'}
                                        </Text>
                                    </div>
                                    <div>
                                        <Text size="xs" c="dimmed">Coverage Areas</Text>
                                        <Text size="lg" fw={600}>
                                            {summary.coverage_areas_count ?? '—'}
                                        </Text>
                                    </div>
                                </div>
                            )}

                            {/* Location point count */}
                            {locations_ != null && (
                                <div>
                                    <Text size="sm" fw={500}>
                                        Location Points: {locations_.length}
                                    </Text>
                                </div>
                            )}
                        </div>
                    ) : (
                        <Text size="sm" c="dimmed">No rider data available.</Text>
                    )}
                </Modal>
            </div>
        </AuthenticatedLayout>
    );
}