import { lazy, Suspense, useState } from 'react';
import { formatCurrency, formatDate } from '@/utils/formatting';
import { getCampaignStatusColor, getPaymentStatusColor } from '@/utils/status';
import { calculateProgress, calculateBalance } from '@/utils/calculations';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    Button,
    Badge,
    Card,
    Group,
    Text,
    Stack,
    Tabs,
    Timeline,
    Progress,
    Table,
    Modal,
    Select,
    NumberInput,
    TextInput,
    Textarea,
    ActionIcon,
    Menu,
    Divider,
    Grid,
    Paper,
    Tooltip,
    Alert
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
    ArrowLeftIcon,
    CalendarIcon,
    MapPinIcon,
    UsersIcon,
    BanknoteIcon,
    FileTextIcon,
    TrendingUpIcon,
    TrendingDownIcon,
    ClockIcon,
    CheckCircleIcon,
    XCircleIcon,
    PauseCircleIcon,
    PlayCircleIcon,
    EditIcon,
    MoreVerticalIcon,
    UserPlusIcon,
    DownloadIcon,
    AlertCircleIcon,
    InfoIcon,
    BikeIcon,
    TargetIcon,
    BarChart2Icon,
    Banknote,
    RefreshCwIcon,
    Map as MapIcon,
    ActivityIcon,
} from 'lucide-react';
import type { Campaign } from '@/types/campaign';
import StatusUpdateModal from '@/Components/campaigns/StatusUpdateModal';
import type { HeatmapPeriod } from '@/Components/tracking/LiveHeatmap';

const LiveHeatmap = lazy(() => import('@/Components/tracking/LiveHeatmap'));

interface PerRiderPayout {
    rider_id: number;
    rider_name: string;
    total_earning: number;
    days_worked: number;
}

interface DailyBreakdown {
    date: string;
    daily_rider_cost: number;
    riders_active: number;
    cumulative_rider_cost: number;
    cumulative_profit: number;
}

interface PaymentAnalysis {
    total_revenue: number;
    total_rider_payouts: number;
    company_profit: number;
    per_rider: PerRiderPayout[];
    daily_breakdown: DailyBreakdown[];
}

interface CampaignShowProps {
    campaign: Campaign & {
        advertiser: {
            id: number;
            company_name: string;
            user: {
                id: number;
                name: string;
                email: string;
            };
        };
        coverage_areas: Array<{
            id: number;
            name: string;
            full_name: string;
        }>;
        rider_demographics: Array<{
            id: number;
            age_group: string;
            gender: string;
            rider_type: string;
        }>;
        current_cost: {
            id: number;
            helmet_count: number;
            duration_days: number;
            helmet_daily_rate: number;
            base_cost: number;
            includes_design: boolean;
            design_cost: number;
            subtotal: number;
            vat_rate: number;
            vat_amount: number;
            total_cost: number;
            status: string;
        } | null;
        assignments: Array<{
            id: number;
            rider_id: number;
            helmet_id: number;
            assigned_at: string;
            completed_at: string | null;
            status: string;
            rider: {
                id: number;
                user: {
                    id: number;
                    name: string;
                    email: string;
                };
            };
            helmet: {
                id: number;
                helmet_code: string;
            };
        }>;
        payments?: Array<{
            id: number;
            amount: number;
            payment_method: string;
            mpesa_receipt_number: string | null;
            status: string;
            created_at: string;
        }>;
        duration_days: number;
        payment_status: string;
        total_paid_amount: number;
    };
    availableRiders?: Array<{
        id: number;
        user: {
            id: number;
            name: string;
            email: string;
        };
        national_id: string;
        status: string;
    }>;
    availableHelmets?: Array<{
        id: number;
        helmet_code: string;
        status: string;
    }>;
    paymentAnalysis?: PaymentAnalysis | null;
    isAdmin?: boolean;
}

