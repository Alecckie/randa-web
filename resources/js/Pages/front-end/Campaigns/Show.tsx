import React, { useEffect, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
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
    Divider,
    Grid,
    Paper,
    Alert,
    ThemeIcon,
    ActionIcon,
    Menu,
    Drawer,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
    ArrowLeft,
    Calendar,
    MapPin,
    Users,
    DollarSign,
    FileText,
    Clock,
    CheckCircle,
    XCircle,
    PauseCircle,
    PlayCircle,
    Edit,
    MoreVertical,
    Download,
    AlertCircle,
    Info,
    Target,
    CreditCard,
    Eye,
    Palette,
    Receipt,
} from 'lucide-react';
import Sidebar from '@/Components/frontend/layouts/Sidebar';
import Header from '@/Components/frontend/layouts/Header';
import type { PageProps } from '@/types';
import { usePage } from '@inertiajs/react';
import { Advertiser } from '@/types/advertiser';
import MpesaPaymentModal from '@/Components/payments/MpesaPaymentModal';

interface CoverageArea {
    id: number;
    name: string;
    full_name?: string;
}

interface RiderDemographic {
    id: number;
    age_group: string;
    gender: string;
    rider_type: string;
}

interface CostBreakdown {
    helmet_count: number;
    duration_days: number;
    daily_rate: number;
    base_cost: number;
    includes_design: boolean;
    design_cost: number;
    subtotal: number;
    vat_rate: number;
    vat_amount: number;
    total_cost: number;
}

interface Payment {
    id: number;
    amount: number;
    payment_method: string;
    mpesa_receipt_number: string;
    status: string;
    created_at: string;
    completed_at: string | null;
}

interface Campaign {
    id: number;
    name: string;
    description: string;
    business_type: string;
    start_date: string;
    end_date: string;
    helmet_count: number;
    need_design: boolean;
    design_file: string | null;
    design_requirements: string | null;
    require_vat_receipt: boolean;
    special_instructions: string | null;
    status: string;
    payment_status: string;
    total_paid_amount: number;
    created_at: string;
    updated_at: string;
    advertiser: {
        id: number;
        company_name: string;
        user: {
            id: number;
            name: string;
            email: string;
        };
    };
    coverage_areas: CoverageArea[];
    rider_demographics: RiderDemographic[];
    current_cost: CostBreakdown;
    payments: Payment[];
    duration_days: number;
}

interface CampaignShowProps {
    campaign: Campaign;
    advertiser: Advertiser;
}

