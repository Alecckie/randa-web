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

export default function Index({ 
    stats: initialStats, 
    campaigns, 
    riders: riderOptions,
    initialData 
}: TrackingPageProps) {
    // State
    const [locations, setLocations] = useState<EnrichedLocation[]>(initialData.locations);
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

    // Drawers for mobile
    const [filtersOpened, { open: openFilters, close: closeFilters }] = useDisclosure(false);
    const [ridersOpened, { open: openRiders, close: closeRiders }] = useDisclosure(false);
    const [detailsOpened, { open: openDetails, close: closeDetails }] = useDisclosure(false);

    // Responsive
    const isMobile = useMediaQuery('(max-width: 768px)');
    const isTablet = useMediaQuery('(max-width: 1024px)');

    // Fetch tracking data
    const fetchTrackingData = useCallback(async () => {
        try {
            setLoading(true);
            
            // Fetch live tracking data
            const trackingData = await TrackingService.getLiveTracking(filters);
            setLocations(trackingData.locations);

            // Fetch updated stats
            const updatedStats = await TrackingService.getDashboardStats(
                filters.view_mode === 'live' ? 'today' : 'today'
            );
            setStats(updatedStats);

            // Fetch riders list
            const ridersData = await TrackingService.getRidersList({
                status: filters.view_mode === 'live' ? 'active' : 'all',
                campaign_id: filters.campaign_id || undefined,
            });
            setRiders(ridersData.data);

        } catch (error) {
            console.error('Failed to fetch tracking data:', error);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    // Initial load
    useEffect(() => {
        fetchTrackingData();
    }, [fetchTrackingData]);

    // Auto-refresh for live view
    useEffect(() => {
        if (filters.view_mode === 'live' && autoRefreshEnabled) {
            const interval = setInterval(() => {
                fetchTrackingData();
            }, 30000); // 30 seconds

            return () => clearInterval(interval);
        }
    }, [filters.view_mode, autoRefreshEnabled, fetchTrackingData]);

    // Handle filter changes
    const handleFilterChange = (newFilters: Filters) => {
        setFilters(newFilters);
    };

    // Handle rider click
    const handleRiderClick = async (riderId: number) => {
        try {
            setSelectedRiderId(riderId);
            const riderData = await TrackingService.getRiderTracking(riderId, filters.date);
            setSelectedRiderData(riderData);
            openDetails();
        } catch (error) {
            console.error('Failed to fetch rider data:', error);
        }
    };

    // Handle marker click
    const handleMarkerClick = (location: EnrichedLocation) => {
        handleRiderClick(location.rider_id);
    };

    // Export data
    const handleExport = async () => {
        try {
            await TrackingService.exportTrackingData({
                format: 'csv',
                date_from: filters.date,
                date_to: filters.date,
                campaign_id: filters.campaign_id || undefined,
                rider_ids: filters.rider_ids,
            });
            // Show success message
            alert('Export request submitted. You will receive an email when ready.');
        } catch (error) {
            console.error('Export failed:', error);
        }
    };

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

                    {/* Mobile Filter Buttons */}
                    {(isMobile || isTablet) && (
                        <Group>
                            <Button
                                variant="light"
                                leftSection={<FilterIcon size={16} />}
                                onClick={openFilters}
                                size="sm"
                            >
                                Filters
                            </Button>
                            <Button
                                variant="light"
                                leftSection={<ListIcon size={16} />}
                                onClick={openRiders}
                                size="sm"
                            >
                                Riders
                            </Button>
                        </Group>
                    )}

                    {/* Export Button - Desktop */}
                    {!isMobile && (
                        <Button
                            variant="light"
                            leftSection={<DownloadIcon size={16} />}
                            onClick={handleExport}
                            size="sm"
                        >
                            Export Data
                        </Button>
                    )}
                </div>
            }
        >
            <Head title="Rider Tracking" />

            <div className="space-y-6">
                {/* Stats Cards */}
                <TrackingStats stats={stats} loading={loading} />

                {/* Live View Alert */}
                {filters.view_mode === 'live' && autoRefreshEnabled && (
                    <Alert 
                        icon={<AlertCircleIcon size={16} />} 
                        color="green"
                        variant="light"
                    >
                        <Group justify="space-between">
                            <Text size="sm">
                                Live tracking active - Auto-refreshing every 30 seconds
                            </Text>
                            <Button
                                size="xs"
                                variant="subtle"
                                onClick={() => setAutoRefreshEnabled(false)}
                            >
                                Pause
                            </Button>
                        </Group>
                    </Alert>
                )}

                {/* Main Content - Desktop Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Sidebar - Filters (Desktop Only) */}
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

                    {/* Map - Main Content */}
                    <div className="lg:col-span-9">
                        <div style={{ height: '700px' }}>
                            <TrackingMap
                                locations={locations}
                                onMarkerClick={handleMarkerClick}
                                loading={loading}
                            />
                        </div>
                    </div>
                </div>

                {/* Mobile Filters Drawer */}
                <Drawer
                    opened={filtersOpened}
                    onClose={closeFilters}
                    title="Filters"
                    position="left"
                    size="sm"
                >
                    <TrackingFilters
                        campaigns={campaigns}
                        riders={riderOptions}
                        filters={filters}
                        onFilterChange={(newFilters) => {
                            handleFilterChange(newFilters);
                            closeFilters();
                        }}
                        onRefresh={fetchTrackingData}
                        loading={loading}
                    />
                </Drawer>

                {/* Mobile Riders Drawer */}
                <Drawer
                    opened={ridersOpened}
                    onClose={closeRiders}
                    title="Active Riders"
                    position="right"
                    size="sm"
                >
                    <RiderList
                        riders={riders}
                        onRiderClick={(riderId) => {
                            handleRiderClick(riderId);
                            closeRiders();
                        }}
                        selectedRiderId={selectedRiderId}
                        loading={loading}
                    />
                </Drawer>

                {/* Rider Details Modal */}
                <Modal
                    opened={detailsOpened}
                    onClose={closeDetails}
                    title="Rider Route Details"
                    size="lg"
                    centered
                >
                    {selectedRiderData && (
                        <div className="space-y-4">
                            <div>
                                <Text size="lg" fw={600}>
                                    {selectedRiderData.rider.name}
                                </Text>
                                <Text size="sm" c="dimmed">
                                    {selectedRiderData.rider.email}
                                </Text>
                            </div>

                            {selectedRiderData.summary && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Text size="xs" c="dimmed">Distance</Text>
                                        <Text size="lg" fw={600}>
                                            {selectedRiderData.summary.distance.toFixed(1)} km
                                        </Text>
                                    </div>
                                    <div>
                                        <Text size="xs" c="dimmed">Duration</Text>
                                        <Text size="lg" fw={600}>
                                            {Math.floor(selectedRiderData.summary.duration / 60)}h {selectedRiderData.summary.duration % 60}m
                                        </Text>
                                    </div>
                                    <div>
                                        <Text size="xs" c="dimmed">Avg Speed</Text>
                                        <Text size="lg" fw={600}>
                                            {selectedRiderData.summary.avg_speed.toFixed(1)} km/h
                                        </Text>
                                    </div>
                                    <div>
                                        <Text size="xs" c="dimmed">Coverage Areas</Text>
                                        <Text size="lg" fw={600}>
                                            {selectedRiderData.summary.coverage_areas_count}
                                        </Text>
                                    </div>
                                </div>
                            )}

                            <div>
                                <Text size="sm" fw={500} mb="xs">
                                    Location Points: {selectedRiderData.locations.length}
                                </Text>
                            </div>
                        </div>
                    )}
                </Modal>
            </div>
        </AuthenticatedLayout>
    );
}