export default function Show({ campaign, availableRiders = [], availableHelmets = [], paymentAnalysis, isAdmin = false }: CampaignShowProps) {
    const [assignModalOpened, { open: openAssignModal, close: closeAssignModal }] = useDisclosure(false);
    const [autoAssignModalOpened, { open: openAutoAssignModal, close: closeAutoAssignModal }] = useDisclosure(false);
    const [manualPaymentOpened, { open: openManualPayment, close: closeManualPayment }] = useDisclosure(false);
    const [statusModalOpened, { open: openStatusModal, close: closeStatusModal }] = useDisclosure(false);
    const [selectedRider, setSelectedRider] = useState<string>('');
    const [selectedHelmet, setSelectedHelmet] = useState<string>('');
    const [assignmentCount, setAssignmentCount] = useState(1);
    const [autoAssignCount, setAutoAssignCount] = useState(1);
    const [autoAssigning, setAutoAssigning] = useState(false);
    const [manualAmount, setManualAmount] = useState<number | string>(campaign.current_cost?.total_cost || 0);
    const [manualMethod, setManualMethod] = useState<string>('cash');
    const [manualReceipt, setManualReceipt] = useState('');
    const [manualNotes, setManualNotes] = useState('');
    const [savingManual, setSavingManual] = useState(false);

    const getStatusColor = getCampaignStatusColor;
    const pendingPayments = campaign.payments?.filter(p => p.status === 'pending_verification') ?? [];
    const [heatmapVisited, setHeatmapVisited] = useState(false);
    const [heatmapPeriod, setHeatmapPeriod] = useState<HeatmapPeriod>('7days');
    const activeAssignments = campaign.assignments?.filter(a => a.status === 'active') ?? [];
    const historyAssignments = campaign.assignments?.filter(a => a.status !== 'active') ?? [];
    const activeAssignmentCount = activeAssignments.length;
    const hasAssignedRiders = activeAssignmentCount > 0;

    const { errors } = usePage().props as any;

    const handleCompleteAssignment = (assignmentId: number) => {
        router.patch(route('campaigns.complete-assignment', { campaign: campaign.id, assignment: assignmentId }), {}, {
            preserveScroll: true,
        });
    };

    const handleRemoveAssignment = (assignmentId: number) => {
        if (!confirm('Are you sure you want to remove this rider assignment?')) return;

        router.delete(route('campaigns.remove-assignment', { campaign: campaign.id, assignment: assignmentId }), {
            preserveScroll: true,
        });
    };

    const handleRevokeAllHelmets = () => {
        const activeCount = campaign.assignments?.filter(a => a.status === 'active').length ?? 0;
        if (!confirm(`This will revoke all ${activeCount} active helmet(s) and return them to the available pool so they can be assigned to new campaigns. Continue?`)) return;
        router.post(route('campaigns.revoke-helmets', campaign.id), {}, { preserveScroll: true });
    };

    const handleUpdateStatus = (status: string, confirmMessage: string) => {
        if (!confirm(confirmMessage)) return;
        router.put(route('campaigns.update-status', campaign.id), { status }, { preserveScroll: true });
    };

    const handleActivateCampaign = () =>
        handleUpdateStatus('active', 'Activate this campaign now? Riders will be able to check in and start earning.');

    const handlePauseCampaign = () =>
        handleUpdateStatus('paused', 'Pause this campaign? Riders will stop earning until it is resumed.');

    const handleResumeCampaign = () =>
        handleUpdateStatus('active', 'Resume this campaign?');

    const handleCloseCampaign = () => {
        handleUpdateStatus('completed', 'Complete this campaign? All assigned helmets will automatically be returned to the available pool and riders will be notified to drop them off. This cannot be undone.');
    };

    const handleApprovePayment = (paymentId: number) => {
        if (!confirm('Approve this payment? The campaign will be marked as paid.')) return;
        router.patch(route('payments.approve', paymentId), {}, { preserveScroll: true });
    };

    const handleRejectPayment = (paymentId: number) => {
        const reason = prompt('Reason for rejecting this payment:');
        if (!reason) return;
        router.patch(route('payments.reject', paymentId), { reason }, { preserveScroll: true });
    };


    const handleAssignRider = () => {
        if (!selectedRider || !selectedHelmet) return;

        router.post(route('campaigns.assign-rider', campaign.id), {
            rider_id: selectedRider,
            helmet_id: selectedHelmet,
            count: assignmentCount,
        }, {
            onSuccess: () => {
                closeAssignModal();
                setSelectedRider('');
                setSelectedHelmet('');
                setAssignmentCount(1);
            },
        });
    };

    const calculateCampaignProgress = () => {
        const assigned = campaign.assignments?.filter(a => a.status === 'active').length || 0;
        return calculateProgress(assigned, campaign.helmet_count);
    };

    const remainingSlots = campaign.helmet_count - activeAssignmentCount;
    const maxAutoAssign = Math.max(0, Math.min(remainingSlots, availableRiders.length, availableHelmets.length));

    const handleAutoAssign = () => {
        if (autoAssignCount < 1) return;
        setAutoAssigning(true);

        router.post(route('campaigns.auto-assign', campaign.id), {
            count: autoAssignCount,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                closeAutoAssignModal();
                setAutoAssignCount(1);
            },
            onFinish: () => setAutoAssigning(false),
        });
    };

    const handleManualPayment = () => {
        if (!manualAmount || Number(manualAmount) <= 0) return;
        setSavingManual(true);
        router.post(route('payments.record-manual'), {
            campaign_id:    campaign.id,
            advertiser_id:  campaign.advertiser.id,
            amount:         manualAmount,
            payment_method: manualMethod,
            receipt_number: manualReceipt || null,
            notes:          manualNotes || null,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                closeManualPayment();
                setManualReceipt('');
                setManualNotes('');
                setSavingManual(false);
            },
            onError: () => setSavingManual(false),
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Button
                            component={Link}
                            href={route('campaigns.index')}
                            variant="subtle"
                            leftSection={<ArrowLeftIcon size={16} />}
                        >
                            Back
                        </Button>
                        <div>
                            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                                {campaign.name}
                            </h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {campaign.campaign_number && <span className="font-semibold text-gray-700 dark:text-gray-300">{campaign.campaign_number} &middot; </span>}
                                Campaign Details & Management
                            </p>
                        </div>
                    </div>
                    <Group>
                        {campaign.status === 'submitted' && campaign.payment_status === 'paid' && hasAssignedRiders && (
                            <Button
                                size="md"
                                color="green"
                                leftSection={<PlayCircleIcon size={18} />}
                                onClick={handleActivateCampaign}
                                fw={700}
                            >
                                Activate Campaign Now
                            </Button>
                        )}
                        <Badge
                            size="lg"
                            color={getStatusColor(campaign.status)}
                            variant="light"
                        >
                            {campaign.status.toUpperCase().replace('_', ' ')}
                        </Badge>
                        <Menu shadow="md" width={200}>
                            <Menu.Target>
                                <ActionIcon variant="subtle" size="lg">
                                    <MoreVerticalIcon size={20} />
                                </ActionIcon>
                            </Menu.Target>
                            <Menu.Dropdown>
                                <Menu.Item
                                    leftSection={<EditIcon size={14} />}
                                    component={Link}
                                    href={route('campaigns.edit', campaign.id)}
                                >
                                    Edit Campaign
                                </Menu.Item>
                                <Menu.Item
                                    leftSection={<DownloadIcon size={14} />}
                                >
                                    Download Report
                                </Menu.Item>
                                {campaign.status === 'active' && (
                                    <Menu.Item
                                        leftSection={<PauseCircleIcon size={14} />}
                                        color="orange"
                                        onClick={handlePauseCampaign}
                                    >
                                        Pause Campaign
                                    </Menu.Item>
                                )}
                                {campaign.status === 'paused' && (
                                    <Menu.Item
                                        leftSection={<PlayCircleIcon size={14} />}
                                        color="green"
                                        onClick={handleResumeCampaign}
                                    >
                                        Resume Campaign
                                    </Menu.Item>
                                )}
                                {campaign.status === 'active' && (
                                    <Menu.Item
                                        leftSection={<XCircleIcon size={14} />}
                                        color="red"
                                        onClick={handleCloseCampaign}
                                    >
                                        Complete Campaign
                                    </Menu.Item>
                                )}
                                {!['completed', 'cancelled'].includes(campaign.status) && (
                                    <Menu.Item
                                        leftSection={<RefreshCwIcon size={14} />}
                                        onClick={openStatusModal}
                                    >
                                        Update Status…
                                    </Menu.Item>
                                )}
                            </Menu.Dropdown>
                        </Menu>
                    </Group>
                </div>
            }
        >
            <Head title={`Campaign: ${campaign.name}`} />

            <div className="space-y-6">
                {/* Alert for pending actions */}
                {pendingPayments.length > 0 ? (
                    <Alert icon={<AlertCircleIcon size={16} />} title={`Payment${pendingPayments.length > 1 ? 's' : ''} Submitted — Awaiting Your Approval`} color="yellow">
                        <Stack gap="md">
                            {pendingPayments.map((payment) => (
                                <Stack gap="sm" key={payment.id}>
                                    <Text size="sm">
                                        The advertiser submitted a receipt for <strong>{formatCurrency(payment.amount)}</strong> — M-Pesa code: <strong>{payment.mpesa_receipt_number || 'no receipt code'}</strong>.
                                        The campaign will only be marked paid — and riders can only be assigned — once you approve it.
                                    </Text>
                                    <Group gap="xs">
                                        <Button size="sm" color="green" onClick={() => handleApprovePayment(payment.id)}>
                                            Approve Payment
                                        </Button>
                                        <Button size="sm" color="red" variant="light" onClick={() => handleRejectPayment(payment.id)}>
                                            Reject Payment
                                        </Button>
                                    </Group>
                                    {pendingPayments.length > 1 && payment.id !== pendingPayments[pendingPayments.length - 1].id && <Divider />}
                                </Stack>
                            ))}
                        </Stack>
                    </Alert>
                ) : campaign.status === 'submitted' && campaign.payment_status === 'rejected' ? (
                    <Alert icon={<AlertCircleIcon size={16} />} title="Payment Rejected" color="red">
                        The advertiser's last payment submission was rejected. They've been notified and can resubmit.
                    </Alert>
                ) : campaign.status === 'submitted' && campaign.payment_status !== 'paid' && (
                    <Alert icon={<AlertCircleIcon size={16} />} title="Payment Required" color="yellow">
                        This campaign is awaiting payment. Please complete the payment to activate the campaign.
                    </Alert>
                )}

                {campaign.status === 'submitted' && campaign.payment_status === 'paid' && (
                    hasAssignedRiders ? (
                        <Alert
                            icon={<AlertCircleIcon size={20} />}
                            title="Don't Forget — This Campaign Is Ready to Go Live!"
                            color="green"
                            variant="filled"
                            radius="md"
                        >
                            <Stack gap="sm">
                                <Text size="sm">
                                    Payment is confirmed and {activeAssignmentCount} rider{activeAssignmentCount === 1 ? '' : 's'} {activeAssignmentCount === 1 ? 'is' : 'are'} assigned,
                                    but the campaign is still sitting in <strong>Submitted</strong>. Riders can't earn or check in until you activate it.
                                </Text>
                                <Group>
                                    <Button
                                        size="md"
                                        color="white"
                                        variant="white"
                                        c="green.8"
                                        leftSection={<PlayCircleIcon size={18} />}
                                        onClick={handleActivateCampaign}
                                        fw={700}
                                    >
                                        Activate Campaign Now
                                    </Button>
                                </Group>
                            </Stack>
                        </Alert>
                    ) : (
                        <Alert icon={<InfoIcon size={16} />} title="Ready to Activate" color="blue">
                            Campaign is paid and ready to be activated. Assign riders to begin.
                        </Alert>
                    )
                )}

                {/* Overview Cards */}
                <Grid gutter="md">
                    <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                        <Paper shadow="sm" p="md" className="bg-white dark:bg-gray-800">
                            <Group justify="apart">
                                <div>
                                    <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                                        Duration
                                    </Text>
                                    <Text size="xl" fw={700}>
                                        {campaign.current_cost?.duration_days ?? campaign.duration_days ?? 0} Days
                                    </Text>
                                </div>
                                <CalendarIcon size={32} className="text-gray-400" />
                            </Group>
                        </Paper>
                    </Grid.Col>

                    <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                        <Paper shadow="sm" p="md" className="bg-white dark:bg-gray-800">
                            <Group justify="apart">
                                <div>
                                    <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                                        Total Helmets
                                    </Text>
                                    <Text size="xl" fw={700}>
                                        {campaign.helmet_count}
                                    </Text>
                                </div>
                                <BikeIcon size={32} className="text-gray-400" />
                            </Group>
                        </Paper>
                    </Grid.Col>

                    <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                        <Paper shadow="sm" p="md" className="bg-white dark:bg-gray-800">
                            <Group justify="apart">
                                <div>
                                    <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                                        Assigned Riders
                                    </Text>
                                    <Text size="xl" fw={700}>
                                        {campaign.assignments?.filter(a => a.status === 'active').length || 0}
                                    </Text>
                                </div>
                                <UsersIcon size={32} className="text-gray-400" />
                            </Group>
                        </Paper>
                    </Grid.Col>

                    <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                        <Paper shadow="sm" p="md" className="bg-white dark:bg-gray-800">
                            <Group justify="apart">
                                <div>
                                    <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                                        Total Cost
                                    </Text>
                                    <Text size="xl" fw={700}>
                                        {formatCurrency(campaign.current_cost?.total_cost || 0)}
                                    </Text>
                                </div>
                                <BanknoteIcon size={32} className="text-gray-400" />
                            </Group>
                        </Paper>
                    </Grid.Col>
                </Grid>

                {/* Assignment Progress */}
                <Card className="bg-white dark:bg-gray-800">
                    <Stack gap="md">
                        <Group justify="apart">
                            <div>
                                <Text size="lg" fw={700}>Rider Assignment Progress</Text>
                                <Text size="sm" c="dimmed">
                                    {campaign.assignments?.filter(a => a.status === 'active').length || 0} of {campaign.helmet_count} riders assigned
                                </Text>
                            </div>
                            {campaign.payment_status === 'paid' && (campaign.status === 'submitted' || campaign.status === 'active') && (
                                <Group gap="xs">
                                    {maxAutoAssign > 0 && (
                                        <Button
                                            variant="light"
                                            leftSection={<UsersIcon size={16} />}
                                            onClick={openAutoAssignModal}
                                        >
                                            Auto-Assign Riders
                                        </Button>
                                    )}
                                    <Button
                                        leftSection={<UserPlusIcon size={16} />}
                                        onClick={openAssignModal}
                                    >
                                        Assign Rider
                                    </Button>
                                </Group>
                            )}
                        </Group>
                        <Progress
                            value={calculateCampaignProgress()}
                            size="xl"
                            radius="xl"
                            color={calculateCampaignProgress() === 100 ? 'green' : 'blue'}
                        />
                    </Stack>
                </Card>

                {/* Tabs for detailed information */}
                <Tabs
                    defaultValue="details"
                    className="bg-white dark:bg-gray-800 rounded-lg"
                    onChange={(value) => {
                        if (value === 'heatmap') setHeatmapVisited(true);
                    }}
                >
                    <Tabs.List>
                        <Tabs.Tab value="details" leftSection={<FileTextIcon size={16} />}>
                            Campaign Details
                        </Tabs.Tab>
                        <Tabs.Tab value="assignments" leftSection={<UsersIcon size={16} />}>
                            Rider Assignments ({campaign.assignments?.length || 0})
                        </Tabs.Tab>
                        <Tabs.Tab value="financials" leftSection={<BanknoteIcon size={16} />}>
                            Financials
                        </Tabs.Tab>
                        <Tabs.Tab value="timeline" leftSection={<ClockIcon size={16} />}>
                            Timeline
                        </Tabs.Tab>
                        {isAdmin && (
                            <Tabs.Tab value="payment-analysis" leftSection={<BarChart2Icon size={16} />}>
                                Payment Analysis
                            </Tabs.Tab>
                        )}
                        {isAdmin && (
                            <Tabs.Tab value="heatmap" leftSection={<MapIcon size={16} />}>
                                Heatmap
                            </Tabs.Tab>
                        )}
                    </Tabs.List>

                    <Tabs.Panel value="details" p="md">
                        <Stack gap="lg">
                            {/* Basic Information */}
                            <div>
                                <Text size="lg" fw={700} mb="md">Basic Information</Text>
                                <Grid gutter="md">
                                    <Grid.Col span={{ base: 12, md: 6 }}>
                                        <Stack gap="xs">
                                            <Text size="sm" c="dimmed">Campaign Name</Text>
                                            <Text fw={500}>{campaign.name}</Text>
                                        </Stack>
                                    </Grid.Col>
                                    <Grid.Col span={{ base: 12, md: 6 }}>
                                        <Stack gap="xs">
                                            <Text size="sm" c="dimmed">Advertiser</Text>
                                            <Text fw={500}>{campaign.advertiser?.company_name}</Text>
                                            <Text size="xs" c="dimmed">{campaign.advertiser?.user?.email}</Text>
                                        </Stack>
                                    </Grid.Col>
                                    <Grid.Col span={12}>
                                        <Stack gap="xs">
                                            <Text size="sm" c="dimmed">Description</Text>
                                            <Text>{campaign.description || 'No description provided'}</Text>
                                        </Stack>
                                    </Grid.Col>
                                </Grid>
                            </div>

                            <Divider />

                            {/* Campaign Schedule */}
                            <div>
                                <Text size="lg" fw={700} mb="md">Campaign Schedule</Text>
                                <Grid gutter="md">
                                    <Grid.Col span={{ base: 12, sm: 6 }}>
                                        <Paper p="md" withBorder>
                                            <Group>
                                                <CalendarIcon size={20} className="text-green-500" />
                                                <div>
                                                    <Text size="xs" c="dimmed">Start Date</Text>
                                                    <Text fw={500}>{formatDate(campaign.start_date)}</Text>
                                                </div>
                                            </Group>
                                        </Paper>
                                    </Grid.Col>
                                    <Grid.Col span={{ base: 12, sm: 6 }}>
                                        <Paper p="md" withBorder>
                                            <Group>
                                                <CalendarIcon size={20} className="text-red-500" />
                                                <div>
                                                    <Text size="xs" c="dimmed">End Date</Text>
                                                    <Text fw={500}>{formatDate(campaign.end_date)}</Text>
                                                </div>
                                            </Group>
                                        </Paper>
                                    </Grid.Col>
                                </Grid>
                            </div>

                            <Divider />

                            {/* Coverage Areas */}
                            <div>
                                <Text size="lg" fw={700} mb="md">Coverage Areas</Text>
                                <div className="flex flex-wrap gap-2">
                                    {campaign.coverage_areas?.map((area) => (
                                        <Badge
                                            key={area.id}
                                            size="lg"
                                            variant="outline"
                                            leftSection={<MapPinIcon size={14} />}
                                        >
                                            {area.full_name || area.name}
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            <Divider />

                            {/* Target Demographics */}
                            <div>
                                <Text size="lg" fw={700} mb="md">Target Rider Demographics</Text>
                                <Grid gutter="md">
                                    <Grid.Col span={{ base: 12, sm: 4 }}>
                                        <Paper p="md" withBorder>
                                            <Text size="sm" c="dimmed" mb="xs">Age Groups</Text>
                                            <div className="flex flex-wrap gap-1">
                                                {[...new Set(campaign.rider_demographics?.map(d => d.age_group))].map((age, idx) => (
                                                    <Badge key={idx} variant="light" color="blue">
                                                        {age}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </Paper>
                                    </Grid.Col>
                                    <Grid.Col span={{ base: 12, sm: 4 }}>
                                        <Paper p="md" withBorder>
                                            <Text size="sm" c="dimmed" mb="xs">Gender</Text>
                                            <div className="flex flex-wrap gap-1">
                                                {[...new Set(campaign.rider_demographics?.map(d => d.gender))].map((gender, idx) => (
                                                    <Badge key={idx} variant="light" color="pink">
                                                        {gender}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </Paper>
                                    </Grid.Col>
                                    <Grid.Col span={{ base: 12, sm: 4 }}>
                                        <Paper p="md" withBorder>
                                            <Text size="sm" c="dimmed" mb="xs">Rider Types</Text>
                                            <div className="flex flex-wrap gap-1">
                                                {[...new Set(campaign.rider_demographics?.map(d => d.rider_type))].map((type, idx) => (
                                                    <Badge key={idx} variant="light" color="green">
                                                        {type}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </Paper>
                                    </Grid.Col>
                                </Grid>
                            </div>

                            {/* Design Requirements */}
                            {campaign.need_design && (
                                <>
                                    <Divider />
                                    <div>
                                        <Text size="lg" fw={700} mb="md">Design Requirements</Text>
                                        <Paper p="md" withBorder>
                                            <Stack gap="sm">
                                                <Group>
                                                    <Badge color="purple">Design Required</Badge>
                                                </Group>
                                                {campaign.design_requirements && (
                                                    <Text>{campaign.design_requirements}</Text>
                                                )}
                                                {campaign.design_file && (
                                                    <Button variant="light" size="sm" leftSection={<DownloadIcon size={14} />}>
                                                        Download Design File
                                                    </Button>
                                                )}
                                            </Stack>
                                        </Paper>
                                    </div>
                                </>
                            )}
                        </Stack>
                    </Tabs.Panel>

                    <Tabs.Panel value="assignments" p="md">
                        <Stack gap="md">
                            {campaign.status === 'completed' &&
                                campaign.assignments?.some(a => a.status === 'active') && (
                                <Alert
                                    icon={<AlertCircleIcon size={16} />}
                                    title="Campaign Ended — Helmets Still Assigned"
                                    color="orange"
                                >
                                    <Text size="sm" mb="sm">
                                        This campaign is complete but {campaign.assignments.filter(a => a.status === 'active').length} helmet(s) are still marked as assigned. Revoking them returns them to the available pool so they can be used in new campaigns.
                                    </Text>
                                    <Button
                                        color="orange"
                                        size="sm"
                                        leftSection={<XCircleIcon size={14} />}
                                        onClick={handleRevokeAllHelmets}
                                    >
                                        Revoke All Helmets
                                    </Button>
                                </Alert>
                            )}
                            <Text size="sm" fw={600} c="dimmed" tt="uppercase">
                                Current Assignments
                            </Text>
                            {activeAssignments.length > 0 ? (
                                <div className="overflow-x-auto">
                                <Table>
                                    <Table.Thead>
                                        <Table.Tr>
                                            <Table.Th>Rider</Table.Th>
                                            <Table.Th>Helmet Number</Table.Th>
                                            <Table.Th>Assigned Date</Table.Th>
                                            <Table.Th>Actions</Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {activeAssignments.map((assignment) => (
                                            <Table.Tr key={assignment.id}>
                                                <Table.Td>
                                                    <div>
                                                        <Text size="sm" fw={500}>
                                                            {assignment.rider?.user?.name}
                                                        </Text>
                                                        <Text size="xs" c="dimmed">
                                                            {assignment.rider?.user?.email}
                                                        </Text>
                                                    </div>
                                                </Table.Td>
                                                <Table.Td>
                                                    <Badge variant="outline">
                                                        {assignment.helmet?.helmet_code ?? '—'}
                                                    </Badge>
                                                </Table.Td>
                                                <Table.Td>
                                                    <Text size="sm">
                                                        {formatDate(assignment.assigned_at)}
                                                    </Text>
                                                </Table.Td>
                                                <Table.Td>
                                                    <Menu shadow="md" width={200}>
                                                        <Menu.Target>
                                                            <ActionIcon variant="subtle">
                                                                <MoreVerticalIcon size={16} />
                                                            </ActionIcon>
                                                        </Menu.Target>
                                                        <Menu.Dropdown>
                                                            <Menu.Item
                                                                leftSection={<ActivityIcon size={14} />}
                                                                component={Link}
                                                                href={route('campaigns.assignment-activity', [campaign.id, assignment.id])}
                                                            >
                                                                View Activity for This Campaign
                                                            </Menu.Item>
                                                            <Menu.Item
                                                                leftSection={<CheckCircleIcon size={14} />}
                                                                onClick={() => handleCompleteAssignment(assignment.id)}
                                                            >
                                                                Mark Complete
                                                            </Menu.Item>
                                                            <Menu.Item
                                                                leftSection={<XCircleIcon size={14} />}
                                                                color="red"
                                                                onClick={() => handleRemoveAssignment(assignment.id)}
                                                            >
                                                                Remove Assignment
                                                            </Menu.Item>
                                                        </Menu.Dropdown>
                                                    </Menu>
                                                </Table.Td>
                                            </Table.Tr>
                                        ))}
                                    </Table.Tbody>
                                </Table>
                                </div>
                            ) : (
                                <Paper p="xl" className="text-center">
                                    <UsersIcon size={48} className="mx-auto text-gray-400 mb-4" />
                                    <Text size="lg" fw={500} mb="xs">No Riders Assigned Yet</Text>
                                    <Text size="sm" c="dimmed" mb="md">
                                        Start by assigning riders to this campaign
                                    </Text>
                                    {campaign.payment_status === 'paid' && (campaign.status === 'submitted' || campaign.status === 'active') && (
                                        <Group justify="center" gap="xs">
                                            {maxAutoAssign > 0 && (
                                                <Button variant="light" onClick={openAutoAssignModal} leftSection={<UsersIcon size={16} />}>
                                                    Auto-Assign Riders
                                                </Button>
                                            )}
                                            <Button onClick={openAssignModal} leftSection={<UserPlusIcon size={16} />}>
                                                Assign First Rider
                                            </Button>
                                        </Group>
                                    )}
                                </Paper>
                            )}

                            {historyAssignments.length > 0 && (
                                <>
                                    <Text size="sm" fw={600} c="dimmed" tt="uppercase" mt="md">
                                        Assignment History
                                    </Text>
                                    <div className="overflow-x-auto">
                                    <Table>
                                        <Table.Thead>
                                            <Table.Tr>
                                                <Table.Th>Rider</Table.Th>
                                                <Table.Th>Helmet Number</Table.Th>
                                                <Table.Th>Assigned Date</Table.Th>
                                                <Table.Th>Status</Table.Th>
                                            </Table.Tr>
                                        </Table.Thead>
                                        <Table.Tbody>
                                            {historyAssignments.map((assignment) => (
                                                <Table.Tr key={assignment.id}>
                                                    <Table.Td>
                                                        <div>
                                                            <Text size="sm" fw={500}>
                                                                {assignment.rider?.user?.name}
                                                            </Text>
                                                            <Text size="xs" c="dimmed">
                                                                {assignment.rider?.user?.email}
                                                            </Text>
                                                        </div>
                                                    </Table.Td>
                                                    <Table.Td>
                                                        <Badge variant="outline">
                                                            {assignment.helmet?.helmet_code ?? '—'}
                                                        </Badge>
                                                    </Table.Td>
                                                    <Table.Td>
                                                        <Text size="sm">
                                                            {formatDate(assignment.assigned_at)}
                                                        </Text>
                                                    </Table.Td>
                                                    <Table.Td>
                                                        <Badge color={assignment.status === 'completed' ? 'blue' : 'red'}>
                                                            {assignment.status}
                                                        </Badge>
                                                    </Table.Td>
                                                </Table.Tr>
                                            ))}
                                        </Table.Tbody>
                                    </Table>
                                    </div>
                                </>
                            )}
                        </Stack>
                    </Tabs.Panel>

                    <Tabs.Panel value="financials" p="md">
                        <Stack gap="lg">
                            {/* Cost Breakdown */}
                            <div>
                                <Text size="lg" fw={700} mb="md">Cost Breakdown</Text>
                                <Paper p="md" withBorder>
                                    <Stack gap="sm">
                                        <Group justify="apart">
                                            <Text>Base Cost ({campaign.helmet_count} helmets × {campaign.current_cost?.duration_days ?? campaign.duration_days ?? 0} days × KES {campaign.current_cost?.helmet_daily_rate ?? 0})</Text>
                                            <Text fw={500}>{formatCurrency(campaign.current_cost?.base_cost || 0)}</Text>
                                        </Group>
                                        {campaign.current_cost?.includes_design && (
                                            <Group justify="apart">
                                                <Text>Design Cost</Text>
                                                <Text fw={500}>{formatCurrency(campaign.current_cost?.design_cost || 0)}</Text>
                                            </Group>
                                        )}
                                        <Divider />
                                        <Group justify="apart">
                                            <Text>Subtotal</Text>
                                            <Text fw={500}>{formatCurrency(campaign.current_cost?.subtotal || 0)}</Text>
                                        </Group>
                                        <Group justify="apart">
                                            <Text>VAT ({campaign.current_cost?.vat_rate}%)</Text>
                                            <Text fw={500}>{formatCurrency(campaign.current_cost?.vat_amount || 0)}</Text>
                                        </Group>
                                        <Divider />
                                        <Group justify="apart">
                                            <Text size="lg" fw={700}>Total Cost</Text>
                                            <Text size="lg" fw={700} c="blue">
                                                {formatCurrency(campaign.current_cost?.total_cost || 0)}
                                            </Text>
                                        </Group>
                                    </Stack>
                                </Paper>
                            </div>

                            {/* Payment Status */}
                            <div>
                                <Group justify="apart" mb="md">
                                    <Text size="lg" fw={700}>Payment Status</Text>
                                    {isAdmin && (
                                        <Button
                                            size="sm"
                                            variant="light"
                                            leftSection={<Banknote size={15} />}
                                            onClick={openManualPayment}
                                        >
                                            Record Manual Payment
                                        </Button>
                                    )}
                                </Group>
                                <Paper p="md" withBorder>
                                    <Stack gap="sm">
                                        <Group justify="apart">
                                            <Text>Payment Status</Text>
                                            <Badge size="lg" color={getPaymentStatusColor(campaign.payment_status)}>
                                                {campaign.payment_status?.replace('_', ' ').toUpperCase()}
                                            </Badge>
                                        </Group>
                                        <Group justify="apart">
                                            <Text>Amount Paid</Text>
                                            <Text fw={500} c="green">
                                                {formatCurrency(campaign.total_paid_amount || 0)}
                                            </Text>
                                        </Group>
                                        <Group justify="apart">
                                            <Text>Balance Due</Text>
                                            <Text fw={500} c="red">
                                                {formatCurrency(calculateBalance(campaign.current_cost?.total_cost, campaign.total_paid_amount))}
                                            </Text>
                                        </Group>
                                        <Progress
                                            value={((campaign.total_paid_amount || 0) / (campaign.current_cost?.total_cost || 1)) * 100}
                                            color="green"
                                            size="lg"
                                            radius="xl"
                                        />
                                    </Stack>
                                </Paper>
                            </div>

                            {/* Payment History */}
                            {campaign.payments && campaign.payments.length > 0 && (
                                <div>
                                    <Text size="lg" fw={700} mb="md">Payment History</Text>
                                    <div className="overflow-x-auto">
                                    <Table>
                                        <Table.Thead>
                                            <Table.Tr>
                                                <Table.Th>Date</Table.Th>
                                                <Table.Th>Amount</Table.Th>
                                                <Table.Th>Method</Table.Th>
                                                <Table.Th>Reference Code</Table.Th>
                                                <Table.Th>Status</Table.Th>
                                                <Table.Th>Actions</Table.Th>
                                            </Table.Tr>
                                        </Table.Thead>
                                        <Table.Tbody>
                                            {campaign.payments.map((payment) => (
                                                <Table.Tr key={payment.id}>
                                                    <Table.Td>{formatDate(payment.created_at)}</Table.Td>
                                                    <Table.Td>{formatCurrency(payment.amount)}</Table.Td>
                                                    <Table.Td>
                                                        <Badge variant="outline">{payment.payment_method}</Badge>
                                                    </Table.Td>
                                                    <Table.Td>
                                                        <Badge variant="outline">{payment.mpesa_receipt_number || '—'}</Badge>
                                                    </Table.Td>
                                                    <Table.Td>
                                                        <Badge color={payment.status === 'completed' ? 'green' : payment.status === 'pending_verification' ? 'yellow' : 'gray'}>
                                                            {payment.status}
                                                        </Badge>
                                                    </Table.Td>
                                                    <Table.Td>
                                                        {payment.status === 'pending_verification' && (
                                                            <Group gap="xs">
                                                                <Button
                                                                    size="xs"
                                                                    color="green"
                                                                    onClick={() => handleApprovePayment(payment.id)}
                                                                >
                                                                    Approve
                                                                </Button>
                                                                <Button
                                                                    size="xs"
                                                                    color="red"
                                                                    variant="light"
                                                                    onClick={() => handleRejectPayment(payment.id)}
                                                                >
                                                                    Reject
                                                                </Button>
                                                            </Group>
                                                        )}
                                                    </Table.Td>
                                                </Table.Tr>
                                            ))}
                                        </Table.Tbody>
                                    </Table>
                                    </div>
                                </div>
                            )}
                        </Stack>
                    </Tabs.Panel>

                    {isAdmin && paymentAnalysis && (
                        <Tabs.Panel value="payment-analysis" p="md">
                            <Stack gap="lg">
                                {/* Summary Cards */}
                                <div>
                                    <Text size="lg" fw={700} mb="md">Financial Summary</Text>
                                    <Grid gutter="md">
                                        <Grid.Col span={{ base: 12, sm: 4 }}>
                                            <Paper p="md" withBorder>
                                                <Stack gap="xs">
                                                    <Group justify="apart">
                                                        <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Total Revenue</Text>
                                                        <BanknoteIcon size={20} className="text-blue-500" />
                                                    </Group>
                                                    <Text size="xl" fw={700} c="blue">
                                                        {formatCurrency(paymentAnalysis.total_revenue)}
                                                    </Text>
                                                    <Text size="xs" c="dimmed">Paid by advertiser (completed payments)</Text>
                                                </Stack>
                                            </Paper>
                                        </Grid.Col>

                                        <Grid.Col span={{ base: 12, sm: 4 }}>
                                            <Paper p="md" withBorder>
                                                <Stack gap="xs">
                                                    <Group justify="apart">
                                                        <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Rider Payouts</Text>
                                                        <UsersIcon size={20} className="text-orange-500" />
                                                    </Group>
                                                    <Text size="xl" fw={700} c="orange">
                                                        {formatCurrency(paymentAnalysis.total_rider_payouts)}
                                                    </Text>
                                                    <Text size="xs" c="dimmed">Total earned by all riders so far</Text>
                                                </Stack>
                                            </Paper>
                                        </Grid.Col>

                                        <Grid.Col span={{ base: 12, sm: 4 }}>
                                            <Paper p="md" withBorder>
                                                <Stack gap="xs">
                                                    <Group justify="apart">
                                                        <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Company Profit</Text>
                                                        {paymentAnalysis.company_profit >= 0
                                                            ? <TrendingUpIcon size={20} className="text-green-500" />
                                                            : <TrendingDownIcon size={20} className="text-red-500" />
                                                        }
                                                    </Group>
                                                    <Text size="xl" fw={700} c={paymentAnalysis.company_profit >= 0 ? 'green' : 'red'}>
                                                        {formatCurrency(paymentAnalysis.company_profit)}
                                                    </Text>
                                                    <Text size="xs" c="dimmed">Revenue minus total rider payouts</Text>
                                                </Stack>
                                            </Paper>
                                        </Grid.Col>
                                    </Grid>
                                </div>

                                {/* Revenue Breakdown Bar */}
                                {paymentAnalysis.total_revenue > 0 && (
                                    <div>
                                        <Text size="lg" fw={700} mb="md">Revenue Breakdown</Text>
                                        <Paper p="md" withBorder>
                                            <Stack gap="sm">
                                                <Group justify="apart">
                                                    <Text size="sm" c="dimmed">
                                                        Rider Payouts — {((paymentAnalysis.total_rider_payouts / paymentAnalysis.total_revenue) * 100).toFixed(1)}%
                                                    </Text>
                                                    <Text size="sm" c="dimmed">
                                                        Company Profit — {Math.max(0, (paymentAnalysis.company_profit / paymentAnalysis.total_revenue) * 100).toFixed(1)}%
                                                    </Text>
                                                </Group>
                                                <Progress
                                                    value={(paymentAnalysis.total_rider_payouts / paymentAnalysis.total_revenue) * 100}
                                                    color="orange"
                                                    size="xl"
                                                    radius="xl"
                                                />
                                                <Group gap="xl">
                                                    <Group gap="xs">
                                                        <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: 'var(--mantine-color-orange-5)' }} />
                                                        <Text size="xs" c="dimmed">Rider Payouts: {formatCurrency(paymentAnalysis.total_rider_payouts)}</Text>
                                                    </Group>
                                                    <Group gap="xs">
                                                        <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: 'var(--mantine-color-blue-5)' }} />
                                                        <Text size="xs" c="dimmed">Company Profit: {formatCurrency(paymentAnalysis.company_profit)}</Text>
                                                    </Group>
                                                </Group>
                                            </Stack>
                                        </Paper>
                                    </div>
                                )}

                                {/* No payment yet notice */}
                                {paymentAnalysis.total_revenue === 0 && (
                                    <Alert icon={<AlertCircleIcon size={16} />} color="yellow" variant="light">
                                        No completed payments found for this campaign. Analysis will populate once the advertiser completes payment.
                                    </Alert>
                                )}

                                {/* Per-Rider Payouts */}
                                <div>
                                    <Text size="lg" fw={700} mb="md">Per-Rider Payouts</Text>
                                    {paymentAnalysis.per_rider.length > 0 ? (
                                        <div className="overflow-x-auto">
                                        <Table>
                                            <Table.Thead>
                                                <Table.Tr>
                                                    <Table.Th>Rider</Table.Th>
                                                    <Table.Th>Days Worked</Table.Th>
                                                    <Table.Th>Total Earned</Table.Th>
                                                    <Table.Th>% of Revenue</Table.Th>
                                                </Table.Tr>
                                            </Table.Thead>
                                            <Table.Tbody>
                                                {paymentAnalysis.per_rider.map((rider) => (
                                                    <Table.Tr key={rider.rider_id}>
                                                        <Table.Td>
                                                            <Text size="sm" fw={500}>{rider.rider_name}</Text>
                                                        </Table.Td>
                                                        <Table.Td>
                                                            <Badge variant="light" color="blue">{rider.days_worked} day{rider.days_worked !== 1 ? 's' : ''}</Badge>
                                                        </Table.Td>
                                                        <Table.Td>
                                                            <Text size="sm" fw={500} c="orange">
                                                                {formatCurrency(rider.total_earning)}
                                                            </Text>
                                                        </Table.Td>
                                                        <Table.Td>
                                                            <Text size="sm">
                                                                {paymentAnalysis.total_revenue > 0
                                                                    ? ((rider.total_earning / paymentAnalysis.total_revenue) * 100).toFixed(1) + '%'
                                                                    : '—'
                                                                }
                                                            </Text>
                                                        </Table.Td>
                                                    </Table.Tr>
                                                ))}
                                                <Table.Tr style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
                                                    <Table.Td><Text size="sm" fw={700}>Total</Text></Table.Td>
                                                    <Table.Td></Table.Td>
                                                    <Table.Td>
                                                        <Text size="sm" fw={700} c="orange">
                                                            {formatCurrency(paymentAnalysis.total_rider_payouts)}
                                                        </Text>
                                                    </Table.Td>
                                                    <Table.Td>
                                                        <Text size="sm" fw={700}>
                                                            {paymentAnalysis.total_revenue > 0
                                                                ? ((paymentAnalysis.total_rider_payouts / paymentAnalysis.total_revenue) * 100).toFixed(1) + '%'
                                                                : '—'
                                                            }
                                                        </Text>
                                                    </Table.Td>
                                                </Table.Tr>
                                            </Table.Tbody>
                                        </Table>
                                        </div>
                                    ) : (
                                        <Paper p="xl" className="text-center" withBorder>
                                            <UsersIcon size={36} className="mx-auto text-gray-400 mb-2" />
                                            <Text size="sm" c="dimmed">
                                                No rider payouts recorded yet. Earnings accumulate daily as riders check in and check out.
                                            </Text>
                                        </Paper>
                                    )}
                                </div>

                                {/* Progressive Daily Breakdown */}
                                <div>
                                    <Text size="lg" fw={700} mb="xs">Progressive Daily Analysis</Text>
                                    <Text size="sm" c="dimmed" mb="md">
                                        Rider costs accumulate each day. Profit is updated in real-time as riders earn through check-ins.
                                    </Text>
                                    {paymentAnalysis.daily_breakdown.length > 0 ? (
                                        <div className="overflow-x-auto">
                                        <Table>
                                            <Table.Thead>
                                                <Table.Tr>
                                                    <Table.Th>Date</Table.Th>
                                                    <Table.Th>Active Riders</Table.Th>
                                                    <Table.Th>Daily Rider Cost</Table.Th>
                                                    <Table.Th>Cumulative Rider Cost</Table.Th>
                                                    <Table.Th>Running Profit</Table.Th>
                                                </Table.Tr>
                                            </Table.Thead>
                                            <Table.Tbody>
                                                {paymentAnalysis.daily_breakdown.map((day) => (
                                                    <Table.Tr key={day.date}>
                                                        <Table.Td>
                                                            <Text size="sm">{formatDate(day.date)}</Text>
                                                        </Table.Td>
                                                        <Table.Td>
                                                            <Badge variant="light" color="blue">{day.riders_active}</Badge>
                                                        </Table.Td>
                                                        <Table.Td>
                                                            <Text size="sm" c="orange">{formatCurrency(day.daily_rider_cost)}</Text>
                                                        </Table.Td>
                                                        <Table.Td>
                                                            <Text size="sm" c="red">{formatCurrency(day.cumulative_rider_cost)}</Text>
                                                        </Table.Td>
                                                        <Table.Td>
                                                            <Text size="sm" fw={600} c={day.cumulative_profit >= 0 ? 'green' : 'red'}>
                                                                {formatCurrency(day.cumulative_profit)}
                                                            </Text>
                                                        </Table.Td>
                                                    </Table.Tr>
                                                ))}
                                            </Table.Tbody>
                                        </Table>
                                        </div>
                                    ) : (
                                        <Paper p="xl" className="text-center" withBorder>
                                            <BarChart2Icon size={36} className="mx-auto text-gray-400 mb-2" />
                                            <Text size="sm" c="dimmed">
                                                No daily activity recorded yet. This table updates as riders complete their daily check-ins.
                                            </Text>
                                        </Paper>
                                    )}
                                </div>
                            </Stack>
                        </Tabs.Panel>
                    )}

                    {isAdmin && (
                        <Tabs.Panel value="heatmap" p="md">
                            <Stack gap="md">
                                <Group justify="flex-end">
                                    <Select
                                        label="Period"
                                        value={heatmapPeriod}
                                        onChange={(value) => setHeatmapPeriod((value as HeatmapPeriod) ?? '7days')}
                                        data={[
                                            { value: 'today', label: 'Today' },
                                            { value: '7days', label: 'Last 7 days' },
                                            { value: '30days', label: 'Last 30 days' },
                                        ]}
                                        w={180}
                                        allowDeselect={false}
                                        comboboxProps={{ zIndex: 2000 }}
                                    />
                                </Group>

                                {heatmapVisited ? (
                                    <Suspense
                                        fallback={
                                            <div className="h-[500px] flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg">
                                                <span className="text-gray-500 dark:text-gray-400">Loading map…</span>
                                            </div>
                                        }
                                    >
                                        <LiveHeatmap
                                            key={heatmapPeriod}
                                            campaignId={campaign.id}
                                            period={heatmapPeriod}
                                            height={500}
                                            apiEndpoint="/admin/tracking/heatmap"
                                        />
                                    </Suspense>
                                ) : (
                                    <div className="h-[500px] flex items-center justify-center bg-gray-50 dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                                        <span className="text-gray-400">Loading map…</span>
                                    </div>
                                )}
                            </Stack>
                        </Tabs.Panel>
                    )}

                    <Tabs.Panel value="timeline" p="md">
                        <Timeline active={3} bulletSize={24} lineWidth={2}>
                            <Timeline.Item
                                bullet={<FileTextIcon size={12} />}
                                title="Campaign Created"
                            >
                                <Text c="dimmed" size="sm">
                                    Campaign was created and saved as draft
                                </Text>
                                <Text size="xs" mt={4}>
                                    {formatDate(campaign.created_at || '')}
                                </Text>
                            </Timeline.Item>

                            {campaign.status !== 'draft' && (
                                <Timeline.Item
                                    bullet={<BanknoteIcon size={12} />}
                                    title="Payment Initiated"
                                    color="yellow"
                                >
                                    <Text c="dimmed" size="sm">
                                        Campaign costs calculated and payment initiated
                                    </Text>
                                </Timeline.Item>
                            )}

                            {campaign.payment_status === 'paid' && (
                                <Timeline.Item
                                    bullet={<CheckCircleIcon size={12} />}
                                    title="Payment Completed"
                                    color="green"
                                >
                                    <Text c="dimmed" size="sm">
                                        Payment successfully processed
                                    </Text>
                                </Timeline.Item>
                            )}

                            {(campaign.status === 'active' || campaign.status === 'completed') && (
                                <Timeline.Item
                                    bullet={<PlayCircleIcon size={12} />}
                                    title="Campaign Activated"
                                    color="blue"
                                >
                                    <Text c="dimmed" size="sm">
                                        Campaign went live
                                    </Text>
                                    {campaign.start_date && (
                                        <Text size="xs" mt={4}>
                                            {formatDate(campaign.start_date)}
                                        </Text>
                                    )}
                                </Timeline.Item>
                            )}

                            {campaign.status === 'completed' && (
                                <Timeline.Item
                                    bullet={<CheckCircleIcon size={12} />}
                                    title="Campaign Completed"
                                    color="green"
                                >
                                    <Text c="dimmed" size="sm">
                                        Campaign successfully completed
                                    </Text>
                                    {campaign.end_date && (
                                        <Text size="xs" mt={4}>
                                            {formatDate(campaign.end_date)}
                                        </Text>
                                    )}
                                </Timeline.Item>
                            )}

                            {campaign.status === 'completed' && !!campaign.assignments?.filter(a => a.status === 'completed').length && (
                                <Timeline.Item
                                    bullet={<BikeIcon size={12} />}
                                    title="Helmets Returned"
                                    color="green"
                                >
                                    <Text c="dimmed" size="sm">
                                        {campaign.assignments.filter(a => a.status === 'completed').length} helmet(s) auto-revoked and returned to the available pool. Riders were notified to drop them off.
                                    </Text>
                                </Timeline.Item>
                            )}

                            {campaign.status === 'paused' && (
                                <Timeline.Item
                                    bullet={<PauseCircleIcon size={12} />}
                                    title="Campaign Paused"
                                    color="orange"
                                >
                                    <Text c="dimmed" size="sm">
                                        Campaign temporarily paused
                                    </Text>
                                </Timeline.Item>
                            )}

                            {campaign.status === 'cancelled' && (
                                <Timeline.Item
                                    bullet={<XCircleIcon size={12} />}
                                    title="Campaign Cancelled"
                                    color="red"
                                >
                                    <Text c="dimmed" size="sm">
                                        Campaign was cancelled
                                    </Text>
                                </Timeline.Item>
                            )}
                        </Timeline>
                    </Tabs.Panel>
                </Tabs>
            </div>

            {/* Assign Rider Modal */}
            <Modal
                opened={assignModalOpened}
                onClose={closeAssignModal}
                title={
                    <Group>
                        <UserPlusIcon size={20} />
                        <Text fw={700}>Assign Rider to Campaign</Text>
                    </Group>
                }
                size="lg"
                centered
            >
                <Stack gap="md">
                    <Alert icon={<InfoIcon size={16} />} color="blue" variant="light">
                        Assign riders to this campaign. Each rider will be paired with a helmet and will participate in the advertising campaign.
                    </Alert>

                    {errors?.assignment && (
                        <Alert
                            icon={<AlertCircleIcon size={16} />}
                            color="red"
                            variant="light"
                            title="Assignment Failed"
                            withCloseButton
                            onClose={() => router.reload({ only: [] })} // clears the error
                        >
                            {errors.assignment}
                        </Alert>
                    )}

                    <div>
                        <Text size="sm" fw={500} mb={4}>Campaign Details</Text>
                        <Paper p="sm" withBorder>
                            <Stack gap="xs">
                                <Group justify="apart">
                                    <Text size="sm" c="dimmed">Campaign Name</Text>
                                    <Text size="sm" fw={500}>{campaign.name}</Text>
                                </Group>
                                <Group justify="apart">
                                    <Text size="sm" c="dimmed">Available Slots</Text>
                                    <Text size="sm" fw={500}>
                                        {campaign.helmet_count - (campaign.assignments?.filter(a => a.status === 'active').length || 0)} remaining
                                    </Text>
                                </Group>
                                <Group justify="apart">
                                    <Text size="sm" c="dimmed">Duration</Text>
                                    <Text size="sm" fw={500}>
                                        {formatDate(campaign.start_date)} - {formatDate(campaign.end_date)}
                                    </Text>
                                </Group>
                            </Stack>
                        </Paper>
                    </div>

                    <Select
                        label="Select Rider"
                        placeholder="Choose a rider"
                        data={availableRiders.map(rider => ({
                            value: rider.id.toString(),
                            label: `${rider.user.name} (${rider.national_id})`,
                        }))}
                        value={selectedRider}
                        onChange={(value) => setSelectedRider(value || '')}
                        searchable
                        required
                        leftSection={<UsersIcon size={16} />}
                    />

                    <Select
                        label="Select Helmet"
                        placeholder="Choose a helmet"
                        data={availableHelmets.map(helmet => ({
                            value: helmet.id.toString(),
                            label: `Helmet ${helmet.helmet_code} - ${helmet.status}`,
                        }))}
                        value={selectedHelmet}
                        onChange={(value) => setSelectedHelmet(value || '')}
                        searchable
                        required
                        leftSection={<BikeIcon size={16} />}
                    />

                    <NumberInput
                        label="Number of Assignments"
                        placeholder="1"
                        min={1}
                        max={campaign.helmet_count - (campaign.assignments?.filter(a => a.status === 'active').length || 0)}
                        value={assignmentCount}
                        onChange={(value) => setAssignmentCount(Number(value))}
                        description="Assign multiple helmets to the same rider (if available)"
                    />

                    <Divider />

                    <Group justify="flex-end">
                        <Button variant="light" onClick={closeAssignModal}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAssignRider}
                            disabled={!selectedRider || !selectedHelmet}
                            leftSection={<UserPlusIcon size={16} />}
                        >
                            Assign Rider
                        </Button>
                    </Group>
                </Stack>
            </Modal>

            {/* Auto-Assign Riders Modal */}
            <Modal
                opened={autoAssignModalOpened}
                onClose={closeAutoAssignModal}
                title={
                    <Group>
                        <UsersIcon size={20} />
                        <Text fw={700}>Auto-Assign Riders</Text>
                    </Group>
                }
                size="md"
                centered
            >
                <Stack gap="md">
                    <Alert icon={<InfoIcon size={16} />} color="blue" variant="light">
                        Automatically picks the next available approved riders and helmets and assigns them to this campaign — no need to pick each one manually.
                    </Alert>

                    <NumberInput
                        label="Number of Riders to Assign"
                        value={autoAssignCount}
                        onChange={(v) => setAutoAssignCount(Number(v))}
                        min={1}
                        max={maxAutoAssign}
                        required
                        description={`Up to ${maxAutoAssign} rider(s) can be auto-assigned right now (limited by remaining helmet slots, available riders, and available helmets).`}
                    />

                    <Divider />

                    <Group justify="flex-end">
                        <Button variant="light" onClick={closeAutoAssignModal} disabled={autoAssigning}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAutoAssign}
                            loading={autoAssigning}
                            disabled={autoAssignCount < 1 || autoAssignCount > maxAutoAssign}
                            leftSection={<UsersIcon size={16} />}
                        >
                            Auto-Assign {autoAssignCount} Rider{autoAssignCount === 1 ? '' : 's'}
                        </Button>
                    </Group>
                </Stack>
            </Modal>

            {/* Manual Payment Modal */}
            <Modal
                opened={manualPaymentOpened}
                onClose={closeManualPayment}
                title={
                    <Group gap="sm">
                        <Banknote size={20} className="text-gray-600" />
                        <Text fw={700}>Record Manual Payment</Text>
                    </Group>
                }
                size="md"
                centered
            >
                <Stack gap="md">
                    <Alert icon={<InfoIcon size={16} />} color="blue" variant="light">
                        Record a payment collected directly — cash or M-Pesa without STK push. The campaign will be marked as <strong>paid</strong> automatically.
                    </Alert>

                    {campaign.campaign_number && (
                        <Group justify="space-between">
                            <Text size="sm" c="dimmed">Campaign Account No.</Text>
                            <Badge size="lg" variant="light" color="gray">{campaign.campaign_number}</Badge>
                        </Group>
                    )}

                    <NumberInput
                        label="Amount (KES)"
                        placeholder="Enter amount"
                        value={manualAmount}
                        onChange={setManualAmount}
                        min={1}
                        prefix="KES "
                        thousandSeparator=","
                        required
                    />

                    <Select
                        label="Payment Method"
                        data={[
                            { value: 'cash', label: 'Cash' },
                            { value: 'mpesa', label: 'M-Pesa (Manual)' },
                        ]}
                        value={manualMethod}
                        onChange={(v) => setManualMethod(v || 'cash')}
                        required
                    />

                    <TextInput
                        label="Receipt / Reference Number"
                        placeholder="e.g., M-Pesa code or cash receipt"
                        value={manualReceipt}
                        onChange={(e) => setManualReceipt(e.currentTarget.value)}
                        description="Optional for cash, recommended for M-Pesa"
                    />

                    <Textarea
                        label="Notes"
                        placeholder="Any additional notes..."
                        value={manualNotes}
                        onChange={(e) => setManualNotes(e.currentTarget.value)}
                        rows={2}
                    />

                    <Paper p="sm" withBorder radius="md" className="bg-gray-50">
                        <Stack gap="xs">
                            <Group justify="apart">
                                <Text size="sm" c="dimmed">Campaign</Text>
                                <Text size="sm" fw={500}>{campaign.name}</Text>
                            </Group>
                            <Group justify="apart">
                                <Text size="sm" c="dimmed">Advertiser</Text>
                                <Text size="sm" fw={500}>{campaign.advertiser?.company_name}</Text>
                            </Group>
                            <Group justify="apart">
                                <Text size="sm" c="dimmed">Total Cost</Text>
                                <Text size="sm" fw={500}>{formatCurrency(campaign.current_cost?.total_cost || 0)}</Text>
                            </Group>
                        </Stack>
                    </Paper>

                    <Divider />

                    <Group justify="flex-end">
                        <Button variant="light" onClick={closeManualPayment} disabled={savingManual}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleManualPayment}
                            loading={savingManual}
                            disabled={!manualAmount || Number(manualAmount) <= 0}
                            leftSection={<Banknote size={16} />}
                            color="green"
                        >
                            Record Payment
                        </Button>
                    </Group>
                </Stack>
            </Modal>

            <StatusUpdateModal
                opened={statusModalOpened}
                onClose={closeStatusModal}
                campaign={campaign}
            />
        </AuthenticatedLayout>
    );
}