export default function Show({ campaign, advertiser }: CampaignShowProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeNav, setActiveNav] = useState('campaigns');
    const { auth } = usePage<PageProps>().props;
    const user = auth?.user;

    // Payment modal state
    const [paymentModalOpened, { open: openPaymentModal, close: closePaymentModal }] = useDisclosure(false);

    // Listen for payment updates via Echo
    useEffect(() => {
        if (!advertiser?.id || !campaign?.id) {
            return;
        }

        if (!window.Echo) {
            console.error('❌ Laravel Echo is not initialized');
            return;
        }

        const channelName = `payment.${advertiser.id}`;
        const channel = window.Echo.private(channelName);

        channel.subscribed(() => {
            console.log(`✅ Successfully subscribed to ${channelName} for campaign updates`);
        });

        channel.listen('.payment.status.updated', (event: any) => {
            console.log('💰 Payment status update received on campaign page:', event);

            // Reload campaign data when payment is successful
            if (event.status === 'success' && event.campaign_id === campaign.id) {
                console.log('🔄 Reloading campaign data after successful payment');
                router.reload({ only: ['campaign'] });
            }
        });

        channel.error((error: any) => {
            console.error('❌ Echo channel error:', error);
        });

        return () => {
            channel.stopListening('.payment.status.updated');
            window.Echo.leave(channelName);
        };
    }, [advertiser?.id, campaign?.id]);

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

    const calculateBalance = () => {
        return (campaign.current_cost?.total_cost || 0) - (campaign.total_paid_amount || 0);
    };

    const hasBalance = () => {
        return calculateBalance() > 0;
    };

    const handlePaymentSuccess = (paymentData: {
        payment_id: string;
        reference: string;
        mpesa_receipt: string;
    }) => {
        closePaymentModal();
        // Reload the page to show updated payment info
        router.reload({ only: ['campaign'] });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex">
            <Head title={`Campaign: ${campaign.name}`} />

            {/* Desktop Sidebar */}
            <div className="hidden lg:block w-64 fixed inset-y-0 left-0 z-30">
                <Sidebar user={user} activeNav={activeNav} onNavClick={setActiveNav} />
            </div>

            {/* Mobile Drawer */}
            <Drawer
                opened={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                size="280px"
                padding={0}
                withCloseButton={false}
            >
                <Sidebar user={user} activeNav={activeNav} onNavClick={setActiveNav} />
            </Drawer>

            {/* Main Content */}
            <div className="flex-1 lg:ml-64">
                {/* Header */}
                <Header 
                    onMenuClick={() => setSidebarOpen(true)} 
                    user={advertiser}
                    showCreateMenu={false}
                />

                {/* Page Content */}
                <div className="p-4 sm:p-6 lg:p-8 pb-12">
                    {/* Page Header */}
                    <div className="mb-8">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                            <div className="flex items-center gap-4">
                                <Button
                                    variant="subtle"
                                    leftSection={<ArrowLeft size={18} />}
                                    component={Link}
                                    href={route('my-campaigns.index')}
                                    size="md"
                                    className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                                >
                                    Back
                                </Button>
                                <div>
                                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                                        {campaign.name}
                                    </h1>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                        Campaign Details & Management
                                    </p>
                                </div>
                            </div>
                            <Group>
                                <Badge
                                    size="lg"
                                    color={getStatusColor(campaign?.status)}
                                    variant="light"
                                >
                                    {campaign?.status?.toUpperCase()?.replace('_', ' ')}
                                </Badge>
                                {campaign.status === 'draft' && (
                                    <Button
                                        component={Link}
                                        href={route('my-campaigns.edit', campaign.id)}
                                        leftSection={<Edit size={16} />}
                                        variant="light"
                                    >
                                        Edit
                                    </Button>
                                )}
                            </Group>
                        </div>

                        {/* Alert for pending actions */}
                        {(campaign.status === 'draft' || campaign.status === 'pending_payment') && hasBalance() && (
                            <Alert 
                                icon={<AlertCircle size={16} />} 
                                title="Payment Required" 
                                color="yellow"
                                className="mb-4"
                            >
                                <Stack gap="xs">
                                    <Text size="sm">
                                        This campaign requires payment to be activated. Outstanding balance: {formatCurrency(calculateBalance())}
                                    </Text>
                                    <Button
                                        onClick={openPaymentModal}
                                        size="sm"
                                        leftSection={<CreditCard size={16} />}
                                        color="yellow"
                                    >
                                        Pay Now
                                    </Button>
                                </Stack>
                            </Alert>
                        )}

                        {campaign.status === 'paid' && (
                            <Alert icon={<CheckCircle size={16} />} title="Payment Complete" color="green" className="mb-4">
                                Your campaign has been paid and is being processed. It will be activated shortly.
                            </Alert>
                        )}
                    </div>

                    {/* Overview Cards */}
                    <Grid gutter="md" className="mb-6">
                        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                            <Paper shadow="sm" p="md" className="bg-white dark:bg-gray-800">
                                <Group justify="apart">
                                    <div>
                                        <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                                            Duration
                                        </Text>
                                        <Text size="xl" fw={700}>
                                            {campaign.current_cost?.duration_days || campaign.duration_days} Days
                                        </Text>
                                    </div>
                                    <ThemeIcon size={48} radius="md" variant="light" color="blue">
                                        <Calendar size={24} />
                                    </ThemeIcon>
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
                                    <ThemeIcon size={48} radius="md" variant="light" color="green">
                                        <Target size={24} />
                                    </ThemeIcon>
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
                                    <ThemeIcon size={48} radius="md" variant="light" color="yellow">
                                        <DollarSign size={24} />
                                    </ThemeIcon>
                                </Group>
                            </Paper>
                        </Grid.Col>

                        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                            <Paper shadow="sm" p="md" className="bg-white dark:bg-gray-800">
                                <Group justify="apart">
                                    <div>
                                        <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                                            Balance Due
                                        </Text>
                                        <Text size="xl" fw={700} c={hasBalance() ? 'red' : 'green'}>
                                            {formatCurrency(calculateBalance())}
                                        </Text>
                                    </div>
                                    <ThemeIcon size={48} radius="md" variant="light" color={hasBalance() ? 'red' : 'green'}>
                                        <Receipt size={24} />
                                    </ThemeIcon>
                                </Group>
                            </Paper>
                        </Grid.Col>
                    </Grid>

                    {/* Payment Progress */}
                    {campaign.current_cost && (
                        <Card className="bg-white dark:bg-gray-800 mb-6">
                            <Stack gap="md">
                                <Group justify="apart">
                                    <div>
                                        <Text size="lg" fw={700}>Payment Progress</Text>
                                        <Text size="sm" c="dimmed">
                                            {formatCurrency(campaign.total_paid_amount || 0)} of {formatCurrency(campaign.current_cost.total_cost)} paid
                                        </Text>
                                    </div>
                                    {hasBalance() && (
                                        <Button
                                            leftSection={<CreditCard size={16} />}
                                            onClick={openPaymentModal}
                                            gradient={{ from: 'green', to: 'teal', deg: 45 }}
                                            variant="gradient"
                                        >
                                            Pay Balance
                                        </Button>
                                    )}
                                </Group>
                                <Progress
                                    value={((campaign.total_paid_amount || 0) / campaign.current_cost.total_cost) * 100}
                                    size="xl"
                                    radius="xl"
                                    color={hasBalance() ? 'yellow' : 'green'}
                                />
                            </Stack>
                        </Card>
                    )}

                    {/* Tabs for detailed information */}
                    <Tabs defaultValue="details" className="bg-white dark:bg-gray-800 rounded-lg">
                        <Tabs.List>
                            <Tabs.Tab value="details" leftSection={<FileText size={16} />}>
                                Campaign Details
                            </Tabs.Tab>
                            <Tabs.Tab value="financials" leftSection={<DollarSign size={16} />}>
                                Financials
                            </Tabs.Tab>
                            <Tabs.Tab value="timeline" leftSection={<Clock size={16} />}>
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
                                                <Text size="sm" c="dimmed">Business Type</Text>
                                                <Badge variant="light" size="lg">
                                                    {campaign.business_type?.replace('_', ' ').toUpperCase() || 'N/A'}
                                                </Badge>
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
                                                    <ThemeIcon size={40} radius="md" variant="light" color="green">
                                                        <Calendar size={20} />
                                                    </ThemeIcon>
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
                                                    <ThemeIcon size={40} radius="md" variant="light" color="red">
                                                        <Calendar size={20} />
                                                    </ThemeIcon>
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
                                                leftSection={<MapPin size={14} />}
                                            >
                                                {area.full_name || area.name}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>

                                <Divider />

                                {/* Target Demographics */}
                                {campaign.rider_demographics && campaign.rider_demographics.length > 0 && (
                                    <>
                                        <div>
                                            <Text size="lg" fw={700} mb="md">Target Rider Demographics</Text>
                                            <Grid gutter="md">
                                                <Grid.Col span={{ base: 12, sm: 4 }}>
                                                    <Paper p="md" withBorder>
                                                        <Text size="sm" c="dimmed" mb="xs">Age Groups</Text>
                                                        <div className="flex flex-wrap gap-1">
                                                            {[...new Set(campaign.rider_demographics.map(d => d.age_group))].map((age, idx) => (
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
                                                            {[...new Set(campaign.rider_demographics.map(d => d.gender))].map((gender, idx) => (
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
                                                            {[...new Set(campaign.rider_demographics.map(d => d.rider_type))].map((type, idx) => (
                                                                <Badge key={idx} variant="light" color="green">
                                                                    {type}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    </Paper>
                                                </Grid.Col>
                                            </Grid>
                                        </div>
                                        <Divider />
                                    </>
                                )}

                                {/* Design Requirements */}
                                <div>
                                    <Text size="lg" fw={700} mb="md">Design Information</Text>
                                    <Paper p="md" withBorder>
                                        <Stack gap="sm">
                                            <Group>
                                                <ThemeIcon size={40} radius="md" variant="light" color="purple">
                                                    <Palette size={20} />
                                                </ThemeIcon>
                                                <div>
                                                    <Text fw={500}>
                                                        {campaign.need_design ? 'Design Service Requested' : 'Design File Provided'}
                                                    </Text>
                                                    <Text size="sm" c="dimmed">
                                                        {campaign.need_design 
                                                            ? 'Our team will create the design based on your requirements' 
                                                            : 'You have uploaded your own design file'}
                                                    </Text>
                                                </div>
                                            </Group>
                                            {campaign.design_requirements && (
                                                <div>
                                                    <Text size="sm" c="dimmed" mb="xs">Design Requirements</Text>
                                                    <Text size="sm">{campaign.design_requirements}</Text>
                                                </div>
                                            )}
                                            {campaign.design_file && (
                                                <Button 
                                                    variant="light" 
                                                    size="sm" 
                                                    leftSection={<Download size={14} />}
                                                    component="a"
                                                    href={`/storage/${campaign.design_file}`}
                                                    target="_blank"
                                                >
                                                    Download Design File
                                                </Button>
                                            )}
                                        </Stack>
                                    </Paper>
                                </div>

                                {/* Special Instructions */}
                                {campaign.special_instructions && (
                                    <>
                                        <Divider />
                                        <div>
                                            <Text size="lg" fw={700} mb="md">Special Instructions</Text>
                                            <Paper p="md" withBorder>
                                                <Text>{campaign.special_instructions}</Text>
                                            </Paper>
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
                                                <Text>Base Cost ({campaign.helmet_count} helmets × {campaign.current_cost?.duration_days} days × KES {campaign.current_cost?.daily_rate})</Text>
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
                                            {campaign.require_vat_receipt && (
                                                <Group justify="apart">
                                                    <Text>VAT ({campaign.current_cost?.vat_rate}%)</Text>
                                                    <Text fw={500}>{formatCurrency(campaign.current_cost?.vat_amount || 0)}</Text>
                                                </Group>
                                            )}
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
                                                    {campaign.payment_status?.replace('_', ' ').toUpperCase() || 'UNPAID'}
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
                                                <Text fw={500} c={hasBalance() ? 'red' : 'green'}>
                                                    {formatCurrency(calculateBalance())}
                                                </Text>
                                            </Group>
                                            <Progress
                                                value={((campaign.total_paid_amount || 0) / (campaign.current_cost?.total_cost || 1)) * 100}
                                                color={hasBalance() ? 'yellow' : 'green'}
                                                size="lg"
                                                radius="xl"
                                            />
                                            {hasBalance() && (
                                                <Button
                                                    onClick={openPaymentModal}
                                                    fullWidth
                                                    size="lg"
                                                    leftSection={<CreditCard size={18} />}
                                                    gradient={{ from: 'green', to: 'teal', deg: 45 }}
                                                    variant="gradient"
                                                >
                                                    Pay Balance - {formatCurrency(calculateBalance())}
                                                </Button>
                                            )}
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
                                                    <Table.Th>Receipt Number</Table.Th>
                                                    <Table.Th>Status</Table.Th>
                                                </Table.Tr>
                                            </Table.Thead>
                                            <Table.Tbody>
                                                {campaign.payments.map((payment) => (
                                                    <Table.Tr key={payment.id}>
                                                        <Table.Td>{formatDate(payment.created_at)}</Table.Td>
                                                        <Table.Td>{formatCurrency(payment.amount)}</Table.Td>
                                                        <Table.Td>
                                                            <Badge variant="outline">{payment.payment_method.toUpperCase()}</Badge>
                                                        </Table.Td>
                                                        <Table.Td>
                                                            <Badge variant="outline">{payment.mpesa_receipt_number || 'N/A'}</Badge>
                                                        </Table.Td>
                                                        <Table.Td>
                                                            <Badge color={payment.status === 'completed' ? 'green' : payment.status === 'pending_verification' ? 'yellow' : 'gray'}>
                                                                {payment.status.replace('_', ' ').toUpperCase()}
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
                                    bullet={<FileText size={12} />}
                                    title="Campaign Created"
                                >
                                    <Text c="dimmed" size="sm">
                                        Campaign was created and saved
                                    </Text>
                                    <Text size="xs" mt={4}>
                                        {formatDate(campaign.created_at)}
                                    </Text>
                                </Timeline.Item>

                                {campaign.status !== 'draft' && (
                                    <Timeline.Item
                                        bullet={<DollarSign size={12} />}
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
                                        bullet={<CheckCircle size={12} />}
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
                                        bullet={<PlayCircle size={12} />}
                                        title="Campaign Activated"
                                        color="blue"
                                    >
                                        <Text c="dimmed" size="sm">
                                            Campaign went live
                                        </Text>
                                        <Text size="xs" mt={4}>
                                            {formatDate(campaign.start_date)}
                                        </Text>
                                    </Timeline.Item>
                                )}

                                {campaign.status === 'completed' && (
                                    <Timeline.Item
                                        bullet={<CheckCircle size={12} />}
                                        title="Campaign Completed"
                                        color="green"
                                    >
                                        <Text c="dimmed" size="sm">
                                            Campaign successfully completed
                                        </Text>
                                        <Text size="xs" mt={4}>
                                            {formatDate(campaign.end_date)}
                                        </Text>
                                    </Timeline.Item>
                                )}

                                {campaign.status === 'paused' && (
                                    <Timeline.Item
                                        bullet={<PauseCircle size={12} />}
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
                                        bullet={<XCircle size={12} />}
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
            </div>

            {/* Payment Modal */}
            {campaign.current_cost && advertiser.id && hasBalance() && (
                <MpesaPaymentModal
                    opened={paymentModalOpened}
                    onClose={closePaymentModal}
                    costBreakdown={{
                        helmet_count: campaign.current_cost.helmet_count,
                        duration_days: campaign.current_cost.duration_days,
                        daily_rate: campaign.current_cost.daily_rate,
                        base_cost: campaign.current_cost.base_cost,
                        design_cost: campaign.current_cost.design_cost,
                        subtotal: campaign.current_cost.subtotal,
                        vat_amount: campaign.current_cost.vat_amount,
                        total_cost: calculateBalance(), 
                        currency: 'KES'
                    }}
                    advertiserId={advertiser.id}
                    campaignId={campaign.id}
                    campaignData={{
                        name: campaign.name,
                        helmet_count: campaign.helmet_count,
                        duration: campaign.current_cost.duration_days
                    }}
                    onPaymentSuccess={handlePaymentSuccess}
                />
            )}
        </div>
    );
}