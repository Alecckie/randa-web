import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { Button, TextInput, Select, Badge, Card, Group, Text, Stack, ActionIcon, Menu, Modal, Textarea } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { CheckCircleIcon, Clock1Icon, EyeIcon, FilterIcon, MoreVerticalIcon, PencilIcon, PlusIcon, SearchIcon, XIcon, CheckIcon, Building2Icon } from 'lucide-react';
import type { AdvertisersIndexProps,Advertiser } from '@/types/advertiser';


export default function Index({ advertisers, stats, filters, users }: AdvertisersIndexProps) {
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
        
        router.get(route('advertisers.index', Object.fromEntries(params)));
    };

    const clearFilters = () => {
        setSearchTerm('');
        setStatusFilter('');
        setSelectedUser('');
        router.get(route('advertisers.index'));
    };

    const getStatusColor = (status: Advertiser['status']) => {
        const colors = {
            pending: 'yellow',
            approved: 'green',
            rejected: 'red',
        };
        return colors[status];
    };

    const getStatusIcon = (status: Advertiser['status']) => {
        const icons = {
            pending: <Clock1Icon size={14} />,
            approved: <CheckIcon size={14} />,
            rejected: <XIcon size={14} />,
        };
        return icons[status];
    };

    const handleStatusUpdate = (advertiser: Advertiser) => {
        setSelectedAdvertiser(advertiser);
        setNewStatus('approved');
        setRejectionReason('');
        openStatusModal();
    };

    const submitStatusUpdate = () => {
        if (!selectedAdvertiser) return;

        router.put(route('advertisers.update-status', selectedAdvertiser.id), {
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
                            Advertiser Management
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Manage advertiser applications and track their status
                        </p>
                    </div>
                    <Button
                        component={Link}
                        href={route('advertisers.create')}
                        leftSection={<PlusIcon size={16} />}
                        size="sm"
                    >
                        New Advertiser Application
                    </Button>
                </div>
            }
        >
            <Head title="Advertisers" />

            <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    <Card className="bg-white dark:bg-gray-800">
                        <Group>
                            <div className="flex-1">
                                <Text size="sm" c="dimmed">Total Advertisers</Text>
                                <Text size="xl" fw={700}>{stats.total_advertisers}</Text>
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
                                <Text size="sm" c="dimmed">Approved Advertisers</Text>
                                <Text size="xl" fw={700} c="green">{stats.approved_advertisers}</Text>
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
                                placeholder="Search advertisers..."
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
                                placeholder="Filter by user"
                                data={[
                                    { value: '', label: 'All Users' },
                                    ...users.map(user => ({ value: user.id.toString(), label: user.name }))
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

                {/* Advertisers Table */}
                <Card className="bg-white dark:bg-gray-800">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Company Details
                                    </th>
                                    
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Contact Info
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Applied Date
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {advertisers.data.map((advertiser) => (
                                    <tr key={advertiser.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {advertiser.company_name}
                                                </div>
                                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                                    {advertiser.business_registration || 'No registration'}
                                                </div>
                                            </div>
                                        </td>
                                       
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <div className="text-sm text-gray-900 dark:text-white">
                                                    {advertiser.user?.email}
                                                </div>
                                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                                    {advertiser.user?.phone || 'No phone'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <Badge
                                                color={getStatusColor(advertiser.status)}
                                                leftSection={getStatusIcon(advertiser.status)}
                                                variant="light"
                                            >
                                                {advertiser.status.charAt(0).toUpperCase() + advertiser.status.slice(1)}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {new Date(advertiser.created_at).toLocaleDateString()}
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
                                                        href={route('advertisers.show', advertiser.id)}
                                                    >
                                                        View Details
                                                    </Menu.Item>
                                                    {advertiser.status === 'pending' && (
                                                        <Menu.Item
                                                            leftSection={<CheckCircleIcon size={14} />}
                                                            onClick={() => handleStatusUpdate(advertiser)}
                                                        >
                                                            Update Status
                                                        </Menu.Item>
                                                    )}
                                                    <Menu.Item
                                                        leftSection={<PencilIcon size={14} />}
                                                        component={Link}
                                                        href={route('advertisers.edit', advertiser.id)}
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

                    {advertisers.data.length === 0 && (
                        <div className="text-center py-12">
                            <div className="text-gray-400 text-6xl mb-4">
                                <Building2Icon size={64} className="mx-auto" />
                            </div>
                            <Text size="lg" c="dimmed">No advertisers found</Text>
                            <Text size="sm" c="dimmed">
                                {Object.keys(filters).some(key => filters[key as keyof typeof filters]) 
                                    ? "Try adjusting your filters" 
                                    : "Get started by creating a new advertiser application"}
                            </Text>
                        </div>
                    )}

                    {/* Pagination */}
                    {advertisers.last_page > 1 && (
                        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 dark:border-gray-700">
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                Showing {advertisers.from} to {advertisers.to} of {advertisers.total} advertisers
                            </div>
                            <div className="flex space-x-1">
                                {Array.from({ length: advertisers.last_page }, (_, i) => i + 1).map((page) => (
                                    <Button
                                        key={page}
                                        variant={page === advertisers.current_page ? "filled" : "subtle"}
                                        size="sm"
                                        onClick={() => router.get(route('advertisers.index', { ...filters, page }))}
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