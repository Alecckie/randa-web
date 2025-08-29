import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { Button, TextInput, Select, Badge, Card, Group, Text, Stack, ActionIcon, Menu, Modal, Textarea } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { CheckCircleIcon, Clock1Icon, EyeIcon, FilterIcon, MoreVerticalIcon, PencilIcon, PlusIcon, SearchIcon, XIcon, CheckIcon, Building2Icon, DraftingCompass, ActivitySquareIcon, PauseIcon, Fullscreen, BookLockIcon } from 'lucide-react';
import type { Advertiser } from '@/types/advertiser';
import type { CampaignsIndexProps, CampaignStatus } from '@/types/campaign';
import { Campaign } from '@/types/dashboard';
export default function Index({ campaigns, stats, filters, advertisers }: CampaignsIndexProps) {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || '');
    const [selectedUser, setSelectedUser] = useState(filters.user_id?.toString() || '');
    const [selectedAdvertiser, setSelectedAdvertiser] = useState<Advertiser | null>(null);
    const [statusModalOpened, { open: openStatusModal, close: closeStatusModal }] = useDisclosure(false);
    const [newStatus, setNewStatus] = useState<'approved' | 'rejected'>('approved');
    const [rejectionReason, setRejectionReason] = useState('');

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

    const getStatusColor = (status: CampaignStatus): string => {
        const colors: Record<CampaignStatus, string> = {
            draft: 'yellow',
            active: 'blue',
            paused: 'red',
            completed: 'green',
            cancelled: 'red',
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
        };
        return icons[status];
    };

    // const handleStatusUpdate = (campaign: Campaign) => {
    //     setSelectedAdvertiser(campaign);
    //     setNewStatus('approved');
    //     setRejectionReason('');
    //     openStatusModal();
    // };

    const submitStatusUpdate = () => {
        if (!selectedAdvertiser) return;

        router.put(route('campaigns.update-status', selectedAdvertiser.id), {
            status: newStatus,
            rejection_reason: newStatus === 'rejected' ? rejectionReason : undefined,
        }, {
            onSuccess: () => {
                closeStatusModal();
                setSelectedAdvertiser(null);
            }
        });
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
                        New Campaigns Application
                    </Button>
                </div>
            }
        >
            <Head title="Campaignss" />

            <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    <Card className="bg-white dark:bg-gray-800">
                        <Group>
                            <div className="flex-1">
                                <Text size="sm" c="dimmed">Total Campaignss</Text>
                                <Text size="xl" fw={700}>{stats.total_campaigns}</Text>
                            </div>
                            <div className="text-3xl">
                                <Building2Icon size={32} className="text-blue-500" />
                            </div>
                        </Group>
                    </Card>

                    <Card className="bg-white dark:bg-gray-800">
                        <Group>
                            <div className="flex-1">
                                <Text size="sm" c="dimmed">Pending Applications</Text>
                                <Text size="xl" fw={700} c="yellow">{stats.pending_applications}</Text>
                            </div>
                            <div className="text-3xl">
                                <Clock1Icon size={32} className="text-yellow-500" />
                            </div>
                        </Group>
                    </Card>

                    <Card className="bg-white dark:bg-gray-800">
                        <Group>
                            <div className="flex-1">
                                <Text size="sm" c="dimmed">Approved Campaigns</Text>
                                <Text size="xl" fw={700} c="green">{stats.approved_campaigns}</Text>
                            </div>
                            <div className="text-3xl">
                                <CheckIcon size={32} className="text-green-500" />
                            </div>
                        </Group>
                    </Card>

                    <Card className="bg-white dark:bg-gray-800">
                        <Group>
                            <div className="flex-1">
                                <Text size="sm" c="dimmed">Rejected Applications</Text>
                                <Text size="xl" fw={700} c="red">{stats.rejected_applications}</Text>
                            </div>
                            <div className="text-3xl">
                                <XIcon size={32} className="text-red-500" />
                            </div>
                        </Group>
                    </Card>
                </div>

                {/* Filters */}
                <Card className="bg-white dark:bg-gray-800">
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
                                    { value: 'pending', label: 'Pending' },
                                    { value: 'approved', label: 'Approved' },
                                    { value: 'rejected', label: 'Rejected' },
                                ]}
                                value={statusFilter}
                                onChange={(value) => setStatusFilter(value || '')}
                            />

                            <Select
                                placeholder="Filter by Advertiser"
                                data={[
                                    { value: '', label: 'All Advertisers' },
                                    ...advertisers.map(user => ({ value: user.id.toString(), label: user.company_name }))
                                ]}
                                value={selectedUser}
                                onChange={(value) => setSelectedUser(value || '')}
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
                <Card className="bg-white dark:bg-gray-800">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Advertiser Details
                                    </th> */}
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Campaign
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
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {campaigns.data.map((campaign) => (
                                    <tr key={campaign.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                        {/* <td className="px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {campaign?.advertiser?.company_name ?? " "}
                                                </div>
                                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                                    {campaign?.advertiser?.business_registration || 'No registration'}
                                                </div>
                                            </div>
                                        </td> */}
                                        {/* <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900 dark:text-white">
                                                {campaign?.advertiser?.contact_person ?? " "}
                                            </div>
                                        </td> */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <div className="text-sm text-gray-900 dark:text-white">
                                                    {campaign?.name ?? " "}
                                                </div>
                                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                                    {campaign?.description ?? ''}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <Badge
                                                color={getStatusColor(campaign.status)}
                                                leftSection={getStatusIcon(campaign.status)}
                                                variant="light"
                                            >
                                                {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {new Date(campaign.start_date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {new Date(campaign.end_date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {Array.isArray(campaign.coverage_areas) ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {campaign.coverage_areas.map((area: string, idx: number) => (
                                                        <Badge key={idx} variant="outline" color="blue">
                                                            {area}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span>{campaign.coverage_areas ?? '—'}</span>
                                            )}
                                        </td>

                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {campaign.helmet_count}
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
                                                    {campaign.status === 'draft' && (
                                                        <Menu.Item
                                                            leftSection={<CheckCircleIcon size={14} />}
                                                        >
                                                            Update Status
                                                        </Menu.Item>
                                                    )}
                                                    <Menu.Item
                                                        leftSection={<PencilIcon size={14} />}
                                                        component={Link}
                                                        href={route('campaigns.edit', campaign.id)}
                                                    >
                                                        Edit
                                                    </Menu.Item>
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
                            <div className="flex space-x-1">
                                {Array.from({ length: campaigns.last_page }, (_, i) => i + 1).map((page) => (
                                    <Button
                                        key={page}
                                        variant={page === campaigns.current_page ? "filled" : "subtle"}
                                        size="sm"
                                        onClick={() => router.get(route('campaigns.index', { ...filters, page }))}
                                    >
                                        {page}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}
                </Card>
            </div>

            {/* Status Update Modal */}
            <Modal
                opened={statusModalOpened}
                onClose={closeStatusModal}
                title="Update Advertiser Status"
                centered
            >
                <Stack>
                    <div>
                        <Text size="sm" c="dimmed">Company</Text>
                        <Text fw={500}>{selectedAdvertiser?.company_name}</Text>
                    </div>

                    <Select
                        label="New Status"
                        placeholder="Select status"
                        data={[
                            { value: 'approved', label: 'Approved' },
                            { value: 'rejected', label: 'Rejected' },
                        ]}
                        value={newStatus}
                        onChange={(value) => setNewStatus(value as 'approved' | 'rejected')}
                    />

                    {newStatus === 'rejected' && (
                        <Textarea
                            label="Rejection Reason"
                            placeholder="Please provide a reason for rejection..."
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.currentTarget.value)}
                            required
                        />
                    )}

                    <Group justify="flex-end">
                        <Button variant="light" onClick={closeStatusModal}>
                            Cancel
                        </Button>
                        <Button onClick={submitStatusUpdate}>
                            Update Status
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </AuthenticatedLayout>
    );
}