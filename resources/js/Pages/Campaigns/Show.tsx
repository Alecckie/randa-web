import { useState } from 'react';
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
    DollarSignIcon,
    FileTextIcon,
    TrendingUpIcon,
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
    TargetIcon
} from 'lucide-react';
import type { Campaign } from '@/types/campaign';

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
        };
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
            mpesa_receipt: string;
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
}

export default function Show({ campaign, availableRiders = [], availableHelmets = [] }: CampaignShowProps) {
    const [assignModalOpened, { open: openAssignModal, close: closeAssignModal }] = useDisclosure(false);
    const [selectedRider, setSelectedRider] = useState<string>('');
    const [selectedHelmet, setSelectedHelmet] = useState<string>('');
    const [assignmentCount, setAssignmentCount] = useState(1);

    const getStatusColor = (status: string): string => {
        const colors: Record<string, string> = {
            draft: 'yellow',
            active: 'blue',
            paused: 'orange',
            completed: 'green',
            cancelled: 'red',
            pending_payment: 'yellow',
            paid: 'teal'
        };
        return colors[status] || 'gray';
    };

    const getPaymentStatusColor = (status: string): string => {
        const colors: Record<string, string> = {
            fully_paid: 'green',
            partially_paid: 'yellow',
            unpaid: 'red',
        };
        return colors[status] || 'gray';
    };

    // Inside your Show component, add this near other state declarations:
    const { errors, flash } = usePage().props as any;

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

    const calculateProgress = () => {
        const assigned = campaign.assignments?.filter(a => a.status === 'active').length || 0;
        return (assigned / campaign.helmet_count) * 100;
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-KE', {
            style: 'currency',
            currency: 'KES',
        }).format(amount);
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
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
                                Campaign Details & Management
                            </p>
                        </div>
                    </div>
                    <Group>
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
                                    >
                                        Pause Campaign
                                    </Menu.Item>
                                )}
                                {campaign.status === 'paused' && (
                                    <Menu.Item
                                        leftSection={<PlayCircleIcon size={14} />}
                                        color="green"
                                    >
                                        Resume Campaign
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
                {campaign.status === 'pending_payment' && (
                    <Alert icon={<AlertCircleIcon size={16} />} title="Payment Required" color="yellow">
                        This campaign is awaiting payment. Please complete the payment to activate the campaign.
                    </Alert>
                )}

                {campaign.status === 'paid' && (
                    <Alert icon={<InfoIcon size={16} />} title="Ready to Activate" color="blue">
                        Campaign is paid and ready to be activated. Assign riders to begin.
                    </Alert>
                )}

                {flash?.success && (
                    <Alert
                        icon={<CheckCircleIcon size={16} />}
                        title="Success"
                        color="green"
                        withCloseButton
                    >
                        {flash.success}
                    </Alert>
                )}

                {flash?.error && (
                    <Alert
                        icon={<AlertCircleIcon size={16} />}
                        title="Error"
                        color="red"
                        withCloseButton
                    >
                        {flash.error}
                    </Alert>
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
                                        {campaign.current_cost.duration_days} Days
                                    </Text>
                                </div>
                                <CalendarIcon size={32} className="text-blue-500" />
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
                                <BikeIcon size={32} className="text-green-500" />
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
                                <UsersIcon size={32} className="text-purple-500" />
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
                                <DollarSignIcon size={32} className="text-yellow-500" />
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
                            {(campaign.status === 'paid' || campaign.status === 'active') && (
                                <Button
                                    leftSection={<UserPlusIcon size={16} />}
                                    onClick={openAssignModal}
                                >
                                    Assign Rider
                                </Button>
                            )}
                        </Group>
                        <Progress
                            value={calculateProgress()}
                            size="xl"
                            radius="xl"
                            color={calculateProgress() === 100 ? 'green' : 'blue'}
                        />
                    </Stack>
                </Card>

                {/* Tabs for detailed information */}
                <Tabs defaultValue="details" className="bg-white dark:bg-gray-800 rounded-lg">
                    <Tabs.List>
                        <Tabs.Tab value="details" leftSection={<FileTextIcon size={16} />}>
                            Campaign Details
                        </Tabs.Tab>
                        <Tabs.Tab value="assignments" leftSection={<UsersIcon size={16} />}>
                            Rider Assignments ({campaign.assignments?.length || 0})
                        </Tabs.Tab>
                        <Tabs.Tab value="financials" leftSection={<DollarSignIcon size={16} />}>
                            Financials
                        </Tabs.Tab>
                        <Tabs.Tab value="timeline" leftSection={<ClockIcon size={16} />}>
                            Timeline
                        </Tabs.Tab>
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
                            {campaign.assignments && campaign.assignments.length > 0 ? (
                                <Table>
                                    <Table.Thead>
                                        <Table.Tr>
                                            <Table.Th>Rider</Table.Th>
                                            <Table.Th>Helmet Number</Table.Th>
                                            <Table.Th>Assigned Date</Table.Th>
                                            <Table.Th>Status</Table.Th>
                                            <Table.Th>Actions</Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {campaign.assignments.map((assignment) => (
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
                                                        {assignment.helmet?.helmet_code}
                                                    </Badge>
                                                </Table.Td>
                                                <Table.Td>
                                                    <Text size="sm">
                                                        {formatDate(assignment.assigned_at)}
                                                    </Text>
                                                </Table.Td>
                                                <Table.Td>
                                                    <Badge
                                                        color={
                                                            assignment.status === 'active' ? 'green' :
                                                                assignment.status === 'completed' ? 'blue' : 'red'
                                                        }
                                                    >
                                                        {assignment.status}
                                                    </Badge>
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
                                                                leftSection={<CheckCircleIcon size={14} />}
                                                                onClick={() => handleCompleteAssignment(assignment.id)}
                                                                disabled={assignment.status !== 'active'}
                                                            >
                                                                Mark Complete
                                                            </Menu.Item>
                                                            <Menu.Item
                                                                leftSection={<XCircleIcon size={14} />}
                                                                color="red"
                                                                onClick={() => handleRemoveAssignment(assignment.id)}
                                                                disabled={assignment.status === 'completed'}
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
                            ) : (
                                <Paper p="xl" className="text-center">
                                    <UsersIcon size={48} className="mx-auto text-gray-400 mb-4" />
                                    <Text size="lg" fw={500} mb="xs">No Riders Assigned Yet</Text>
                                    <Text size="sm" c="dimmed" mb="md">
                                        Start by assigning riders to this campaign
                                    </Text>
                                    {(campaign.status === 'paid' || campaign.status === 'active') && (
                                        <Button onClick={openAssignModal} leftSection={<UserPlusIcon size={16} />}>
                                            Assign First Rider
                                        </Button>
                                    )}
                                </Paper>
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
                                            <Text>Base Cost ({campaign.helmet_count} helmets × {campaign.current_cost.duration_days} days × KES {campaign.current_cost?.helmet_daily_rate})</Text>
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
                                <Text size="lg" fw={700} mb="md">Payment Status</Text>
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
                                                {formatCurrency((campaign.current_cost?.total_cost || 0) - (campaign.total_paid_amount || 0))}
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
                                    <Table>
                                        <Table.Thead>
                                            <Table.Tr>
                                                <Table.Th>Date</Table.Th>
                                                <Table.Th>Amount</Table.Th>
                                                <Table.Th>Method</Table.Th>
                                                <Table.Th>Reference Code</Table.Th>
                                                <Table.Th>Status</Table.Th>
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
                                                        <Badge variant="outline">{payment.mpesa_receipt}</Badge>
                                                    </Table.Td>
                                                    <Table.Td>
                                                        <Badge color={payment.status === 'completed' ? 'green' : 'yellow'}>
                                                            {payment.status}
                                                        </Badge>
                                                    </Table.Td>
                                                </Table.Tr>
                                            ))}
                                        </Table.Tbody>
                                    </Table>
                                </div>
                            )}
                        </Stack>
                    </Tabs.Panel>

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
                                    bullet={<DollarSignIcon size={12} />}
                                    title="Payment Initiated"
                                    color="yellow"
                                >
                                    <Text c="dimmed" size="sm">
                                        Campaign costs calculated and payment initiated
                                    </Text>
                                </Timeline.Item>
                            )}

                            {(campaign.status === 'paid' || campaign.status === 'active' || campaign.status === 'completed') && (
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
        </AuthenticatedLayout>
    );
}