// components/campaigns/CampaignList.tsx

import { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { 
    Button, 
    TextInput, 
    Select, 
    Badge, 
    Card, 
    Group, 
    Text, 
    ActionIcon, 
    Menu 
} from '@mantine/core';
import { 
    CheckIcon, 
    Building2Icon, 
    DraftingCompass, 
    ActivitySquareIcon, 
    PauseIcon, 
    Fullscreen, 
    BookLockIcon,
    Clock1Icon,
    SearchIcon,
    FilterIcon,
    MoreVerticalIcon,
    EyeIcon,
    PencilIcon,
    PlusIcon,
    FullscreenIcon,
    RefreshCw
} from 'lucide-react';
import type { Advertiser } from '@/types/advertiser';
import type { CampaignStatus } from '@/types/campaign';
import type { Campaign } from '@/types/campaign';
import StatusUpdateModal from './StatusUpdateModal';


interface PaginatedCampaigns {
   data: Campaign[];
    current_page: number;
    last_page: number;
    from: number;
    to: number;
    total: number;
}

interface Stats {
    total_campaigns?: number;
    active_campaigns?: number;
    draft_campaigns?: number;
    completed_campaigns?: number;
}

interface Filters {
    search?: string;
    status?: string;
    advertiser_id?: number | string;
}

interface CampaignListProps {
    campaigns: PaginatedCampaigns;
    stats: Stats;
    filters: Filters;
    advertisers: Advertiser[];
    userRole: string;
}

export default function CampaignList({ 
    campaigns, 
    stats, 
    filters, 
    advertisers,
    userRole 
}: CampaignListProps) {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || '');
    const [selectedAdvertiser, setSelectedAdvertiser] = useState(filters.advertiser_id?.toString() || '');
    const [statusModalOpened, setStatusModalOpened] = useState(false);
    const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const params: Record<string, string> = {};
        
        if (searchTerm) params.search = searchTerm;
        if (statusFilter) params.status = statusFilter;
        if (selectedAdvertiser) params.advertiser_id = selectedAdvertiser;

        router.get(route('campaigns.index'), params);
    };

    const clearFilters = () => {
        setSearchTerm('');
        setStatusFilter('');
        setSelectedAdvertiser('');
        router.get(route('campaigns.index'));
    };

    const handleStatusUpdate = (campaign: Campaign) => {
        setSelectedCampaign(campaign);
        setStatusModalOpened(true);
    };

    const getStatusColor = (status: CampaignStatus): string => {
        const colors: Record<CampaignStatus, string> = {
            draft: 'yellow',
            pending_payment: 'orange',
            active: 'blue',
            paused: 'grape',
            completed: 'green',
            cancelled: 'red',
            paid: 'green'
        };
        return colors[status] || 'gray';
    };

    const getStatusIcon = (status: CampaignStatus) => {
        const icons: Record<CampaignStatus, JSX.Element> = {
            draft: <DraftingCompass size={14} />,
            pending_payment: <Clock1Icon size={14} />,
            active: <ActivitySquareIcon size={14} />,
            paused: <PauseIcon size={14} />,
            completed: <Fullscreen size={14} />,
            cancelled: <BookLockIcon size={14} />,
            paid: <FullscreenIcon size={14} />
        };
        return icons[status] || null;
    };

    const formatStatus = (status: string): string => {
        return status
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    const renderCoverageAreas = (coverageAreas: any) => {
        if (!coverageAreas) return '—';
        
        if (Array.isArray(coverageAreas)) {
            if (coverageAreas.length === 0) return '—';
            
            if (typeof coverageAreas[0] === 'object') {
                return (
                    <div className="flex flex-wrap gap-1">
                        {coverageAreas.slice(0, 2).map((area: any, idx: number) => (
                            <Badge key={idx} variant="outline" color="blue" size="sm" radius="sm">
                                {area?.name || area?.full_name || area?.location_path || 'Unknown'}
                            </Badge>
                        ))}
                        {coverageAreas.length > 2 && (
                            <Badge variant="outline" color="gray" size="sm" radius="sm">
                                +{coverageAreas.length - 2}
                            </Badge>
                        )}
                    </div>
                );
            }
            
            return (
                <div className="flex flex-wrap gap-1">
                    {coverageAreas.slice(0, 2).map((area: string, idx: number) => (
                        <Badge key={idx} variant="outline" color="blue" size="sm" radius="sm">
                            {String(area)}
                        </Badge>
                    ))}
                    {coverageAreas.length > 2 && (
                        <Badge variant="outline" color="gray" size="sm" radius="sm">
                            +{coverageAreas.length - 2}
                        </Badge>
                    )}
                </div>
            );
        }
        
        return <span>{String(coverageAreas)}</span>;
    };

    const canUpdateStatus = (campaign: Campaign): boolean => {
        // Only admins or campaigns not in completed/cancelled state can update status
        return userRole === 'admin' && !['completed', 'cancelled'].includes(campaign.status);
    };

    return (
        <>
            <div className="space-y-6">
                {/* Stats Cards - Enhanced with gradients */}
                <div className="grid grid-cols-1 gap-4 sm:gap-5 sm:grid-cols-2 xl:grid-cols-4">
                    <Card className="bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-gray-800 border border-blue-100 dark:border-gray-700 shadow-md hover:shadow-lg transition-all duration-200" radius="md" p="lg">
                        <Group justify="space-between" wrap="nowrap">
                            <div className="flex-1 min-w-0">
                                <Text size="sm" c="dimmed" className="mb-1">Total Campaigns</Text>
                                <Text size="xl" fw={700} className="text-gray-900 dark:text-white">{stats.total_campaigns || 0}</Text>
                            </div>
                            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <Building2Icon size={24} className="text-blue-600 dark:text-blue-400" />
                            </div>
                        </Group>
                    </Card>

                    <Card className="bg-gradient-to-br from-white to-green-50 dark:from-gray-800 dark:to-gray-800 border border-green-100 dark:border-gray-700 shadow-md hover:shadow-lg transition-all duration-200" radius="md" p="lg">
                        <Group justify="space-between" wrap="nowrap">
                            <div className="flex-1 min-w-0">
                                <Text size="sm" c="dimmed" className="mb-1">Active Campaigns</Text>
                                <Text size="xl" fw={700} c="blue">{stats.active_campaigns || 0}</Text>
                            </div>
                            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                <ActivitySquareIcon size={24} className="text-green-600 dark:text-green-400" />
                            </div>
                        </Group>
                    </Card>

                    <Card className="bg-gradient-to-br from-white to-yellow-50 dark:from-gray-800 dark:to-gray-800 border border-yellow-100 dark:border-gray-700 shadow-md hover:shadow-lg transition-all duration-200" radius="md" p="lg">
                        <Group justify="space-between" wrap="nowrap">
                            <div className="flex-1 min-w-0">
                                <Text size="sm" c="dimmed" className="mb-1">Draft Campaigns</Text>
                                <Text size="xl" fw={700} c="yellow">{stats.draft_campaigns || 0}</Text>
                            </div>
                            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                                <DraftingCompass size={24} className="text-yellow-600 dark:text-yellow-400" />
                            </div>
                        </Group>
                    </Card>

                    <Card className="bg-gradient-to-br from-white to-emerald-50 dark:from-gray-800 dark:to-gray-800 border border-emerald-100 dark:border-gray-700 shadow-md hover:shadow-lg transition-all duration-200" radius="md" p="lg">
                        <Group justify="space-between" wrap="nowrap">
                            <div className="flex-1 min-w-0">
                                <Text size="sm" c="dimmed" className="mb-1">Completed</Text>
                                <Text size="xl" fw={700} c="green">{stats.completed_campaigns || 0}</Text>
                            </div>
                            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                <CheckIcon size={24} className="text-emerald-600 dark:text-emerald-400" />
                            </div>
                        </Group>
                    </Card>
                </div>

                {/* Filters Card - Enhanced */}
                <Card className="bg-white dark:bg-gray-800 shadow-md border border-gray-200 dark:border-gray-700" radius="md" p="lg">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
                        <Text size="lg" fw={600} className="text-gray-900 dark:text-white">
                            All Campaigns
                        </Text>
                    </div>

                    <form onSubmit={handleSearch}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            <div className={userRole === 'admin' ? 'lg:col-span-1' : 'lg:col-span-2'}>
                                <TextInput
                                    placeholder="Search campaigns..."
                                    leftSection={<SearchIcon size={16} />}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.currentTarget.value)}
                                    radius="md"
                                    size="sm"
                                />
                            </div>

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
                                radius="md"
                                size="sm"
                                clearable
                            />

                            {userRole === 'admin' && (
                                <Select
                                    placeholder="Filter by Advertiser"
                                    data={[
                                        { value: '', label: 'All Advertisers' },
                                        ...advertisers.map(adv => ({ 
                                            value: adv.id.toString(), 
                                            label: adv.company_name 
                                        }))
                                    ]}
                                    value={selectedAdvertiser}
                                    onChange={(value) => setSelectedAdvertiser(value || '')}
                                    radius="md"
                                    size="sm"
                                    clearable
                                />
                            )}

                            <Group gap="xs" className="sm:col-span-2 lg:col-span-1">
                                <Button type="submit" leftSection={<FilterIcon size={16} />} radius="md" size="sm" className="flex-1 sm:flex-none">
                                    Filter
                                </Button>
                                <Button variant="light" onClick={clearFilters} radius="md" size="sm" className="flex-1 sm:flex-none">
                                    Clear
                                </Button>
                            </Group>
                        </div>
                    </form>
                </Card>

                {/* Campaigns Table - Enhanced for mobile */}
                <Card className="bg-white dark:bg-gray-800 shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden" radius="md" p={0}>
                    {/* Mobile Card View */}
                    <div className="block lg:hidden">
                        {campaigns.data.map((campaign) => (
                            <div key={campaign.id} className="p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex-1 min-w-0 mr-3">
                                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1 truncate">
                                            {campaign?.name || '—'}
                                        </h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                                            {campaign?.description || '—'}
                                        </p>
                                    </div>
                                    <Menu shadow="md" width={200}>
                                        <Menu.Target>
                                            <ActionIcon variant="subtle" size="sm">
                                                <MoreVerticalIcon size={16} />
                                            </ActionIcon>
                                        </Menu.Target>
                                        <Menu.Dropdown>
                                            <Menu.Item 
                                                leftSection={<EyeIcon size={14} />} 
                                                component={Link}
                                                href={route('my-campaigns.show', campaign.id)}
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
                                                <Menu.Item leftSection={<PencilIcon size={14} />} component={Link}>
                                                    Edit
                                                </Menu.Item>
                                            )}
                                        </Menu.Dropdown>
                                    </Menu>
                                </div>
                                
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Text size="xs" c="dimmed">Status:</Text>
                                        <Badge color={getStatusColor(campaign.status)} leftSection={getStatusIcon(campaign.status)} variant="light" size="sm" radius="sm">
                                            {formatStatus(campaign.status)}
                                        </Badge>
                                    </div>
                                    
                                    {userRole === 'admin' && campaign?.advertiser && (
                                        <div className="flex items-center justify-between">
                                            <Text size="xs" c="dimmed">Advertiser:</Text>
                                            <Text size="xs" className="font-medium">{campaign.advertiser.company_name}</Text>
                                        </div>
                                    )}
                                    
                                    <div className="flex items-center justify-between">
                                        <Text size="xs" c="dimmed">Duration:</Text>
                                        <div className="text-right">
                                            <Text size="xs">{new Date(campaign.start_date).toLocaleDateString()}</Text>
                                            <Text size="xs" c="dimmed">to {new Date(campaign.end_date).toLocaleDateString()}</Text>
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <Text size="xs" c="dimmed" className="mb-1">Coverage:</Text>
                                        {renderCoverageAreas(campaign.coverage_areas)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden lg:block overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-750">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                        Campaign
                                    </th>
                                    {userRole === 'admin' && (
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                            Advertiser
                                        </th>
                                    )}
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                        Duration
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                        Coverage Areas
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {campaigns.data.map((campaign) => (
                                    <tr key={campaign.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="max-w-xs">
                                                <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                    {campaign?.name || '—'}
                                                </div>
                                                <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                                                    {campaign?.description || '—'}
                                                </div>
                                            </div>
                                        </td>
                                        {userRole === 'admin' && (
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900 dark:text-white">
                                                    {campaign?.advertiser?.company_name || '—'}
                                                </div>
                                            </td>
                                        )}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <Badge
                                                color={getStatusColor(campaign.status)}
                                                leftSection={getStatusIcon(campaign.status)}
                                                variant="light"
                                                radius="sm"
                                            >
                                                {formatStatus(campaign.status)}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900 dark:text-white">
                                                {new Date(campaign.start_date).toLocaleDateString()}
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                {new Date(campaign.end_date).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {renderCoverageAreas(campaign.coverage_areas)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
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
                                                        href={route('my-campaigns.show', campaign.id)}
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
                                                </Menu.Dropdown>
                                            </Menu>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Empty State */}
                    {campaigns.data.length === 0 && (
                        <div className="text-center py-16 px-4">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                <Building2Icon size={32} className="text-gray-400 dark:text-gray-500" />
                            </div>
                            <Text size="lg" fw={600} className="text-gray-900 dark:text-white mb-2">No Campaigns Found</Text>
                            <Text size="sm" c="dimmed" className="max-w-sm mx-auto">
                                {Object.values(filters).some(val => val)
                                    ? "Try adjusting your filters to see more results"
                                    : "Get started by creating your first campaign"}
                            </Text>
                        </div>
                    )}

                    {/* Pagination - Enhanced for mobile */}
                    {campaigns.last_page > 1 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between px-4 sm:px-6 py-4 border-t border-gray-200 dark:border-gray-700 gap-4 bg-gray-50 dark:bg-gray-750">
                            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 text-center sm:text-left">
                                Showing <span className="font-medium text-gray-900 dark:text-white">{campaigns.from}</span> to <span className="font-medium text-gray-900 dark:text-white">{campaigns.to}</span> of <span className="font-medium text-gray-900 dark:text-white">{campaigns.total}</span> campaigns
                            </div>
                            <div className="flex flex-wrap gap-1 justify-center">
                                {campaigns.current_page > 1 && (
                                    <Button
                                        variant="light"
                                        size="sm"
                                        radius="md"
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
                                            radius="md"
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
                                        radius="md"
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
        </>
    );
}