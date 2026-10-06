import { useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { formatDate } from '@/utils/formatting';
import {
    Badge,
    Button,
    Card,
    Group,
    Image,
    Modal,
    Paper,
    Select,
    Table,
    Text,
    Textarea,
    Pagination,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { AlertTriangle, CheckCircle, Clock, ShieldAlert } from 'lucide-react';

interface HelmetReportRow {
    id: number;
    helmet_image_url: string | null;
    status_description: string;
    priority_level: 'low' | 'medium' | 'high';
    report_status: 'open' | 'in_progress' | 'resolved' | 'dismissed';
    resolution_notes: string | null;
    resolved_at: string | null;
    created_at: string;
    rider: { id: number; name: string } | null;
    helmet: { id: number; helmet_code: string } | null;
}

interface Stats {
    total_reports: number;
    open_reports: number;
    in_progress: number;
    resolved_reports: number;
    high_priority: number;
    medium_priority: number;
    low_priority: number;
}

interface Props {
    reports: {
        data: HelmetReportRow[];
        current_page: number;
        last_page: number;
        total: number;
    };
    stats: Stats;
    filters: { priority_level?: string; report_status?: string };
}

const PRIORITY_COLOR: Record<HelmetReportRow['priority_level'], string> = {
    low: 'gray',
    medium: 'yellow',
    high: 'red',
};

const STATUS_COLOR: Record<HelmetReportRow['report_status'], string> = {
    open: 'red',
    in_progress: 'yellow',
    resolved: 'green',
    dismissed: 'gray',
};

export default function HelmetReportsIndex({ reports, stats, filters }: Props) {
    const { flash } = usePage().props as any;
    const [resolveModalOpened, { open: openResolveModal, close: closeResolveModal }] = useDisclosure(false);
    const [resolvingId, setResolvingId] = useState<number | null>(null);
    const [resolutionNotes, setResolutionNotes] = useState('');
    const [busy, setBusy] = useState(false);

    const handleFilterChange = (key: 'priority_level' | 'report_status', value: string | null) => {
        router.get(route('admin.helmet-reports.index'), { ...filters, [key]: value || undefined }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const openResolve = (id: number) => {
        setResolvingId(id);
        setResolutionNotes('');
        openResolveModal();
    };

    const submitResolve = () => {
        if (!resolvingId || resolutionNotes.trim().length < 5) return;
        setBusy(true);
        router.patch(route('admin.helmet-reports.resolve', resolvingId), { resolution_notes: resolutionNotes }, {
            preserveScroll: true,
            onFinish: () => setBusy(false),
            onSuccess: () => closeResolveModal(),
        });
    };

    const handlePageChange = (page: number) => {
        router.get(route('admin.helmet-reports.index'), { ...filters, page }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const StatCard = ({ icon: Icon, label, value }: any) => (
        <Paper p="md" withBorder>
            <Group gap="sm">
                <div className="p-2 rounded-lg bg-gray-100">
                    <Icon size={20} className="text-gray-500" />
                </div>
                <div>
                    <Text size="xs" c="dimmed">{label}</Text>
                    <Text size="lg" fw={700}>{value}</Text>
                </div>
            </Group>
        </Paper>
    );

    return (
        <AuthenticatedLayout header="Helmet Reports">
            <Head title="Helmet Reports" />

            <div className="space-y-6">
                {flash?.success && (
                    <Paper p="sm" className="bg-green-50 border border-green-200">
                        <Text size="sm" c="green">{flash.success}</Text>
                    </Paper>
                )}
                {flash?.error && (
                    <Paper p="sm" className="bg-red-50 border border-red-200">
                        <Text size="sm" c="red">{flash.error}</Text>
                    </Paper>
                )}

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <StatCard icon={ShieldAlert} label="Total Reports" value={stats.total_reports} />
                    <StatCard icon={AlertTriangle} label="Open" value={stats.open_reports} />
                    <StatCard icon={Clock} label="In Progress" value={stats.in_progress} />
                    <StatCard icon={CheckCircle} label="Resolved" value={stats.resolved_reports} />
                </div>

                <Card withBorder radius="md">
                    <Group justify="space-between" mb="md">
                        <Text fw={600} size="lg">Helmet Reports</Text>
                        <Group>
                            <Select
                                placeholder="All statuses"
                                data={[
                                    { value: 'open', label: 'Open' },
                                    { value: 'in_progress', label: 'In Progress' },
                                    { value: 'resolved', label: 'Resolved' },
                                    { value: 'dismissed', label: 'Dismissed' },
                                ]}
                                value={filters.report_status ?? ''}
                                onChange={(v) => handleFilterChange('report_status', v)}
                                clearable
                                w={170}
                            />
                            <Select
                                placeholder="All priorities"
                                data={[
                                    { value: 'high', label: 'High' },
                                    { value: 'medium', label: 'Medium' },
                                    { value: 'low', label: 'Low' },
                                ]}
                                value={filters.priority_level ?? ''}
                                onChange={(v) => handleFilterChange('priority_level', v)}
                                clearable
                                w={170}
                            />
                        </Group>
                    </Group>

                    {reports.data.length > 0 ? (
                        <div className="overflow-x-auto">
                            <Table>
                                <Table.Thead>
                                    <Table.Tr>
                                        <Table.Th>Photo</Table.Th>
                                        <Table.Th>Rider</Table.Th>
                                        <Table.Th>Helmet</Table.Th>
                                        <Table.Th>Description</Table.Th>
                                        <Table.Th>Priority</Table.Th>
                                        <Table.Th>Status</Table.Th>
                                        <Table.Th>Reported</Table.Th>
                                        <Table.Th>Actions</Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {reports.data.map((r) => (
                                        <Table.Tr key={r.id}>
                                            <Table.Td>
                                                {r.helmet_image_url ? (
                                                    <Image
                                                        src={r.helmet_image_url}
                                                        alt="Helmet report"
                                                        w={48}
                                                        h={48}
                                                        radius="sm"
                                                        fit="cover"
                                                        style={{ cursor: 'pointer' }}
                                                        onClick={() => window.open(r.helmet_image_url!, '_blank')}
                                                    />
                                                ) : '—'}
                                            </Table.Td>
                                            <Table.Td>
                                                <Text size="sm">{r.rider?.name ?? 'Unknown'}</Text>
                                            </Table.Td>
                                            <Table.Td>
                                                <Badge variant="outline">{r.helmet?.helmet_code ?? '—'}</Badge>
                                            </Table.Td>
                                            <Table.Td>
                                                <Text size="sm" lineClamp={2} maw={260}>{r.status_description}</Text>
                                                {r.report_status === 'resolved' && r.resolution_notes && (
                                                    <Text size="xs" c="dimmed" mt={4}>Resolution: {r.resolution_notes}</Text>
                                                )}
                                            </Table.Td>
                                            <Table.Td>
                                                <Badge color={PRIORITY_COLOR[r.priority_level]} variant="light">
                                                    {r.priority_level}
                                                </Badge>
                                            </Table.Td>
                                            <Table.Td>
                                                <Badge color={STATUS_COLOR[r.report_status]} variant="light">
                                                    {r.report_status.replace('_', ' ')}
                                                </Badge>
                                            </Table.Td>
                                            <Table.Td>
                                                <Text size="sm">{formatDate(r.created_at)}</Text>
                                            </Table.Td>
                                            <Table.Td>
                                                {r.report_status === 'open' || r.report_status === 'in_progress' ? (
                                                    <Button
                                                        size="xs"
                                                        color="green"
                                                        leftSection={<CheckCircle size={14} />}
                                                        onClick={() => openResolve(r.id)}
                                                    >
                                                        Resolve
                                                    </Button>
                                                ) : (
                                                    <Text size="xs" c="dimmed">—</Text>
                                                )}
                                            </Table.Td>
                                        </Table.Tr>
                                    ))}
                                </Table.Tbody>
                            </Table>
                        </div>
                    ) : (
                        <Paper p="xl" className="text-center">
                            <ShieldAlert size={40} className="mx-auto text-gray-300 mb-3" />
                            <Text c="dimmed">No helmet reports found.</Text>
                        </Paper>
                    )}

                    {reports.last_page > 1 && (
                        <Group justify="center" mt="md">
                            <Pagination total={reports.last_page} value={reports.current_page} onChange={handlePageChange} />
                        </Group>
                    )}
                </Card>
            </div>

            <Modal opened={resolveModalOpened} onClose={closeResolveModal} title="Resolve Helmet Report" centered>
                <Text size="sm" c="dimmed" mb="sm">
                    Describe what was done to resolve this report (e.g. helmet repaired, replaced, or found to be fine).
                </Text>
                <Textarea
                    placeholder="Resolution notes (minimum 5 characters)"
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    minRows={3}
                    mb="md"
                    required
                />
                <Group justify="flex-end">
                    <Button variant="subtle" onClick={closeResolveModal}>Cancel</Button>
                    <Button
                        color="green"
                        loading={busy}
                        disabled={resolutionNotes.trim().length < 5}
                        onClick={submitResolve}
                    >
                        Mark Resolved
                    </Button>
                </Group>
            </Modal>
        </AuthenticatedLayout>
    );
}
