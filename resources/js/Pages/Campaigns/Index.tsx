import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { Button, TextInput, Select, Badge, Card, Group, Text, ActionIcon, Menu } from '@mantine/core';
import { Clock1Icon, EyeIcon, FilterIcon, MoreVerticalIcon, PencilIcon, PlusIcon, SearchIcon, XIcon, CheckIcon, Building2Icon, DraftingCompass, ActivitySquareIcon, PauseIcon, Fullscreen, BookLockIcon, FullscreenIcon, RefreshCw } from 'lucide-react';
import type { Advertiser } from '@/types/advertiser';
import type { Campaign,CampaignsIndexProps, CampaignStatus } from '@/types/campaign';

import StatusUpdateModal from '@/Components/campaigns/StatusUpdateModal';

export default function Index({ campaigns, stats, filters, advertisers }: CampaignsIndexProps) {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || '');
    const [selectedUser, setSelectedUser] = useState(filters.user_id?.toString() || '');
    const [statusModalOpened, setStatusModalOpened] = useState(false);
    const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const params = new URLSearchParams();
        if (searchTerm) params.set('search', searchTerm);
        if (statusFilter) params.set('status', statusFilter);
        if (selectedUser) params.set('user_id', selectedUser);

        router.get(route('campaigns.index', Object.fromEntries(params)));
    };

    const clearFilters = () => {
        setSearchTerm('');
        setStatusFilter('');
        setSelectedUser('');
        router.get(route('campaigns.index'));
    };

    const handleStatusUpdate = (campaign: Campaign) => {
        setSelectedCampaign(campaign);
        setStatusModalOpened(true);
    };

    const getStatusColor = (status: CampaignStatus): string => {
        const colors: Record<CampaignStatus, string> = {
            draft: 'yellow',
            active: 'blue',
            paused: 'grape',
            completed: 'green',
            cancelled: 'red',
            pending_payment:'orange',
            paid: 'green'
        };
        return colors[status];
    };

    const getStatusIcon = (status: CampaignStatus) => {
        const icons = {
            draft: <DraftingCompass size={14} />,
            active: <ActivitySquareIcon size={14} />,
            paused: <PauseIcon size={14} />,
            completed: <Fullscreen size={14} />,
            cancelled: <BookLockIcon size={14} />,
            pending_payment:<Clock1Icon size={14} />,
            paid: <FullscreenIcon size={14}/>
        };
        return icons[status];
    };

    const canUpdateStatus = (campaign: Campaign): boolean => {
        // Only allow status updates for campaigns not in completed/cancelled state
        return !['completed', 'cancelled'].includes(campaign.status);
    };

    // Helper function to safely render coverage areas
    const renderCoverageAreas = (coverageAreas: any) => {
        if (!coverageAreas) return '—';
        
        if (Array.isArray(coverageAreas)) {
            if (coverageAreas.length === 0) return '—';
            
            // Check if it's an array of objects
            if (typeof coverageAreas[0] === 'object') {
                return (
                    <div className="flex flex-wrap gap-1">
                        {coverageAreas.slice(0, 2).map((area: any, idx: number) => (
                            <Badge key={idx} variant="outline" color="blue" size="sm">
                                {area?.name || area?.full_name || area?.location_path || 'Unknown'}
                            </Badge>
                        ))}
                        {coverageAreas.length > 2 && (
                            <Badge variant="outline" color="gray" size="sm">
                                +{coverageAreas.length - 2}
                            </Badge>
                        )}
                    </div>
                );
            }
            // If it's an array of strings
            return (
                <div className="flex flex-wrap gap-1">
                    {coverageAreas.slice(0, 2).map((area: string, idx: number) => (
                        <Badge key={idx} variant="outline" color="blue" size="sm">
                            {String(area)}
                        </Badge>
                    ))}
                    {coverageAreas.length > 2 && (
                        <Badge variant="outline" color="gray" size="sm">
                            +{coverageAreas.length - 2}
                        </Badge>
                    )}
                </div>
            );
        }
        
        // If it's a single value
        return <span>{String(coverageAreas)}</span>;
    };

    const formatStatus = (status: string): string => {
        return status
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                            Campaigns Management
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Manage campaigns applications and track their status
                        </p>
                    </div>
                    <Button
                        component={Link}
                        href={route('campaigns.create')}
                        leftSection={<PlusIcon size={16} />}
                        size="sm"
                    >
                        New Campaign Application
                    </Button>
                </div>
            }
        >
            <Head title="Campaigns" />

            <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    <Card className="bg-white dark:bg-gray-800 shadow-md">
                        <Group>
                            <div className="flex-1">
                                <Text size="sm" c="dimmed">Total Campaigns</Text>
                                <Text size="xl" fw={700}>{stats.total_campaigns || 0}</Text>
                            </div>
                            <div className="text-3xl">
                                <Building2Icon size={32} className="text-blue-500" />
                            </div>
                        </Group>
                    </Card>

                    <Card className="bg-white dark:bg-gray-800 shadow-md">
                        <Group>
                            <div className="flex-1">
                                <Text size="sm" c="dimmed">Active Campaigns</Text>
                                <Text size="xl" fw={700} c="blue">{stats.active_campaigns || 0}</Text>
                            </div>
                            <div className="text-3xl">
                                <ActivitySquareIcon size={32} className="text-blue-500" />
                            </div>
                        </Group>
                    </Card>

                    <Card className="bg-white dark:bg-gray-800 shadow-md">
                        <Group>
                            <div className="flex-1">
                                <Text size="sm" c="dimmed">Draft Campaigns</Text>
                                <Text size="xl" fw={700} c="yellow">{stats.draft_campaigns || 0}</Text>
                            </div>
                            <div className="text-3xl">
                                <DraftingCompass size={32} className="text-yellow-500" />
                            </div>
                        </Group>
                    </Card>

                    <Card className="bg-white dark:bg-gray-800 shadow-md">
                        <Group>
                            <div className="flex-1">
                                <Text size="sm" c="dimmed">Completed</Text>
                                <Text size="xl" fw={700} c="green">{stats.completed_campaigns || 0}</Text>
                            </div>
                            <div className="text-3xl">
                                <CheckIcon size={32} className="text-green-500" />
                            </div>
                        </Group>
                    </Card>
                </div>

                {/* Filters */}
                <Card className="bg-white dark:bg-gray-800 shadow-md">
                    <form onSubmit={handleSearch}>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                            <TextInput
                                placeholder="Search campaigns..."
                                leftSection={<SearchIcon size={16} />}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.currentTarget.value)}
                            />

                            <Select
                                placeholder="Filter by status"
                                data={[
                                    { value: '', label: 'All Status' },
                                    { value: 'draft', label: 'Draft' },
                                    { value: 'pending_payment', label: 'Pending Payment' },
                                    { value: 'paid', label: 'Paid' },
                                    { value: 'active', label: 'Active' },
                                    { value: 'paused', label: 'Paused' },
                                    { value: 'completed', label: 'Completed' },
                                    { value: 'cancelled', label: 'Cancelled' },
                                ]}
                                value={statusFilter}
                                onChange={(value) => setStatusFilter(value || '')}
                                clearable
                            />

                            <Select
                                placeholder="Filter by Advertiser"
                                data={[
                                    { value: '', label: 'All Advertisers' },
                                    ...advertisers.map(user => ({ value: user.id.toString(), label: user.company_name }))
                                ]}
                                value={selectedUser}
                                onChange={(value) => setSelectedUser(value || '')}
                                clearable
                            />

                            <Group>
                                <Button type="submit" leftSection={<FilterIcon size={16} />}>
                                    Filter
                                </Button>
                                <Button variant="light" onClick={clearFilters}>
                                    Clear
                                </Button>
                            </Group>
                        </div>
                    </form>
                </Card>

                {/* Campaigns Table */}
                <Card className="bg-white dark:bg-gray-800 shadow-md">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Campaign
                                    </th>
                                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Advertiser
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Start Date
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        End Date
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Coverage Areas
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Helmet Count
                                    </th>
                                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Total Cost
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {campaigns.data.map((campaign) => (
                                    <tr key={campaign.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {campaign?.name ?? "—"}
                                                </div>
                                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                                    {campaign?.description ?? '—'}
                                                </div>
                                            </div>
                                        </td>
                                         <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900 dark:text-white">
                                                {campaign?.advertiser?.company_name ?? campaign?.advertiser?.user?.name ?? "—"}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <Badge
                                                color={getStatusColor(campaign.status)}
                                                leftSection={getStatusIcon(campaign.status)}
                                                variant="light"
                                            >
                                                {formatStatus(campaign.status)}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {new Date(campaign.start_date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {new Date(campaign.end_date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                            {renderCoverageAreas(campaign.coverage_areas)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {campaign.helmet_count || 0}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                           KES {campaign?.current_cost?.total_cost?.toLocaleString() || '0.00'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <Menu shadow="md" width={200}>
                                                <Menu.Target>
                                                    <ActionIcon variant="subtle">
                                                        <MoreVerticalIcon size={16} />
                                                    </ActionIcon>
                                                </Menu.Target>

                                                <Menu.Dropdown>
                                                    <Menu.Item
                                                        leftSection={<EyeIcon size={14} />}
                                                        component={Link}
                                                        href={route('campaigns.show', campaign.id)}
                                                    >
                                                        View Details
                                                    </Menu.Item>
                                                    {canUpdateStatus(campaign) && (
                                                        <Menu.Item
                                                            leftSection={<RefreshCw size={14} />}
                                                            onClick={() => handleStatusUpdate(campaign)}
                                                        >
                                                            Update Status
                                                        </Menu.Item>
                                                    )}
                                                    {(campaign.status === 'draft' || campaign.status === 'pending_payment') && (
                                                        <Menu.Item
                                                            leftSection={<PencilIcon size={14} />}
                                                            component={Link}
                                                            href={route('campaigns.edit', campaign.id)}
                                                        >
                                                            Edit
                                                        </Menu.Item>
                                                    )}
                                                </Menu.Dropdown>
                                            </Menu>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {campaigns.data.length === 0 && (
                        <div className="text-center py-12">
                            <div className="text-gray-400 text-6xl mb-4">
                                <Building2Icon size={64} className="mx-auto" />
                            </div>
                            <Text size="lg" c="dimmed">No Campaigns found</Text>
                            <Text size="sm" c="dimmed">
                                {Object.keys(filters).some(key => filters[key as keyof typeof filters])
                                    ? "Try adjusting your filters"
                                    : "Get started by creating a new campaign application"}
                            </Text>
                        </div>
                    )}

                    {/* Pagination */}
                    {campaigns.last_page > 1 && (
                        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 dark:border-gray-700">
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                Showing {campaigns.from} to {campaigns.to} of {campaigns.total} campaigns
                            </div>
                            <div className="flex flex-wrap gap-1">
                                {campaigns.current_page > 1 && (
                                    <Button
                                        variant="light"
                                        size="sm"
                                        onClick={() => router.get(route('campaigns.index', { 
                                            ...filters, 
                                            page: campaigns.current_page - 1 
                                        }))}
                                    >
                                        Previous
                                    </Button>
                                )}
                                
                                {Array.from({ length: Math.min(5, campaigns.last_page) }, (_, i) => {
                                    let page: number;
                                    if (campaigns.last_page <= 5) {
                                        page = i + 1;
                                    } else if (campaigns.current_page <= 3) {
                                        page = i + 1;
                                    } else if (campaigns.current_page >= campaigns.last_page - 2) {
                                        page = campaigns.last_page - 4 + i;
                                    } else {
                                        page = campaigns.current_page - 2 + i;
                                    }
                                    
                                    return (
                                        <Button
                                            key={page}
                                            variant={page === campaigns.current_page ? "filled" : "light"}
                                            size="sm"
                                            onClick={() => router.get(route('campaigns.index', { ...filters, page }))}
                                        >
                                            {page}
                                        </Button>
                                    );
                                })}
                                
                                {campaigns.current_page < campaigns.last_page && (
                                    <Button
                                        variant="light"
                                        size="sm"
                                        onClick={() => router.get(route('campaigns.index', { 
                                            ...filters, 
                                            page: campaigns.current_page + 1 
                                        }))}
                                    >
                                        Next
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </Card>
            </div>

            {/* Status Update Modal */}
            <StatusUpdateModal
                opened={statusModalOpened}
                onClose={() => {
                    setStatusModalOpened(false);
                    setSelectedCampaign(null);
                }}
                campaign={selectedCampaign}
            />
        </AuthenticatedLayout>
    );
}