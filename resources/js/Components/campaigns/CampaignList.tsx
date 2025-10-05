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
    XIcon,
    SearchIcon,
    FilterIcon,
    MoreVerticalIcon,
    EyeIcon,
    PencilIcon,
    CheckCircleIcon,
    PlusIcon
} from 'lucide-react';
import type { Advertiser } from '@/types/advertiser';
import type { CampaignStatus } from '@/types/campaign';

interface CampaignListProps {
    campaigns: any;
    stats: any;
    filters: any;
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

    const getStatusColor = (status: CampaignStatus): string => {
        const colors: Record<CampaignStatus, string> = {
            draft: 'yellow',
            pending_payment: 'orange',
            active: 'blue',
            paused: 'grape',
            completed: 'green',
            cancelled: 'red',
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
        
        return <span>{String(coverageAreas)}</span>;
    };

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-white dark:bg-gray-800">
                    <Group>
                        <div className="flex-1">
                            <Text size="sm" c="dimmed">Total Campaigns</Text>
                            <Text size="xl" fw={700}>{stats.total_campaigns || 0}</Text>
                        </div>
                        <Building2Icon size={32} className="text-blue-500" />
                    </Group>
                </Card>

                <Card className="bg-white dark:bg-gray-800">
                    <Group>
                        <div className="flex-1">
                            <Text size="sm" c="dimmed">Active Campaigns</Text>
                            <Text size="xl" fw={700} c="blue">{stats.active_campaigns || 0}</Text>
                        </div>
                        <ActivitySquareIcon size={32} className="text-blue-500" />
                    </Group>
                </Card>

                <Card className="bg-white dark:bg-gray-800">
                    <Group>
                        <div className="flex-1">
                            <Text size="sm" c="dimmed">Draft Campaigns</Text>
                            <Text size="xl" fw={700} c="yellow">{stats.draft_campaigns || 0}</Text>
                        </div>
                        <DraftingCompass size={32} className="text-yellow-500" />
                    </Group>
                </Card>

                <Card className="bg-white dark:bg-gray-800">
                    <Group>
                        <div className="flex-1">
                            <Text size="sm" c="dimmed">Completed</Text>
                            <Text size="xl" fw={700} c="green">{stats.completed_campaigns || 0}</Text>
                        </div>
                        <CheckIcon size={32} className="text-green-500" />
                    </Group>
                </Card>
            </div>

            {/* Filters and Create Button */}
            <Card className="bg-white dark:bg-gray-800">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                    <Text size="lg" fw={600} className="text-gray-900 dark:text-white">
                        All Campaigns
                    </Text>
                    {/* <Button
                        component={Link}
                        href={route('my-campaigns.create')}
                        leftSection={<PlusIcon size={16} />}
                        size="sm"
                    >
                        New Campaign
                    </Button> */}
                </div>

                <form onSubmit={handleSearch}>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                            />
                        )}

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
            <Card className="bg-white dark:bg-gray-800">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Campaign
                                </th>
                                {userRole === 'admin' && (
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Advertiser
                                    </th>
                                )}
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Duration
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Coverage Areas
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Helmets
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {campaigns.data.map((campaign: any) => (
                                <tr key={campaign.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <td className="px-6 py-4">
                                        <div>
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">
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
                                        >
                                            {formatStatus(campaign.status)}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900 dark:text-white">
                                            {new Date(campaign.start_date).toLocaleDateString()}
                                        </div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                            {new Date(campaign.end_date).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {renderCoverageAreas(campaign.coverage_areas)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {campaign.helmet_count || 0}
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

                {/* Empty State */}
                {campaigns.data.length === 0 && (
                    <div className="text-center py-12">
                        <Building2Icon size={64} className="mx-auto text-gray-400 mb-4" />
                        <Text size="lg" c="dimmed" className="mb-2">No Campaigns Found</Text>
                        <Text size="sm" c="dimmed">
                            {Object.values(filters).some(val => val)
                                ? "Try adjusting your filters"
                                : "Get started by creating a new campaign"}
                        </Text>
                    </div>
                )}

                {/* Pagination */}
                {campaigns.last_page > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 gap-4">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                            Showing {campaigns.from} to {campaigns.to} of {campaigns.total} campaigns
                        </div>
                        <div className="flex flex-wrap gap-1 justify-center">
                            {campaigns.current_page > 1 && (
                                <Button
                                    variant="subtle"
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
                                        variant={page === campaigns.current_page ? "filled" : "subtle"}
                                        size="sm"
                                        onClick={() => router.get(route('campaigns.index', { ...filters, page }))}
                                    >
                                        {page}
                                    </Button>
                                );
                            })}
                            
                            {campaigns.current_page < campaigns.last_page && (
                                <Button
                                    variant="subtle"
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
    );
}