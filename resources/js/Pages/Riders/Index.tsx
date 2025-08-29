import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { Button, TextInput, Select, Badge, Card, Group, Text, Stack, ActionIcon, Menu, Modal, Textarea, CheckIcon, ActionIconGroup } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import type { RidersIndexProps, Rider } from '@/types/rider';
import { AccessibilityIcon, CheckCircleIcon, Clock1Icon, DotSquareIcon, EyeIcon, FilterIcon, MoreVerticalIcon, PencilIcon, PlusIcon, SearchIcon, XIcon } from 'lucide-react';

export default function Index({ riders, stats, filters, users }: RidersIndexProps) {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || '');
    const [selectedUser, setSelectedUser] = useState(filters.user_id?.toString() || '');
    const [selectedRider, setSelectedRider] = useState<Rider | null>(null);
    const [statusModalOpened, { open: openStatusModal, close: closeStatusModal }] = useDisclosure(false);
    const [newStatus, setNewStatus] = useState<'approved' | 'rejected'>('approved');
    const [rejectionReason, setRejectionReason] = useState('');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const params = new URLSearchParams();
        if (searchTerm) params.set('search', searchTerm);
        if (statusFilter) params.set('status', statusFilter);
        if (selectedUser) params.set('user_id', selectedUser);
        
        router.get(route('riders.index', Object.fromEntries(params)));
    };

    const clearFilters = () => {
        setSearchTerm('');
        setStatusFilter('');
        setSelectedUser('');
        router.get(route('riders.index'));
    };

    const getStatusColor = (status: Rider['status']) => {
        const colors = {
            pending: 'yellow',
            approved: 'green',
            rejected: 'red',
        };
        return colors[status];
    };

    const getStatusIcon = (status: Rider['status']) => {
        const icons = {
            pending: <Clock1Icon size={14} />,
            approved: <CheckIcon size={14} />,
            rejected: <XIcon size={14} />,
        };
        return icons[status];
    };

    const handleStatusUpdate = (rider: Rider) => {
        setSelectedRider(rider);
        setNewStatus('approved');
        setRejectionReason('');
        openStatusModal();
    };

    const submitStatusUpdate = () => {
        if (!selectedRider) return;

        router.put(route('riders.update-status', selectedRider.id), {
            status: newStatus,
            rejection_reason: newStatus === 'rejected' ? rejectionReason : undefined,
        }, {
            onSuccess: () => {
                closeStatusModal();
                setSelectedRider(null);
            }
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                            Rider Management
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Manage rider applications and track their status
                        </p>
                    </div>
                    <Button
                        component={Link}
                        href={route('riders.create')}
                        leftSection={<PlusIcon size={16} />}
                        size="sm"
                    >
                        New Rider Application
                    </Button>
                </div>
            }
        >
            <Head title="Riders" />

            <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    <Card className="bg-white dark:bg-gray-800">
                        <Group>
                            <div className="flex-1">
                                <Text size="sm" c="dimmed">Total Riders</Text>
                                <Text size="xl" fw={700}>{stats.total_riders}</Text>
                            </div>
                            <div className="text-3xl">👥</div>
                        </Group>
                    </Card>
                    
                    <Card className="bg-white dark:bg-gray-800">
                        <Group>
                            <div className="flex-1">
                                <Text size="sm" c="dimmed">Pending Applications</Text>
                                <Text size="xl" fw={700} c="yellow">{stats.pending_applications}</Text>
                            </div>
                            <div className="text-3xl">⏳</div>
                        </Group>
                    </Card>
                    
                    <Card className="bg-white dark:bg-gray-800">
                        <Group>
                            <div className="flex-1">
                                <Text size="sm" c="dimmed">Approved Riders</Text>
                                <Text size="xl" fw={700} c="green">{stats.approved_riders}</Text>
                            </div>
                            <div className="text-3xl">✅</div>
                        </Group>
                    </Card>
                    
                    <Card className="bg-white dark:bg-gray-800">
                        <Group>
                            <div className="flex-1">
                                <Text size="sm" c="dimmed">Average Daily Rate</Text>
                                <Text size="xl" fw={700}>KSh {parseFloat(stats.average_daily_rate).toFixed(0)}</Text>
                            </div>
                            <div className="text-3xl">💰</div>
                        </Group>
                    </Card>
                </div>

                {/* Filters */}
                <Card className="bg-white dark:bg-gray-800">
                    <form onSubmit={handleSearch}>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                            <TextInput
                                placeholder="Search riders..."
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

                {/* Riders Table */}
                <Card className="bg-white dark:bg-gray-800">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Rider Details
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Contact Info
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Daily Rate
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Wallet Balance
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
                                {riders.data.map((rider) => (
                                    <tr key={rider.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {rider.user?.name}
                                                </div>
                                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                                    ID: {rider.national_id}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <div className="text-sm text-gray-900 dark:text-white">
                                                    {rider.user?.email}
                                                </div>
                                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                                    M-Pesa: {rider.mpesa_number}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <Badge
                                                color={getStatusColor(rider.status)}
                                                leftSection={getStatusIcon(rider.status)}
                                                variant="light"
                                            >
                                                {rider.status.charAt(0).toUpperCase() + rider.status.slice(1)}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                            KSh {parseFloat(rider.daily_rate).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                            KSh {parseFloat(rider.wallet_balance).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {new Date(rider.created_at).toLocaleDateString()}
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
                                                        href={route('riders.show', rider.id)}
                                                    >
                                                        View Details
                                                    </Menu.Item>
                                                    {rider.status === 'pending' && (
                                                        <Menu.Item
                                                            leftSection={<CheckCircleIcon size={14} />}
                                                            onClick={() => handleStatusUpdate(rider)}
                                                        >
                                                            Update Status
                                                        </Menu.Item>
                                                    )}
                                                    <Menu.Item
                                                        leftSection={<PencilIcon size={14} />}
                                                        component={Link}
                                                        href={route('riders.edit', rider.id)}
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

                    {riders.data.length === 0 && (
                        <div className="text-center py-12">
                            <div className="text-gray-400 text-6xl mb-4">👥</div>
                            <Text size="lg" c="dimmed">No riders found</Text>
                            <Text size="sm" c="dimmed">
                                {Object.keys(filters).some(key => filters[key as keyof typeof filters]) 
                                    ? "Try adjusting your filters" 
                                    : "Get started by creating a new rider application"}
                            </Text>
                        </div>
                    )}

                    {/* Pagination */}
                    {riders.last_page > 1 && (
                        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 dark:border-gray-700">
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                Showing {riders.from} to {riders.to} of {riders.total} riders
                            </div>
                            <div className="flex space-x-1">
                                {Array.from({ length: riders.last_page }, (_, i) => i + 1).map((page) => (
                                    <Button
                                        key={page}
                                        variant={page === riders.current_page ? "filled" : "subtle"}
                                        size="sm"
                                        onClick={() => router.get(route('riders.index', { ...filters, page }))}
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
                title="Update Rider Status"
                centered
            >
                <Stack>
                    <div>
                        <Text size="sm" c="dimmed">Rider</Text>
                        <Text fw={500}>{selectedRider?.user?.name}</Text>
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