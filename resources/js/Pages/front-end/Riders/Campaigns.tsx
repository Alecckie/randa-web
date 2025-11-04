import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { 
    Badge, 
    Button, 
    Card, 
    Container, 
    Drawer, 
    Grid, 
    Group, 
    Stack, 
    Text, 
    TextInput,
    Select,
    Table,
    Pagination,
    Alert,
    Paper,
    Tooltip
} from '@mantine/core';
import {
    Search,
    Filter,
    Calendar,
    Clock,
    CheckCircle,
    XCircle,
    Play,
    Pause,
    Trophy,
    TrendingUp,
    Package,
    HardHat,
    MapPin
} from 'lucide-react';
import { usePage } from '@inertiajs/react';
import type { PageProps } from '@/types';
import RiderHeader from '@/Components/frontend/layouts/RiderHeader';
import RiderSidebar from '@/Components/frontend/layouts/RiderSidebar';

interface Helmet {
    id: number;
    helmet_code: string;
    qr_code: string | null;
    status: string;
    current_branding: string | null;
}

interface Location {
    id: number;
    name: string;
}

interface CoverageArea {
    id: number;
    name: string;
    area_code: string;
    county: Location | null;
    subcounty: Location | null;
    ward: Location | null;
    full_name: string;
}

interface Assignment {
    id: number;
    assigned_at: string;
    completed_at: string | null;
    status: string;
    helmet: Helmet | null;
}

interface Campaign {
    id: number;
    name: string;
    start_date: string;
    end_date: string;
    status: string;
    duration_days: number;
    is_active: boolean;
    assignment: Assignment | null;
    coverage_areas: CoverageArea[];
}

interface Stats {
    total_campaigns: number;
    active_campaigns: number;
    completed_campaigns: number;
    total_days_worked: number;
}

interface Rider {
    id: number;
    status: string;
    wallet_balance: number;
}

interface Filters {
    status?: string;
    campaign_status?: string;
    search?: string;
    date_from?: string;
    date_to?: string;
    per_page: number;
    [key: string]: any;
}

