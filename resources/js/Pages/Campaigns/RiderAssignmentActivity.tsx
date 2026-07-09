import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import {
    Card,
    Text,
    Badge,
    Button,
    Group,
    Paper,
    Table,
    Timeline,
} from '@mantine/core';
import {
    ArrowLeft,
    User,
    Mail,
    Phone,
    Calendar,
    CheckCircle,
    MapPin,
    Clock,
    AlertTriangle,
    Banknote,
} from 'lucide-react';

interface EarningsDay {
    date: string;
    worked_hours: number;
    payable_hours: number;
    daily_earning: number;
    max_possible_earning: number;
    qualified: boolean;
    settled: boolean;
}

interface CheckIn {
    id: number;
    date: string;
    check_in_time: string | null;
    check_out_time: string | null;
    status: 'started' | 'paused' | 'resumed' | 'ended';
    end_reason: string | null;
    worked_hours: number;
    daily_earning: number;
}

interface ActivityEvent {
    type: string;
    title: string;
    description: string;
    timestamp: string;
    time_human: string;
}

interface PageProps {
    campaign: {
        id: number;
        name: string;
        start_date: string;
        end_date: string;
        status: string;
    };
    assignment: {
        id: number;
        status: string;
        assigned_at: string;
        completed_at: string | null;
        helmet_code: string | null;
    };
    rider: {
        id: number;
        name: string;
        email: string;
        phone: string;
        daily_rate: string;
    };
    earnings: {
        days_worked: number;
        total_hours_worked: number;
        total_earning: number;
        total_owed: number;
        total_settled: number;
        days: EarningsDay[];
    };
    checkIns: CheckIn[];
    activityTimeline: ActivityEvent[];
}

const ACTIVITY_ICONS: Record<string, { icon: typeof User; color: string }> = {
    campaign_assigned: { icon: MapPin, color: 'blue' },
    campaign_assignment_completed: { icon: CheckCircle, color: 'teal' },
    shift_started: { icon: Clock, color: 'green' },
    shift_ended: { icon: CheckCircle, color: 'gray' },
    shift_auto_closed: { icon: AlertTriangle, color: 'orange' },
};

const CHECK_IN_STATUS_COLOR: Record<CheckIn['status'], string> = {
    started: 'green',
    resumed: 'green',
    paused: 'yellow',
    ended: 'gray',
};

