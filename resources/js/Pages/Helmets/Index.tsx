import { useState } from 'react';
import { formatDateShort } from '@/utils/formatting';
import { getHelmetStatusColor } from '@/utils/status';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import {
    Button,
    TextInput,
    Select,
    Badge,
    Card,
    Group,
    Text,
    Stack,
    ActionIcon,
    Menu,
    Modal,
    Checkbox
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
    HardHat,
    EyeIcon,
    FilterIcon,
    MoreVerticalIcon,
    PencilIcon,
    PlusIcon,
    SearchIcon,
    Trash2Icon,
    CheckCircleIcon,
    WrenchIcon,
    XCircleIcon,
    QrCode,
    DownloadIcon,
} from 'lucide-react';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';

interface Helmet {
    id: number;
    helmet_code: string;
    qr_code?: string;
    status: 'available' | 'assigned' | 'maintenance' | 'retired';
    current_branding?: string;
    created_at: string;
    updated_at: string;
    current_assignment?: {
        id: number;
        campaign?: {
            id: number;
            name: string;
        };
        rider: {
            id: number;
            user: {
                id: number;
                name: string;
                email: string;
                phone?: string;
            };
        };
    };
}

interface HelmetStats {
    total_helmets: number;
    available_helmets: number;
    assigned_helmets: number;
    maintenance_helmets: number;
    retired_helmets: number;
}

interface PaginatedHelmets {
    data: Helmet[];
    current_page: number;
    last_page: number;
    from: number;
    to: number;
    total: number;
}

interface HelmetIndexProps {
    helmets: PaginatedHelmets;
    stats: HelmetStats;
    filters: {
        search?: string;
        status?: string;
    };
}

