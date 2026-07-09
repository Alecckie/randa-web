import { useState } from 'react';
import React from 'react';
import { formatDateShort } from '@/utils/formatting';
import { getCampaignStatusColor, getCampaignStatusLabel, getAssignmentStatusColor, getAssignmentStatusLabel, getHelmetStatusColor, getHelmetStatusLabel } from '@/utils/status';
import { Link, router } from '@inertiajs/react';
import {
    Badge,
    Button,
    Card,
    Container,
    Grid,
    Group,
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
import RiderLayout from '@/Layouts/RiderLayout';

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
    const [showFilters, setShowFilters] = useState(false);
    const [localFilters, setLocalFilters] = useState(filters);

    const getCampaignStatusBadge = (status: string) => {
        const iconMap: Record<string, React.ElementType> = {
            draft: Clock, submitted: Clock,
            active: Play, paused: Pause, completed: CheckCircle, cancelled: XCircle,
        };
        const Icon = iconMap[status] ?? Clock;
        return (
            <Badge color={getCampaignStatusColor(status)} variant="light" size="sm" leftSection={<Icon size={12} />}>
                {getCampaignStatusLabel(status)}
            </Badge>
        );
    };

    const getAssignmentStatusBadge = (status: string) => (
        <Badge color={getAssignmentStatusColor(status)} variant="light" size="xs">
            {getAssignmentStatusLabel(status)}
        </Badge>
    );

    const getHelmetStatusBadge = (status: string) => (
        <Badge color={getHelmetStatusColor(status)} variant="dot" size="xs">
            {getHelmetStatusLabel(status)}
        </Badge>
    );

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

    const StatCard = ({ icon: Icon, label, value }: any) => (
        <Paper p="md" withBorder className="h-full bg-white">
            <Group gap="sm">
                <div className="p-2 rounded-lg bg-gray-100">
                    <Icon size={24} className="text-gray-500" />
                </div>
                <div className="flex-1">
                    <Text size="xs" c="dimmed">{label}</Text>
                    <Text size="xl" fw={700} className="text-gray-900">
                        {value}
                    </Text>
                </div>
            </Group>
        </Paper>
    );

    return (
        <RiderLayout title="My Campaigns" activeNav="campaigns">
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
                                    />
                            </Grid.Col>
                            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                                <StatCard
                                    icon={Play}
                                    label="Active Campaigns"
                                    value={stats.active_campaigns}
                                />
                            </Grid.Col>
                            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                                <StatCard
                                    icon={Trophy}
                                    label="Completed"
                                    value={stats.completed_campaigns}
                                />
                            </Grid.Col>
                            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                                <StatCard
                                    icon={TrendingUp}
                                    label="Total Days Worked"
                                    value={stats.total_days_worked}
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
                                        <Table>
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
                                                                        {formatDateShort(campaign.start_date)}
                                                                    </Text>
                                                                </Group>
                                                                <Group gap={4}>
                                                                    <Calendar size={12} className="text-gray-500" />
                                                                    <Text size="xs">
                                                                        {formatDateShort(campaign.end_date)}
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
                                                                        Assigned: {formatDateShort(campaign.assignment.assigned_at)}
                                                                    </Text>
                                                                    {campaign.assignment.completed_at && (
                                                                        <Text size="xs" c="dimmed">
                                                                            Completed: {formatDateShort(campaign.assignment.completed_at)}
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
        </RiderLayout>
    );
}