export default function RiderAssignmentActivity({ campaign, assignment, rider, earnings, checkIns, activityTimeline }: PageProps) {
    const formatDate = (date: string) => new Date(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center gap-4">
                    <Button
                        variant="subtle"
                        leftSection={<ArrowLeft size={16} />}
                        component={Link}
                        href={route('campaigns.show', campaign.id)}
                    >
                        Back to Campaign
                    </Button>
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                            {rider.name} — {campaign.name}
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            This rider's activity, earnings, and check-ins for this campaign only
                        </p>
                    </div>
                </div>
            }
        >
            <Head title={`${rider.name} · ${campaign.name} Activity`} />

            <div className="space-y-6">
                {/* Rider + assignment info */}
                <Card withBorder radius="md" p="lg">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <Text size="lg" fw={700}>{rider.name}</Text>
                                <Badge color={assignment.status === 'active' ? 'green' : assignment.status === 'completed' ? 'blue' : 'gray'} variant="light">
                                    {assignment.status}
                                </Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-400">
                                <span className="flex items-center gap-1"><Mail size={14} /> {rider.email}</span>
                                <span className="flex items-center gap-1"><Phone size={14} /> {rider.phone}</span>
                                <span className="flex items-center gap-1"><Calendar size={14} /> Assigned {formatDate(assignment.assigned_at)}</span>
                                {assignment.helmet_code && <Badge variant="outline">{assignment.helmet_code}</Badge>}
                            </div>
                        </div>
                        <Group gap="xl">
                            <Paper p="sm" className="text-center bg-green-50 dark:bg-green-900/20">
                                <Text size="xs" c="dimmed" mb={4}>Earned (this campaign)</Text>
                                <Text size="lg" fw={700} c="green">KSh {earnings.total_earning.toFixed(2)}</Text>
                            </Paper>
                            <Paper p="sm" className="text-center bg-gray-50 dark:bg-gray-800">
                                <Text size="xs" c="dimmed" mb={4}>Hours Worked</Text>
                                <Text size="lg" fw={700}>{earnings.total_hours_worked.toFixed(2)}h</Text>
                            </Paper>
                            {earnings.total_owed > 0 && (
                                <Paper p="sm" className="text-center bg-amber-50 dark:bg-amber-900/20">
                                    <Text size="xs" c="dimmed" mb={4}>Owed</Text>
                                    <Text size="lg" fw={700} c="orange">KSh {earnings.total_owed.toFixed(2)}</Text>
                                </Paper>
                            )}
                        </Group>
                    </div>
                </Card>

                {/* Earnings breakdown */}
                <Card withBorder radius="md" p="lg">
                    <Group gap="xs" mb="md">
                        <Banknote size={18} className="text-gray-500" />
                        <Text fw={600} size="lg">Earnings for {campaign.name}</Text>
                    </Group>
                    {earnings.days.length > 0 ? (
                        <div style={{ maxHeight: 420, overflowY: 'auto' }}>
                        <Table.ScrollContainer minWidth={500}>
                            <Table verticalSpacing="sm" stickyHeader>
                                <Table.Thead>
                                    <Table.Tr>
                                        <Table.Th>Date</Table.Th>
                                        <Table.Th ta="right">Hours Worked</Table.Th>
                                        <Table.Th ta="right">Amount Awarded</Table.Th>
                                        <Table.Th ta="right">Status</Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {earnings.days.map((day) => (
                                        <Table.Tr key={day.date}>
                                            <Table.Td>{formatDate(day.date)}</Table.Td>
                                            <Table.Td ta="right">{day.worked_hours.toFixed(2)}h</Table.Td>
                                            <Table.Td ta="right">
                                                <Text span c="dimmed">KSh </Text>
                                                <Text span fw={600} c="green">{day.daily_earning.toFixed(2)}</Text>
                                                <Text span c="dimmed"> / {day.max_possible_earning.toFixed(2)}</Text>
                                            </Table.Td>
                                            <Table.Td ta="right">
                                                <Badge size="sm" color={!day.qualified ? 'gray' : day.settled ? 'blue' : 'yellow'} variant="light">
                                                    {!day.qualified ? 'Below minimum' : day.settled ? 'Settled' : 'Pending'}
                                                </Badge>
                                            </Table.Td>
                                        </Table.Tr>
                                    ))}
                                </Table.Tbody>
                                <Table.Tfoot>
                                    <Table.Tr>
                                        <Table.Th>Total</Table.Th>
                                        <Table.Th ta="right">{earnings.total_hours_worked.toFixed(2)}h</Table.Th>
                                        <Table.Th ta="right">
                                            <Text span c="dimmed" fw={400}>KSh </Text>
                                            <Text span c="green">{earnings.total_earning.toFixed(2)}</Text>
                                        </Table.Th>
                                        <Table.Th ta="right">
                                            {earnings.total_owed > 0 ? `KSh ${earnings.total_owed.toFixed(2)} owed` : 'All settled'}
                                        </Table.Th>
                                    </Table.Tr>
                                </Table.Tfoot>
                            </Table>
                        </Table.ScrollContainer>
                        </div>
                    ) : (
                        <Text c="dimmed" ta="center" py="xl" size="sm">No completed shifts for this campaign yet.</Text>
                    )}
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Check-ins */}
                    <Card withBorder radius="md" p="lg">
                        <Text fw={600} size="lg" mb="md">Check-ins</Text>
                        {checkIns.length > 0 ? (
                            <div style={{ maxHeight: 420, overflowY: 'auto' }}>
                            <Table.ScrollContainer minWidth={400}>
                                <Table verticalSpacing="sm" stickyHeader>
                                    <Table.Thead>
                                        <Table.Tr>
                                            <Table.Th>Date</Table.Th>
                                            <Table.Th>In / Out</Table.Th>
                                            <Table.Th>Status</Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {checkIns.map((c) => (
                                            <Table.Tr key={c.id}>
                                                <Table.Td>{formatDate(c.date)}</Table.Td>
                                                <Table.Td>
                                                    <Text size="sm">{c.check_in_time ?? '—'} → {c.check_out_time ?? '—'}</Text>
                                                </Table.Td>
                                                <Table.Td>
                                                    <Badge size="sm" color={CHECK_IN_STATUS_COLOR[c.status]} variant="light">
                                                        {c.status === 'ended' && c.end_reason === 'auto_closed' ? 'Auto-closed' : c.status}
                                                    </Badge>
                                                </Table.Td>
                                            </Table.Tr>
                                        ))}
                                    </Table.Tbody>
                                </Table>
                            </Table.ScrollContainer>
                            </div>
                        ) : (
                            <Text c="dimmed" ta="center" py="xl" size="sm">No check-ins recorded yet.</Text>
                        )}
                    </Card>

                    {/* Activity timeline */}
                    <Card withBorder radius="md" p="lg">
                        <Text fw={600} size="lg" mb="md">Activity</Text>
                        {activityTimeline.length > 0 ? (
                            <div style={{ maxHeight: 420, overflowY: 'auto' }} className="pr-2">
                                <Timeline active={activityTimeline.length} bulletSize={22} lineWidth={2}>
                                    {activityTimeline.map((event, index) => {
                                        const { icon: Icon, color } = ACTIVITY_ICONS[event.type] ?? { icon: Clock, color: 'gray' };
                                        return (
                                            <Timeline.Item
                                                key={`${event.type}-${event.timestamp}-${index}`}
                                                bullet={<Icon size={12} />}
                                                title={event.title}
                                                color={color}
                                            >
                                                <Text c="dimmed" size="sm">{event.description}</Text>
                                                <Text size="xs" mt={4} c="dimmed">{event.time_human}</Text>
                                            </Timeline.Item>
                                        );
                                    })}
                                </Timeline>
                            </div>
                        ) : (
                            <Text c="dimmed" ta="center" py="xl" size="sm">No activity recorded yet.</Text>
                        )}
                    </Card>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