export default function Index({ helmets, stats, filters }: HelmetIndexProps) {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || '');
    const [selectedHelmets, setSelectedHelmets] = useState<number[]>([]);
    const [bulkModalOpened, { open: openBulkModal, close: closeBulkModal }] = useDisclosure(false);
    const [bulkStatus, setBulkStatus] = useState<string>('');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const params = new URLSearchParams();
        if (searchTerm) params.set('search', searchTerm);
        if (statusFilter) params.set('status', statusFilter);

        router.get(route('helmets.index', Object.fromEntries(params)));
    };

    const clearFilters = () => {
        setSearchTerm('');
        setStatusFilter('');
        router.get(route('helmets.index'));
    };

    const getStatusColor = (status: Helmet['status']): string => getHelmetStatusColor(status);

    const getStatusIcon = (status: Helmet['status']) => {
        const icons = {
            available: <CheckCircleIcon size={14} />,
            assigned: <HardHat size={14} />,
            maintenance: <WrenchIcon size={14} />,
            retired: <XCircleIcon size={14} />,
        };
        return icons[status];
    };

    const handleBulkStatusUpdate = () => {
        if (selectedHelmets.length === 0 || !bulkStatus) return;

        router.post(route('helmets.bulk-update-status'), {
            helmet_ids: selectedHelmets,
            status: bulkStatus,
        }, {
            onSuccess: () => {
                closeBulkModal();
                setSelectedHelmets([]);
                setBulkStatus('');
            }
        });
    };

    const toggleHelmetSelection = (helmetId: number) => {
        setSelectedHelmets(prev =>
            prev.includes(helmetId)
                ? prev.filter(id => id !== helmetId)
                : [...prev, helmetId]
        );
    };

    const toggleAllHelmets = () => {
        if (selectedHelmets.length === helmets.data.length) {
            setSelectedHelmets([]);
        } else {
            setSelectedHelmets(helmets.data.map(h => h.id));
        }
    };

    const handleDownloadQrPdf = async (helmet: Helmet) => {
        if (!helmet.qr_code) return;

        const canvas = document.createElement('canvas');
        await QRCode.toCanvas(canvas, helmet.qr_code, { width: 300, margin: 2 });
        const imgData = canvas.toDataURL('image/png');

        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageW = pdf.internal.pageSize.getWidth();

        pdf.setFontSize(18);
        pdf.setFont('helvetica', 'bold');
        pdf.text('RANDA — Helmet QR Code', pageW / 2, 24, { align: 'center' });

        pdf.setFontSize(13);
        pdf.setFont('courier', 'bold');
        pdf.text(helmet.helmet_code, pageW / 2, 34, { align: 'center' });

        const size = 100;
        const x = (pageW - size) / 2;
        pdf.addImage(imgData, 'PNG', x, 44, size, size);

        pdf.setFontSize(9);
        pdf.setFont('courier', 'normal');
        pdf.setTextColor(100);
        pdf.text(helmet.qr_code, pageW / 2, 152, { align: 'center', maxWidth: pageW - 30 });

        pdf.setFontSize(8);
        pdf.setTextColor(150);
        pdf.text(`Generated ${new Date().toLocaleDateString('en-KE')} · RANDA GPS Platform`, pageW / 2, 270, { align: 'center' });

        pdf.save(`${helmet.helmet_code}.pdf`);
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                            Helmet Management
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Manage helmet inventory and track their status
                        </p>
                    </div>
                    <Button
                        component={Link}
                        href={route('helmets.create')}
                        leftSection={<PlusIcon size={16} />}
                        size="sm"
                    >
                        Add New Helmet
                    </Button>
                </div>
            }
        >
            <Head title="Helmets" />

            <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-5">
                    <Card className="bg-white">
                        <Group>
                            <div className="flex-1">
                                <Text size="sm" c="dimmed">Total Helmets</Text>
                                <Text size="xl" fw={700}>{stats.total_helmets}</Text>
                            </div>
                            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                <HardHat size={20} className="text-gray-500" />
                            </div>
                        </Group>
                    </Card>

                    <Card className="bg-white">
                        <Group>
                            <div className="flex-1">
                                <Text size="sm" c="dimmed">Available</Text>
                                <Text size="xl" fw={700}>{stats.available_helmets}</Text>
                            </div>
                            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                <CheckCircleIcon size={20} className="text-gray-500" />
                            </div>
                        </Group>
                    </Card>

                    <Card className="bg-white">
                        <Group>
                            <div className="flex-1">
                                <Text size="sm" c="dimmed">Assigned</Text>
                                <Text size="xl" fw={700}>{stats.assigned_helmets}</Text>
                            </div>
                            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                <HardHat size={20} className="text-gray-500" />
                            </div>
                        </Group>
                    </Card>

                    <Card className="bg-white">
                        <Group>
                            <div className="flex-1">
                                <Text size="sm" c="dimmed">Maintenance</Text>
                                <Text size="xl" fw={700}>{stats.maintenance_helmets}</Text>
                            </div>
                            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                <WrenchIcon size={20} className="text-gray-500" />
                            </div>
                        </Group>
                    </Card>

                    <Card className="bg-white">
                        <Group>
                            <div className="flex-1">
                                <Text size="sm" c="dimmed">Retired</Text>
                                <Text size="xl" fw={700}>{stats.retired_helmets}</Text>
                            </div>
                            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                <XCircleIcon size={20} className="text-gray-500" />
                            </div>
                        </Group>
                    </Card>
                </div>

                {/* Filters */}
                <Card className="bg-white dark:bg-gray-800">
                    <form onSubmit={handleSearch}>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <TextInput
                                placeholder="Search helmets..."
                                leftSection={<SearchIcon size={16} />}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.currentTarget.value)}
                            />

                            <Select
                                placeholder="Filter by status"
                                data={[
                                    { value: '', label: 'All Status' },
                                    { value: 'available', label: 'Available' },
                                    { value: 'assigned', label: 'Assigned' },
                                    { value: 'maintenance', label: 'Maintenance' },
                                    { value: 'retired', label: 'Retired' },
                                ]}
                                value={statusFilter}
                                onChange={(value) => setStatusFilter(value || '')}
                            />

                            <Group>
                                <Button type="submit" leftSection={<FilterIcon size={16} />}>
                                    Filter
                                </Button>
                                <Button variant="light" onClick={clearFilters}>
                                    Clear
                                </Button>
                                {selectedHelmets.length > 0 && (
                                    <Button
                                        variant="outline"
                                        onClick={openBulkModal}
                                        color="blue"
                                    >
                                        Update {selectedHelmets.length} Selected
                                    </Button>
                                )}
                            </Group>
                        </div>
                    </form>
                </Card>

                {/* Helmets Table */}
                <Card className="bg-white">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        <Checkbox
                                            checked={selectedHelmets.length === helmets.data.length && helmets.data.length > 0}
                                            indeterminate={selectedHelmets.length > 0 && selectedHelmets.length < helmets.data.length}
                                            onChange={toggleAllHelmets}
                                        />
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Helmet Code</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">QR Code</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Rider</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campaign</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {helmets.data.map((helmet) => (
                                    <tr key={helmet.id} className="hover:bg-gray-50/60 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <Checkbox
                                                checked={selectedHelmets.includes(helmet.id)}
                                                onChange={() => toggleHelmetSelection(helmet.id)}
                                            />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <HardHat size={20} className="text-gray-400 mr-3" />
                                                <div className="text-sm font-medium text-gray-900">
                                                    {helmet.helmet_code}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                {helmet.qr_code ? (
                                                    <>
                                                        <QrCode size={16} className="text-green-500" />
                                                        <Text size="sm" c="green">Generated</Text>
                                                    </>
                                                ) : (
                                                    <Text size="sm" c="dimmed">—</Text>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <Badge
                                                color={getStatusColor(helmet.status)}
                                                leftSection={getStatusIcon(helmet.status)}
                                                variant="light"
                                            >
                                                {helmet.status.charAt(0).toUpperCase() + helmet.status.slice(1)}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {helmet.current_assignment ? (
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {helmet.current_assignment.rider.user.name}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {helmet.current_assignment.rider.user.email}
                                                    </div>
                                                    {helmet.current_assignment.campaign && (
                                                        <div className="text-xs text-blue-600 dark:text-blue-400">
                                                            Campaign: {helmet.current_assignment.campaign.name}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <Text size="sm" c="dimmed">Not assigned</Text>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 max-w-[180px] truncate text-sm text-gray-500" title={helmet.current_assignment?.campaign?.name ?? undefined}>
                                            {helmet.current_assignment?.campaign?.name ?? ''}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {formatDateShort(helmet.created_at)}
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
                                                        href={route('helmets.show', helmet.id)}
                                                    >
                                                        View Details
                                                    </Menu.Item>
                                                    <Menu.Item
                                                        leftSection={<PencilIcon size={14} />}
                                                        component={Link}
                                                        href={route('helmets.edit', helmet.id)}
                                                    >
                                                        Edit
                                                    </Menu.Item>
                                                    {helmet.qr_code && (
                                                        <Menu.Item
                                                            leftSection={<DownloadIcon size={14} />}
                                                            onClick={() => handleDownloadQrPdf(helmet)}
                                                        >
                                                            Download QR PDF
                                                        </Menu.Item>
                                                    )}
                                                    <Menu.Divider />
                                                    <Menu.Item
                                                        leftSection={<Trash2Icon size={14} />}
                                                        color="red"
                                                        onClick={() => {
                                                            if (confirm('Are you sure you want to delete this helmet?')) {
                                                                router.delete(route('helmets.destroy', helmet.id));
                                                            }
                                                        }}
                                                    >
                                                        Delete
                                                    </Menu.Item>
                                                </Menu.Dropdown>
                                            </Menu>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {helmets.data.length === 0 && (
                        <div className="text-center py-12">
                            <div className="text-gray-400 text-6xl mb-4">
                                <HardHat size={64} className="mx-auto" />
                            </div>
                            <Text size="lg" c="dimmed">No helmets found</Text>
                            <Text size="sm" c="dimmed">
                                {Object.keys(filters).some(key => filters[key as keyof typeof filters])
                                    ? "Try adjusting your filters"
                                    : "Get started by adding a new helmet"}
                            </Text>
                        </div>
                    )}

                    {/* Pagination */}
                    {helmets.last_page > 1 && (
                        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100">
                            <div className="text-sm text-gray-500">
                                Showing {helmets.from} to {helmets.to} of {helmets.total} helmets
                            </div>
                            <div className="flex space-x-1">
                                {Array.from({ length: helmets.last_page }, (_, i) => i + 1).map((page) => (
                                    <Button
                                        key={page}
                                        variant={page === helmets.current_page ? "filled" : "subtle"}
                                        size="sm"
                                        onClick={() => router.get(route('helmets.index', { ...filters, page }))}
                                    >
                                        {page}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}
                </Card>
            </div>

            {/* Bulk Status Update Modal */}
            <Modal
                opened={bulkModalOpened}
                onClose={closeBulkModal}
                title="Update Helmet Status"
                centered
            >
                <Stack>
                    <div>
                        <Text size="sm" c="dimmed">Selected Helmets</Text>
                        <Text fw={500}>{selectedHelmets.length} helmet(s) selected</Text>
                    </div>

                    <Select
                        label="New Status"
                        placeholder="Select status"
                        data={[
                            { value: 'available', label: 'Available' },
                            { value: 'assigned', label: 'Assigned' },
                            { value: 'maintenance', label: 'Maintenance' },
                            { value: 'retired', label: 'Retired' },
                        ]}
                        value={bulkStatus}
                        onChange={(value) => setBulkStatus(value || '')}
                    />

                    <Group justify="flex-end">
                        <Button variant="light" onClick={closeBulkModal}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleBulkStatusUpdate}
                            disabled={!bulkStatus}
                        >
                            Update Status
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </AuthenticatedLayout>
    );
}