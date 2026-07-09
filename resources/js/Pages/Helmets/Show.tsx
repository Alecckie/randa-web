import { useRef, useEffect } from 'react';
import { formatDate, formatDateShort } from '@/utils/formatting';
import { getHelmetStatusColor, getAssignmentStatusColor, getCampaignStatusColor } from '@/utils/status';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import {
    Button,
    Badge,
    Card,
    Group,
    Text,
    Stack,
    Grid,
    Paper,
    Table,
    Divider,
    Alert,
    ActionIcon,
    Menu,
} from '@mantine/core';
import {
    ArrowLeft,
    HardHat,
    QrCode,
    PencilIcon,
    Trash2Icon,
    CheckCircleIcon,
    XCircleIcon,
    WrenchIcon,
    CalendarIcon,
    UserIcon,
    MegaphoneIcon,
    MoreVerticalIcon,
    ClockIcon,
    InfoIcon,
    AlertTriangleIcon,
    DownloadIcon,
} from 'lucide-react';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';

// ── Interfaces ────────────────────────────────────────────────────────────────

interface RiderUser {
    id: number;
    name: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
    phone: string | null;
}

interface Rider {
    id: number;
    national_id: string;
    status: 'pending' | 'approved' | 'rejected';
    mpesa_number: string;
    daily_rate: string;
    user: RiderUser;
}

interface Assignment {
    id: number;
    status: string;
    assigned_at: string;
    completed_at: string | null;
    campaign: {
        id: number;
        name: string;
        status: string;
    } | null;
    rider: Rider | null;
}

interface Helmet {
    id: number;
    helmet_code: string;
    qr_code?: string;
    status: 'available' | 'assigned' | 'maintenance' | 'retired';
    current_branding?: string;
    created_at: string;
    updated_at: string;
    current_assignment?: Assignment | null;
    assignments: Assignment[];
}