interface CampaignsProps {
    campaigns: {
        data: Campaign[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    stats: Stats;
    filters: Filters;
    rider: Rider;
}

export default function Campaigns({ campaigns, stats, filters, rider }: CampaignsProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [localFilters, setLocalFilters] = useState(filters);
    const { auth } = usePage<PageProps>().props;
    const user = auth?.user;

    const getCampaignStatusBadge = (status: string) => {
        const statusConfig = {
            draft: { color: 'gray', label: 'Draft', icon: Clock },
            pending_payment: { color: 'yellow', label: 'Pending Payment', icon: Clock },
            paid: { color: 'blue', label: 'Paid', icon: CheckCircle },
            active: { color: 'green', label: 'Active', icon: Play },
            paused: { color: 'orange', label: 'Paused', icon: Pause },
            completed: { color: 'teal', label: 'Completed', icon: CheckCircle },
            cancelled: { color: 'red', label: 'Cancelled', icon: XCircle },
        };

        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
        const Icon = config.icon;

        return (
            <Badge
                color={config.color}
                variant="light"
                size="sm"
                leftSection={<Icon size={12} />}
            >
                {config.label}
            </Badge>
        );
    };

    const getAssignmentStatusBadge = (status: string) => {
        const statusConfig = {
            active: { color: 'green', label: 'Active' },
            completed: { color: 'teal', label: 'Completed' },
            cancelled: { color: 'red', label: 'Cancelled' },
        };

        const config = statusConfig[status as keyof typeof statusConfig];
        
        return config ? (
            <Badge color={config.color} variant="light" size="xs">
                {config.label}
            </Badge>
        ) : null;
    };

    const getHelmetStatusBadge = (status: string) => {
        const statusConfig = {
            available: { color: 'green', label: 'Available' },
            assigned: { color: 'blue', label: 'Assigned' },
            maintenance: { color: 'orange', label: 'Maintenance' },
            retired: { color: 'gray', label: 'Retired' },
        };

        const config = statusConfig[status as keyof typeof statusConfig];
        
        return config ? (
            <Badge color={config.color} variant="dot" size="xs">
                {config.label}
            </Badge>
        ) : null;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const handleFilterChange = (key: string, value: any) => {
        setLocalFilters(prev => ({ ...prev, [key]: value }));
    };

    const applyFilters = () => {
        router.get(route('rider.campaigns'), localFilters as any, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const clearFilters = () => {
        const clearedFilters = {
            status: '',
            campaign_status: '',
            search: '',
            date_from: '',
            date_to: '',
            per_page: 15,
        };
        setLocalFilters(clearedFilters);
        router.get(route('rider.campaigns'), clearedFilters as any, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handlePageChange = (page: number) => {
        router.get(route('rider.campaigns'), { ...localFilters, page } as any, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const StatCard = ({ icon: Icon, label, value, color }: any) => (
        <Paper p="md" withBorder className="h-full">
            <Group gap="sm">
                <div className={`p-2 rounded-lg bg-${color}-50 dark:bg-${color}-900/20`}>
                    <Icon size={24} className={`text-${color}-600`} />
                </div>
                <div className="flex-1">
                    <Text size="xs" c="dimmed">{label}</Text>
                    <Text size="xl" fw={700} className="text-gray-900 dark:text-white">
                        {value}
                    </Text>
                </div>
            </Group>
        </Paper>
    );

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-gray-900 flex">
            <Head title="My Campaigns" />

            {/* Desktop Sidebar */}
            <div className="hidden lg:block w-64 fixed inset-y-0 left-0 z-30">
                <RiderSidebar user={user} activeNav="campaigns" />
            </div>

            {/* Mobile Drawer */}
            <Drawer
                opened={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                size="280px"
                padding={0}
                withCloseButton={false}
            >
                <RiderSidebar user={user} activeNav="campaigns" />
            </Drawer>

            {/* Main Content */}
            <div className="flex-1 lg:ml-64">
                {/* Header */}
                <RiderHeader onMenuClick={() => setSidebarOpen(true)} rider={rider} />

                {/* Page Content */}
                <div className="p-2 sm:p-6 lg:p-4">
                    <Container size="xl">
                        {/* Page Header */}
                        <div className="mb-6">
                            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                                My Campaigns
                            </h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                View all campaigns you've been assigned to
                            </p>
                        </div>

                        {/* Statistics Cards */}
                        <Grid gutter="md" className="mb-6">
                            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                                <StatCard
                                    icon={Package}
                                    label="Total Campaigns"
                                    value={stats.total_campaigns}
                                    color="blue"
                                />
                            </Grid.Col>
                            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                                <StatCard
                                    icon={Play}
                                    label="Active Campaigns"
                                    value={stats.active_campaigns}
                                    color="green"
                                />
                            </Grid.Col>
                            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                                <StatCard
                                    icon={Trophy}
                                    label="Completed"
                                    value={stats.completed_campaigns}
                                    color="teal"
                                />
                            </Grid.Col>
                            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                                <StatCard
                                    icon={TrendingUp}
                                    label="Total Days Worked"
                                    value={stats.total_days_worked}
                                    color="purple"
                                />
                            </Grid.Col>
                        </Grid>

                        {/* Filters Section */}
                        <Card shadow="sm" padding="lg" radius="md" withBorder className="mb-6">
                            <Group justify="space-between" mb={showFilters ? "md" : 0}>
                                <Group gap="sm">
                                    <Button
                                        leftSection={<Filter size={16} />}
                                        variant="light"
                                        onClick={() => setShowFilters(!showFilters)}
                                    >
                                        {showFilters ? 'Hide Filters' : 'Show Filters'}
                                    </Button>
                                    {(localFilters.search || localFilters.status || localFilters.campaign_status) && (
                                        <Button
                                            variant="subtle"
                                            color="red"
                                            onClick={clearFilters}
                                            size="sm"
                                        >
                                            Clear Filters
                                        </Button>
                                    )}
                                </Group>
                            </Group>

                            {showFilters && (
                                <div className="mt-4">
                                    <Grid gutter="md">
                                        <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                                            <TextInput
                                                placeholder="Search campaigns..."
                                                leftSection={<Search size={16} />}
                                                value={localFilters.search || ''}
                                                onChange={(e) => handleFilterChange('search', e.target.value)}
                                            />
                                        </Grid.Col>
                                        <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                                            <Select
                                                placeholder="Assignment Status"
                                                data={[
                                                    { value: '', label: 'All Assignments' },
                                                    { value: 'active', label: 'Active' },
                                                    { value: 'completed', label: 'Completed' },
                                                    { value: 'cancelled', label: 'Cancelled' },
                                                ]}
                                                value={localFilters.status || ''}
                                                onChange={(value) => handleFilterChange('status', value)}
                                                clearable
                                            />
                                        </Grid.Col>
                                        <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                                            <Select
                                                placeholder="Campaign Status"
                                                data={[
                                                    { value: '', label: 'All Campaigns' },
                                                    { value: 'active', label: 'Active' },
                                                    { value: 'completed', label: 'Completed' },
                                                    { value: 'paused', label: 'Paused' },
                                                    { value: 'cancelled', label: 'Cancelled' },
                                                ]}
                                                value={localFilters.campaign_status || ''}
                                                onChange={(value) => handleFilterChange('campaign_status', value)}
                                                clearable
                                            />
                                        </Grid.Col>
                                        <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                                            <TextInput
                                                type="date"
                                                placeholder="Start Date From"
                                                label="From Date"
                                                value={localFilters.date_from || ''}
                                                onChange={(e) => handleFilterChange('date_from', e.target.value)}
                                            />
                                        </Grid.Col>
                                        <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                                            <TextInput
                                                type="date"
                                                placeholder="End Date To"
                                                label="To Date"
                                                value={localFilters.date_to || ''}
                                                onChange={(e) => handleFilterChange('date_to', e.target.value)}
                                            />
                                        </Grid.Col>
                                        <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                                            <Button
                                                fullWidth
                                                onClick={applyFilters}
                                                className="mt-6"
                                            >
                                                Apply Filters
                                            </Button>
                                        </Grid.Col>
                                    </Grid>
                                </div>
                            )}
                        </Card>

                        {/* Campaigns Table */}
                        <Card shadow="sm" padding="lg" radius="md" withBorder>
                            {campaigns.data.length > 0 ? (
                                <>
                                    <div className="overflow-x-auto">
                                        <Table highlightOnHover>
                                            <Table.Thead>
                                                <Table.Tr>
                                                    <Table.Th>Campaign Name</Table.Th>
                                                    <Table.Th>Duration</Table.Th>
                                                    {/* <Table.Th>Status</Table.Th> */}
                                                    <Table.Th>Assignment</Table.Th>
                                                    <Table.Th>Helmet</Table.Th>
                                                    <Table.Th>Coverage Areas</Table.Th>
                                                </Table.Tr>
                                            </Table.Thead>
                                            <Table.Tbody>
                                                {campaigns.data.map((campaign) => (
                                                    <Table.Tr key={campaign.id}>
                                                        <Table.Td>
                                                            <div>
                                                                <Text fw={500} size="sm" className="text-gray-900 dark:text-white">
                                                                    {campaign.name}
                                                                </Text>
                                                                <Text size="xs" c="dimmed">
                                                                    ID: #{campaign.id.toString().padStart(6, '0')}
                                                                </Text>
                                                            </div>
                                                        </Table.Td>
                                                        <Table.Td>
                                                            <div>
                                                                <Group gap={4}>
                                                                    <Calendar size={12} className="text-gray-500" />
                                                                    <Text size="xs">
                                                                        {formatDate(campaign.start_date)}
                                                                    </Text>
                                                                </Group>
                                                                <Group gap={4}>
                                                                    <Calendar size={12} className="text-gray-500" />
                                                                    <Text size="xs">
                                                                        {formatDate(campaign.end_date)}
                                                                    </Text>
                                                                </Group>
                                                                <Text size="xs" c="dimmed" mt={2}>
                                                                    {campaign.duration_days} days
                                                                </Text>
                                                            </div>
                                                        </Table.Td>
                                                        {/* <Table.Td>
                                                            {getCampaignStatusBadge(campaign.status)}
                                                        </Table.Td> */}
                                                        <Table.Td>
                                                            {campaign.assignment ? (
                                                                <div>
                                                                    {getAssignmentStatusBadge(campaign.assignment.status)}
                                                                    <Text size="xs" c="dimmed" mt={4}>
                                                                        Assigned: {formatDate(campaign.assignment.assigned_at)}
                                                                    </Text>
                                                                    {campaign.assignment.completed_at && (
                                                                        <Text size="xs" c="dimmed">
                                                                            Completed: {formatDate(campaign.assignment.completed_at)}
                                                                        </Text>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <Text size="xs" c="dimmed">No assignment</Text>
                                                            )}
                                                        </Table.Td>
                                                        <Table.Td>
                                                            {campaign.assignment?.helmet ? (
                                                                <div>
                                                                    <Group gap={4} mb={4}>
                                                                        <HardHat size={14} className="text-blue-600" />
                                                                        <Text size="xs" fw={500} className="font-mono">
                                                                            {campaign.assignment.helmet.helmet_code}
                                                                        </Text>
                                                                    </Group>
                                                                    {getHelmetStatusBadge(campaign.assignment.helmet.status)}
                                                                    {campaign.assignment.helmet.current_branding && (
                                                                        <Text size="xs" c="dimmed" mt={4}>
                                                                            Branding: {campaign.assignment.helmet.current_branding}
                                                                        </Text>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <Text size="xs" c="dimmed">No helmet</Text>
                                                            )}
                                                        </Table.Td>
                                                        <Table.Td>
                                                            {campaign?.coverage_areas?.length > 0 ? (
                                                                <div>
                                                                    {campaign?.coverage_areas?.slice(0, 2).map((area) => (
                                                                        <div key={area.id} className="mb-2">
                                                                            <Group gap={4}>
                                                                                <MapPin size={12} className="text-green-600" />
                                                                                <Tooltip label={area.full_name}>
                                                                                    <Text size="xs" lineClamp={1}>
                                                                                        {area.name}
                                                                                    </Text>
                                                                                </Tooltip>
                                                                            </Group>
                                                                            <Text size="xs" c="dimmed" className="ml-4">
                                                                                {area.county?.name || 'N/A'}
                                                                            </Text>
                                                                        </div>
                                                                    ))}
                                                                    {campaign?.coverage_areas?.length > 2 && (
                                                                        <Badge size="xs" variant="light" color="gray">
                                                                            +{campaign.coverage_areas?.length - 2} more
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <Text size="xs" c="dimmed">No areas</Text>
                                                            )}
                                                        </Table.Td>
                                                    </Table.Tr>
                                                ))}
                                            </Table.Tbody>
                                        </Table>
                                    </div>

                                    {/* Pagination */}
                                    {campaigns.last_page > 1 && (
                                        <div className="mt-6 flex justify-center">
                                            <Pagination
                                                total={campaigns.last_page}
                                                value={campaigns.current_page}
                                                onChange={handlePageChange}
                                            />
                                        </div>
                                    )}

                                    {/* Results Info */}
                                    <div className="mt-4 text-center">
                                        <Text size="sm" c="dimmed">
                                            Showing {campaigns.data.length} of {campaigns.total} campaigns
                                        </Text>
                                    </div>
                                </>
                            ) : (
                                <Alert icon={<Package size={16} />} color="blue" variant="light">
                                    <Text size="sm" fw={500}>No Campaigns Found</Text>
                                    <Text size="sm" mt="xs">
                                        {localFilters.search || localFilters.status || localFilters.campaign_status
                                            ? 'No campaigns match your current filters. Try adjusting your search criteria.'
                                            : "You haven't been assigned to any campaigns yet. Once you're assigned to a campaign, it will appear here."}
                                    </Text>
                                </Alert>
                            )}
                        </Card>
                    </Container>
                </div>
            </div>
        </div>
    );
}