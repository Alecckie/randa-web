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
    QrCodeIcon,
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
} from 'lucide-react';

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

    // ── Helpers ───────────────────────────────────────────────────────────────

    const getStatusColor = (status: string): string => {
        const colors: Record<string, string> = {
            available:   'green',
            assigned:    'blue',
            maintenance: 'yellow',
            retired:     'red',
            active:      'blue',
            completed:   'green',
            cancelled:   'red',
            pending:     'yellow',
            approved:    'green',
            rejected:    'red',
        };
        return colors[status] || 'gray';
    };

    const getStatusIcon = (status: Helmet['status']): React.ReactNode => {
        const icons: Record<Helmet['status'], React.ReactNode> = {
            available:   <CheckCircleIcon size={16} />,
            assigned:    <HardHat size={16} />,
            maintenance: <WrenchIcon size={16} />,
            retired:     <XCircleIcon size={16} />,
        };
        return icons[status] ?? null;
    };

    /**
     * Prefer first_name + last_name when populated; fall back to `name`.
     * Returns '—' if the rider or user relation is missing.
     */
    const getRiderFullName = (rider?: Rider | null): string => {
        if (!rider?.user) return '—';
        const { first_name, last_name, name } = rider.user;
        if (first_name || last_name) {
            return [first_name, last_name].filter(Boolean).join(' ');
        }
        return name || '—';
    };

    const formatDate = (date: string | null | undefined): string => {
        if (!date) return '—';
        const parsed = new Date(date);
        if (isNaN(parsed.getTime())) return '—';
        return parsed.toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric',
        });
    };

    const formatDateShort = (date: string | null | undefined): string => {
        if (!date) return '—';
        const parsed = new Date(date);
        if (isNaN(parsed.getTime())) return '—';
        return parsed.toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
        });
    };

    const handleDelete = () => {
        if (confirm('Are you sure you want to delete this helmet? This action cannot be undone.')) {
            router.delete(route('helmets.destroy', helmet.id));
        }
    };

    // ── Derived state ─────────────────────────────────────────────────────────

    const assignments    = helmet.assignments ?? [];
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
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                Helmet Details & Assignment History
                            </p>
                        </div>
                    </div>

                    <Group>
                        <Badge
                            size="lg"
                            color={getStatusColor(helmet.status)}
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
                    <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                        <Paper shadow="sm" p="md" className="bg-white dark:bg-gray-800">
                            <Group justify="apart">
                                <div>
                                    <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Total Assignments</Text>
                                    <Text size="xl" fw={700}>{totalAssignments}</Text>
                                </div>
                                <ClockIcon size={32} className="text-blue-500" />
                            </Group>
                        </Paper>
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                        <Paper shadow="sm" p="md" className="bg-white dark:bg-gray-800">
                            <Group justify="apart">
                                <div>
                                    <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Completed</Text>
                                    <Text size="xl" fw={700} c="green">{completedCount}</Text>
                                </div>
                                <CheckCircleIcon size={32} className="text-green-500" />
                            </Group>
                        </Paper>
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                        <Paper shadow="sm" p="md" className="bg-white dark:bg-gray-800">
                            <Group justify="apart">
                                <div>
                                    <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Cancelled</Text>
                                    <Text size="xl" fw={700} c="red">{cancelledCount}</Text>
                                </div>
                                <XCircleIcon size={32} className="text-red-500" />
                            </Group>
                        </Paper>
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                        <Paper shadow="sm" p="md" className="bg-white dark:bg-gray-800">
                            <Group justify="apart">
                                <div>
                                    <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Status</Text>
                                    <Text size="xl" fw={700} tt="capitalize">{helmet.status}</Text>
                                </div>
                                <HardHat size={32} className="text-purple-500" />
                            </Group>
                        </Paper>
                    </Grid.Col>
                </Grid>

                {/* ── Main content ── */}
                <Grid gutter="md">

                    {/* Left column */}
                    <Grid.Col span={{ base: 12, md: 5 }}>
                        <Stack gap="md">

                            {/* Helmet Details */}
                            <Card withBorder shadow="sm" radius="md" p="lg" className="bg-white dark:bg-gray-800">
                                <Stack gap="md">
                                    <Group>
                                        <HardHat size={20} className="text-blue-500" />
                                        <Text size="md" fw={700}>Helmet Details</Text>
                                    </Group>
                                    <Divider />
                                    <Stack gap="sm">
                                        <Group justify="apart">
                                            <Text size="sm" c="dimmed">Helmet Code</Text>
                                            <Text size="sm" fw={600} className="font-mono">{helmet.helmet_code}</Text>
                                        </Group>
                                        <Group justify="apart">
                                            <Text size="sm" c="dimmed">Status</Text>
                                            <Badge
                                                color={getStatusColor(helmet.status)}
                                                variant="light"
                                                leftSection={getStatusIcon(helmet.status)}
                                            >
                                                {helmet.status.charAt(0).toUpperCase() + helmet.status.slice(1)}
                                            </Badge>
                                        </Group>
                                        <Group justify="apart">
                                            <Text size="sm" c="dimmed">Current Branding</Text>
                                            <Text size="sm" fw={500}>{helmet.current_branding || '—'}</Text>
                                        </Group>
                                        <Group justify="apart">
                                            <Text size="sm" c="dimmed">Created</Text>
                                            <Text size="sm">{formatDate(helmet.created_at)}</Text>
                                        </Group>
                                        <Group justify="apart">
                                            <Text size="sm" c="dimmed">Last Updated</Text>
                                            <Text size="sm">{formatDate(helmet.updated_at)}</Text>
                                        </Group>
                                    </Stack>
                                </Stack>
                            </Card>

                            {/* QR Code */}
                            <Card withBorder shadow="sm" radius="md" p="lg" className="bg-white dark:bg-gray-800">
                                <Stack gap="md">
                                    <Group>
                                        <QrCodeIcon size={20} className="text-green-500" />
                                        <Text size="md" fw={700}>QR Code</Text>
                                    </Group>
                                    <Divider />
                                    {helmet.qr_code ? (
                                        <Paper p="md" className="bg-gray-50 dark:bg-gray-900" radius="sm">
                                            <Stack align="center" gap="sm">
                                                <QrCodeIcon size={48} className="text-gray-400" />
                                                <Text size="xs" className="font-mono text-gray-600 dark:text-gray-400 break-all text-center">
                                                    {helmet.qr_code}
                                                </Text>
                                            </Stack>
                                        </Paper>
                                    ) : (
                                        <Text size="sm" c="dimmed" ta="center" py="md">
                                            No QR code generated for this helmet.
                                        </Text>
                                    )}
                                </Stack>
                            </Card>

                            {/* Quick Actions */}
                            <Card withBorder shadow="sm" radius="md" p="lg" className="bg-white dark:bg-gray-800">
                                <Stack gap="md">
                                    <Text size="md" fw={700}>Quick Actions</Text>
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
                            <Card withBorder shadow="sm" radius="md" p="lg" className="bg-white dark:bg-gray-800">
                                <Stack gap="md">
                                    <Group>
                                        <MegaphoneIcon size={20} className="text-purple-500" />
                                        <Text size="md" fw={700}>Current Assignment</Text>
                                    </Group>
                                    <Divider />

                                    {helmet.current_assignment ? (
                                        <Paper p="md" withBorder radius="sm">
                                            <Stack gap="sm">

                                                {/* Campaign row */}
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

                                                {/* Rider row */}
                                                <Group justify="apart" align="flex-start">
                                                    <Group gap="xs">
                                                        <UserIcon size={14} className="text-gray-400" />
                                                        <Text size="sm" c="dimmed">Rider</Text>
                                                    </Group>
                                                    <div className="text-right">
                                                        <Text size="sm" fw={500}>
                                                            {getRiderFullName(helmet.current_assignment.rider)}
                                                        </Text>
                                                        <Text size="xs" c="dimmed">
                                                            {helmet.current_assignment.rider?.user?.email ?? '—'}
                                                        </Text>
                                                        {helmet.current_assignment.rider?.user?.phone && (
                                                            <Text size="xs" c="dimmed">
                                                                {helmet.current_assignment.rider.user.phone}
                                                            </Text>
                                                        )}
                                                        {helmet.current_assignment.rider?.national_id && (
                                                            <Text size="xs" c="dimmed" className="font-mono">
                                                                ID: {helmet.current_assignment.rider.national_id}
                                                            </Text>
                                                        )}
                                                    </div>
                                                </Group>

                                                {/* Assigned date row */}
                                                <Group justify="apart">
                                                    <Group gap="xs">
                                                        <CalendarIcon size={14} className="text-gray-400" />
                                                        <Text size="sm" c="dimmed">Assigned On</Text>
                                                    </Group>
                                                    <Text size="sm">
                                                        {formatDate(helmet.current_assignment.assigned_at)}
                                                    </Text>
                                                </Group>

                                                {/* Campaign status row */}
                                                <Group justify="apart">
                                                    <Text size="sm" c="dimmed">Campaign Status</Text>
                                                    {helmet.current_assignment.campaign ? (
                                                        <Badge
                                                            size="sm"
                                                            color={getStatusColor(helmet.current_assignment.campaign.status)}
                                                            variant="light"
                                                        >
                                                            {helmet.current_assignment.campaign.status
                                                                .replace('_', ' ')
                                                                .toUpperCase()}
                                                        </Badge>
                                                    ) : (
                                                        <Text size="sm" c="dimmed">—</Text>
                                                    )}
                                                </Group>

                                            </Stack>
                                        </Paper>
                                    ) : (
                                        <Paper p="xl" className="text-center bg-gray-50 dark:bg-gray-900" radius="sm">
                                            <HardHat size={40} className="mx-auto text-gray-300 mb-3" />
                                            <Text size="sm" c="dimmed">
                                                This helmet is not currently assigned to any campaign.
                                            </Text>
                                        </Paper>
                                    )}
                                </Stack>
                            </Card>

                            {/* Assignment History */}
                            <Card withBorder shadow="sm" radius="md" p="lg" className="bg-white dark:bg-gray-800">
                                <Stack gap="md">
                                    <Group>
                                        <ClockIcon size={20} className="text-orange-500" />
                                        <Text size="md" fw={700}>Assignment History</Text>
                                        <Badge variant="light" size="sm">{totalAssignments} total</Badge>
                                    </Group>
                                    <Divider />

                                    {assignments.length > 0 ? (
                                        <Table highlightOnHover>
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

                                                        {/* Campaign */}
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

                                                        {/* Rider */}
                                                        <Table.Td>
                                                            <Text size="sm" fw={500}>
                                                                {getRiderFullName(assignment.rider)}
                                                            </Text>
                                                            <Text size="xs" c="dimmed">
                                                                {assignment.rider?.user?.email ?? '—'}
                                                            </Text>
                                                            {assignment.rider?.user?.phone && (
                                                                <Text size="xs" c="dimmed">
                                                                    {assignment.rider.user.phone}
                                                                </Text>
                                                            )}
                                                            {assignment.rider?.national_id && (
                                                                <Text size="xs" c="dimmed" className="font-mono">
                                                                    ID: {assignment.rider.national_id}
                                                                </Text>
                                                            )}
                                                        </Table.Td>

                                                        {/* Dates */}
                                                        <Table.Td>
                                                            <Text size="sm">{formatDateShort(assignment.assigned_at)}</Text>
                                                        </Table.Td>
                                                        <Table.Td>
                                                            <Text size="sm">{formatDateShort(assignment.completed_at)}</Text>
                                                        </Table.Td>

                                                        {/* Status */}
                                                        <Table.Td>
                                                            <Badge
                                                                size="sm"
                                                                color={getStatusColor(assignment.status)}
                                                                variant="light"
                                                            >
                                                                {assignment.status}
                                                            </Badge>
                                                        </Table.Td>

                                                    </Table.Tr>
                                                ))}
                                            </Table.Tbody>
                                        </Table>
                                    ) : (
                                        <Paper p="xl" className="text-center bg-gray-50 dark:bg-gray-900" radius="sm">
                                            <ClockIcon size={40} className="mx-auto text-gray-300 mb-3" />
                                            <Text size="sm" c="dimmed">
                                                No assignment history found for this helmet.
                                            </Text>
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