interface ShowProps {
    helmet: Helmet;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Show({ helmet }: ShowProps) {
    const qrCanvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (helmet.qr_code && qrCanvasRef.current) {
            QRCode.toCanvas(qrCanvasRef.current, helmet.qr_code, {
                width: 200,
                margin: 2,
                color: { dark: '#000000', light: '#ffffff' },
            });
        }
    }, [helmet.qr_code]);

    const handleDownloadPdf = () => {
        if (!helmet.qr_code || !qrCanvasRef.current) return;

        const canvas = qrCanvasRef.current;
        const imgData = canvas.toDataURL('image/png');

        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageW = pdf.internal.pageSize.getWidth();

        // Title
        pdf.setFontSize(18);
        pdf.setFont('helvetica', 'bold');
        pdf.text('RANDA — Helmet QR Code', pageW / 2, 24, { align: 'center' });

        // Helmet code
        pdf.setFontSize(13);
        pdf.setFont('courier', 'bold');
        pdf.text(helmet.helmet_code, pageW / 2, 34, { align: 'center' });

        // QR image centred
        const size = 100;
        const x = (pageW - size) / 2;
        pdf.addImage(imgData, 'PNG', x, 44, size, size);

        // QR data string below
        pdf.setFontSize(9);
        pdf.setFont('courier', 'normal');
        pdf.setTextColor(100);
        pdf.text(helmet.helmet_code, pageW / 2, 152, { align: 'center', maxWidth: pageW - 30 });

        // Footer
        pdf.setFontSize(8);
        pdf.setTextColor(150);
        pdf.text(`Generated ${new Date().toLocaleDateString('en-KE')} · RANDA GPS Platform`, pageW / 2, 270, { align: 'center' });

        pdf.save(`${helmet.helmet_code}.pdf`);
    };

    // ── Helpers ───────────────────────────────────────────────────────────────

    const getStatusIcon = (status: Helmet['status']): React.ReactNode => {
        const icons: Record<Helmet['status'], React.ReactNode> = {
            available:   <CheckCircleIcon size={16} />,
            assigned:    <HardHat size={16} />,
            maintenance: <WrenchIcon size={16} />,
            retired:     <XCircleIcon size={16} />,
        };
        return icons[status] ?? null;
    };

    const getRiderFullName = (rider?: Rider | null): string => {
        if (!rider?.user) return '—';
        const { first_name, last_name, name } = rider.user;
        if (first_name || last_name) return [first_name, last_name].filter(Boolean).join(' ');
        return name || '—';
    };

    const handleDelete = () => {
        if (confirm('Are you sure you want to delete this helmet? This action cannot be undone.')) {
            router.delete(route('helmets.destroy', helmet.id));
        }
    };

    // ── Derived state ─────────────────────────────────────────────────────────

    const assignments      = helmet.assignments ?? [];
    const totalAssignments = assignments.length;
    const completedCount   = assignments.filter(a => a.status === 'completed').length;
    const cancelledCount   = assignments.filter(a => a.status === 'cancelled').length;
    const isAssigned       = !!helmet.current_assignment;

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="subtle"
                            leftSection={<ArrowLeft size={16} />}
                            component={Link}
                            href={route('helmets.index')}
                        >
                            Back to Helmets
                        </Button>
                        <div>
                            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white font-mono">
                                {helmet.helmet_code}
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                Helmet Details & Assignment History
                            </p>
                        </div>
                    </div>

                    <Group>
                        <Badge
                            size="lg"
                            color={getHelmetStatusColor(helmet.status)}
                            variant="light"
                            leftSection={getStatusIcon(helmet.status)}
                        >
                            {helmet.status.charAt(0).toUpperCase() + helmet.status.slice(1)}
                        </Badge>

                        <Menu shadow="md" width={180}>
                            <Menu.Target>
                                <ActionIcon variant="subtle" size="lg">
                                    <MoreVerticalIcon size={20} />
                                </ActionIcon>
                            </Menu.Target>
                            <Menu.Dropdown>
                                <Menu.Item
                                    leftSection={<PencilIcon size={14} />}
                                    component={Link}
                                    href={route('helmets.edit', helmet.id)}
                                >
                                    Edit Helmet
                                </Menu.Item>
                                {helmet.qr_code && (
                                    <Menu.Item
                                        leftSection={<DownloadIcon size={14} />}
                                        onClick={handleDownloadPdf}
                                    >
                                        Download QR PDF
                                    </Menu.Item>
                                )}
                                <Menu.Divider />
                                <Menu.Item
                                    leftSection={<Trash2Icon size={14} />}
                                    color="red"
                                    onClick={handleDelete}
                                    disabled={isAssigned}
                                >
                                    Delete Helmet
                                </Menu.Item>
                            </Menu.Dropdown>
                        </Menu>
                    </Group>
                </div>
            }
        >
            <Head title={`Helmet — ${helmet.helmet_code}`} />

            <div className="space-y-6">

                {/* ── Contextual alerts ── */}
                {helmet.current_assignment && (
                    <Alert icon={<InfoIcon size={16} />} color="blue" variant="light" title="Currently Assigned">
                        This helmet is active in campaign{' '}
                        {helmet.current_assignment.campaign ? (
                            <Link
                                href={route('campaigns.show', helmet.current_assignment.campaign.id)}
                                className="font-semibold underline"
                            >
                                {helmet.current_assignment.campaign.name}
                            </Link>
                        ) : (
                            <strong>Unknown Campaign</strong>
                        )}{' '}
                        ridden by <strong>{getRiderFullName(helmet.current_assignment.rider)}</strong>.
                    </Alert>
                )}

                {helmet.status === 'retired' && (
                    <Alert icon={<AlertTriangleIcon size={16} />} color="red" variant="light" title="Retired Helmet">
                        This helmet has been retired and is no longer available for campaign assignments.
                    </Alert>
                )}

                {/* ── Stats overview ── */}
                <Grid gutter="md">
                    {[
                        { label: 'Total Assignments', value: totalAssignments, icon: <ClockIcon size={28} className="text-gray-400" /> },
                        { label: 'Completed',         value: completedCount,   icon: <CheckCircleIcon size={28} className="text-gray-400" /> },
                        { label: 'Cancelled',         value: cancelledCount,   icon: <XCircleIcon size={28} className="text-gray-400" /> },
                        { label: 'Status',            value: helmet.status.charAt(0).toUpperCase() + helmet.status.slice(1), icon: <HardHat size={28} className="text-gray-400" /> },
                    ].map((s) => (
                        <Grid.Col key={s.label} span={{ base: 12, sm: 6, md: 3 }}>
                            <Paper shadow="xs" p="md" withBorder className="bg-white dark:bg-gray-900">
                                <Group justify="apart">
                                    <div>
                                        <Text size="xs" c="dimmed" tt="uppercase" fw={600}>{s.label}</Text>
                                        <Text size="xl" fw={700}>{s.value}</Text>
                                    </div>
                                    {s.icon}
                                </Group>
                            </Paper>
                        </Grid.Col>
                    ))}
                </Grid>

                {/* ── Main content ── */}
                <Grid gutter="md">

                    {/* Left column */}
                    <Grid.Col span={{ base: 12, md: 5 }}>
                        <Stack gap="md">

                            {/* Helmet Details */}
                            <Card withBorder shadow="xs" radius="md" p="lg" className="bg-white dark:bg-gray-900">
                                <Stack gap="md">
                                    <Group>
                                        <HardHat size={18} className="text-gray-400" />
                                        <Text size="sm" fw={700} tt="uppercase" c="dimmed" style={{ letterSpacing: '0.05em' }}>Helmet Details</Text>
                                    </Group>
                                    <Divider />
                                    <Stack gap="sm">
                                        {[
                                            { label: 'Helmet Code', value: <span className="font-mono font-semibold">{helmet.helmet_code}</span> },
                                            { label: 'Status', value: <Badge color={getHelmetStatusColor(helmet.status)} variant="light" leftSection={getStatusIcon(helmet.status)}>{helmet.status.charAt(0).toUpperCase() + helmet.status.slice(1)}</Badge> },
                                            { label: 'Current Branding', value: helmet.current_branding || '—' },
                                            { label: 'Created', value: formatDate(helmet.created_at) },
                                            { label: 'Last Updated', value: formatDate(helmet.updated_at) },
                                        ].map((row) => (
                                            <Group key={row.label} justify="apart" wrap="nowrap">
                                                <Text size="sm" c="dimmed" style={{ flexShrink: 0 }}>{row.label}</Text>
                                                <Text size="sm" ta="right">{row.value}</Text>
                                            </Group>
                                        ))}
                                    </Stack>
                                </Stack>
                            </Card>

                            {/* QR Code */}
                            <Card withBorder shadow="xs" radius="md" p="lg" className="bg-white dark:bg-gray-900">
                                <Stack gap="md">
                                    <Group justify="apart">
                                        <Group gap="xs">
                                            <QrCode size={18} className="text-gray-400" />
                                            <Text size="sm" fw={700} tt="uppercase" c="dimmed" style={{ letterSpacing: '0.05em' }}>QR Code</Text>
                                        </Group>
                                        {helmet.qr_code && (
                                            <Button
                                                size="xs"
                                                variant="light"
                                                color="green"
                                                leftSection={<DownloadIcon size={13} />}
                                                onClick={handleDownloadPdf}
                                            >
                                                Download PDF
                                            </Button>
                                        )}
                                    </Group>
                                    <Divider />
                                    {helmet.qr_code ? (
                                        <Stack align="center" gap="sm">
                                            <div className="p-3 bg-white border border-gray-200 dark:border-gray-700 rounded-lg inline-block">
                                                <canvas ref={qrCanvasRef} />
                                            </div>
                                            <Text size="xs" className="font-mono text-gray-500 dark:text-gray-400 break-all text-center">
                                                {helmet.qr_code}
                                            </Text>
                                        </Stack>
                                    ) : (
                                        <Text size="sm" c="dimmed" ta="center" py="md">
                                            No QR code generated for this helmet.
                                        </Text>
                                    )}
                                </Stack>
                            </Card>

                            {/* Quick Actions */}
                            <Card withBorder shadow="xs" radius="md" p="lg" className="bg-white dark:bg-gray-900">
                                <Stack gap="md">
                                    <Text size="sm" fw={700} tt="uppercase" c="dimmed" style={{ letterSpacing: '0.05em' }}>Quick Actions</Text>
                                    <Divider />
                                    <Stack gap="xs">
                                        <Button
                                            fullWidth
                                            variant="light"
                                            leftSection={<PencilIcon size={16} />}
                                            component={Link}
                                            href={route('helmets.edit', helmet.id)}
                                        >
                                            Edit Helmet
                                        </Button>
                                        {helmet.qr_code && (
                                            <Button
                                                fullWidth
                                                variant="light"
                                                color="green"
                                                leftSection={<DownloadIcon size={16} />}
                                                onClick={handleDownloadPdf}
                                            >
                                                Download QR Code PDF
                                            </Button>
                                        )}
                                        <Button
                                            fullWidth
                                            variant="light"
                                            color="red"
                                            leftSection={<Trash2Icon size={16} />}
                                            onClick={handleDelete}
                                            disabled={isAssigned}
                                        >
                                            Delete Helmet
                                        </Button>
                                        {isAssigned && (
                                            <Text size="xs" c="dimmed" ta="center">
                                                Cannot delete while helmet is assigned to a campaign.
                                            </Text>
                                        )}
                                    </Stack>
                                </Stack>
                            </Card>

                        </Stack>
                    </Grid.Col>

                    {/* Right column */}
                    <Grid.Col span={{ base: 12, md: 7 }}>
                        <Stack gap="md">

                            {/* Current Assignment */}
                            <Card withBorder shadow="xs" radius="md" p="lg" className="bg-white dark:bg-gray-900">
                                <Stack gap="md">
                                    <Group>
                                        <MegaphoneIcon size={18} className="text-gray-400" />
                                        <Text size="sm" fw={700} tt="uppercase" c="dimmed" style={{ letterSpacing: '0.05em' }}>Current Assignment</Text>
                                    </Group>
                                    <Divider />

                                    {helmet.current_assignment ? (
                                        <Paper p="md" withBorder radius="sm">
                                            <Stack gap="sm">
                                                <Group justify="apart">
                                                    <Group gap="xs">
                                                        <MegaphoneIcon size={14} className="text-gray-400" />
                                                        <Text size="sm" c="dimmed">Campaign</Text>
                                                    </Group>
                                                    {helmet.current_assignment.campaign ? (
                                                        <Link
                                                            href={route('campaigns.show', helmet.current_assignment.campaign.id)}
                                                            className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                                                        >
                                                            {helmet.current_assignment.campaign.name}
                                                        </Link>
                                                    ) : (
                                                        <Text size="sm" c="dimmed">Unknown Campaign</Text>
                                                    )}
                                                </Group>

                                                <Group justify="apart" align="flex-start">
                                                    <Group gap="xs">
                                                        <UserIcon size={14} className="text-gray-400" />
                                                        <Text size="sm" c="dimmed">Rider</Text>
                                                    </Group>
                                                    <div className="text-right">
                                                        <Text size="sm" fw={500}>{getRiderFullName(helmet.current_assignment.rider)}</Text>
                                                        <Text size="xs" c="dimmed">{helmet.current_assignment.rider?.user?.email ?? '—'}</Text>
                                                        {helmet.current_assignment.rider?.user?.phone && (
                                                            <Text size="xs" c="dimmed">{helmet.current_assignment.rider.user.phone}</Text>
                                                        )}
                                                    </div>
                                                </Group>

                                                <Group justify="apart">
                                                    <Group gap="xs">
                                                        <CalendarIcon size={14} className="text-gray-400" />
                                                        <Text size="sm" c="dimmed">Assigned On</Text>
                                                    </Group>
                                                    <Text size="sm">{formatDate(helmet.current_assignment.assigned_at)}</Text>
                                                </Group>

                                                <Group justify="apart">
                                                    <Text size="sm" c="dimmed">Campaign Status</Text>
                                                    {helmet.current_assignment.campaign ? (
                                                        <Badge size="sm" color={getCampaignStatusColor(helmet.current_assignment.campaign.status)} variant="light">
                                                            {helmet.current_assignment.campaign.status.replace('_', ' ').toUpperCase()}
                                                        </Badge>
                                                    ) : (
                                                        <Text size="sm" c="dimmed">—</Text>
                                                    )}
                                                </Group>
                                            </Stack>
                                        </Paper>
                                    ) : (
                                        <Paper p="xl" withBorder radius="sm" className="text-center">
                                            <HardHat size={36} className="mx-auto text-gray-300 mb-2" />
                                            <Text size="sm" c="dimmed">Not currently assigned to any campaign.</Text>
                                        </Paper>
                                    )}
                                </Stack>
                            </Card>

                            {/* Assignment History */}
                            <Card withBorder shadow="xs" radius="md" p="lg" className="bg-white dark:bg-gray-900">
                                <Stack gap="md">
                                    <Group>
                                        <ClockIcon size={18} className="text-gray-400" />
                                        <Text size="sm" fw={700} tt="uppercase" c="dimmed" style={{ letterSpacing: '0.05em' }}>Assignment History</Text>
                                        <Badge variant="outline" size="sm">{totalAssignments}</Badge>
                                    </Group>
                                    <Divider />

                                    {assignments.length > 0 ? (
                                        <Table withTableBorder={false}>
                                            <Table.Thead>
                                                <Table.Tr>
                                                    <Table.Th>Campaign</Table.Th>
                                                    <Table.Th>Rider</Table.Th>
                                                    <Table.Th>Assigned</Table.Th>
                                                    <Table.Th>Completed</Table.Th>
                                                    <Table.Th>Status</Table.Th>
                                                </Table.Tr>
                                            </Table.Thead>
                                            <Table.Tbody>
                                                {assignments.map((assignment) => (
                                                    <Table.Tr key={assignment.id}>
                                                        <Table.Td>
                                                            {assignment.campaign ? (
                                                                <Link
                                                                    href={route('campaigns.show', assignment.campaign.id)}
                                                                    className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                                                                >
                                                                    {assignment.campaign.name}
                                                                </Link>
                                                            ) : (
                                                                <Text size="sm" c="dimmed">—</Text>
                                                            )}
                                                        </Table.Td>
                                                        <Table.Td>
                                                            <Text size="sm" fw={500}>{getRiderFullName(assignment.rider)}</Text>
                                                            <Text size="xs" c="dimmed">{assignment.rider?.user?.email ?? '—'}</Text>
                                                        </Table.Td>
                                                        <Table.Td><Text size="sm">{formatDateShort(assignment.assigned_at)}</Text></Table.Td>
                                                        <Table.Td><Text size="sm">{formatDateShort(assignment.completed_at)}</Text></Table.Td>
                                                        <Table.Td>
                                                            <Badge size="sm" color={getAssignmentStatusColor(assignment.status)} variant="light">
                                                                {assignment.status}
                                                            </Badge>
                                                        </Table.Td>
                                                    </Table.Tr>
                                                ))}
                                            </Table.Tbody>
                                        </Table>
                                    ) : (
                                        <Paper p="xl" withBorder radius="sm" className="text-center">
                                            <ClockIcon size={36} className="mx-auto text-gray-300 mb-2" />
                                            <Text size="sm" c="dimmed">No assignment history found.</Text>
                                        </Paper>
                                    )}
                                </Stack>
                            </Card>

                        </Stack>
                    </Grid.Col>
                </Grid>
            </div>
        </AuthenticatedLayout>
    );
}
