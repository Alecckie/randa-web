import { useEffect, useState } from 'react';
import { formatCurrency, formatDate } from '@/utils/formatting';
import { getCampaignStatusColor, getPaymentStatusColor } from '@/utils/status';
import { calculateBalance, hasBalance, calculatePaymentProgress } from '@/utils/calculations';
import { Link, router } from '@inertiajs/react';
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
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
    ArrowLeft,
    Calendar,
    MapPin,
    Users,
    Banknote,
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
    BarChart2,
    Bike,
    Zap,
} from 'lucide-react';
import { Advertiser } from '@/types/advertiser';
import MpesaPaymentModal from '@/Components/payments/MpesaPaymentModal';
import AdvertiserLayout from '@/Layouts/AdvertiserLayout';

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
    status_message?: string | null;
    created_at: string;
    completed_at: string | null;
}

interface Campaign {
    id: number;
    campaign_number: string;
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
    helmets_returned_count?: number;
}

interface CampaignShowProps {
    campaign: Campaign;
    advertiser: Advertiser;
}

export default function Show({ campaign, advertiser }: CampaignShowProps) {

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

    const getStatusColor = getCampaignStatusColor;
    const getStatusColorPayment = getPaymentStatusColor;
    const campaignBalance = () => calculateBalance(campaign.current_cost?.total_cost, campaign.total_paid_amount);
    const campaignHasBalance = () => hasBalance(campaign.current_cost?.total_cost, campaign.total_paid_amount);
    // Don't nag for payment again if a receipt has already been submitted and is awaiting admin review.
    const needsPayment = (campaign.status === 'draft' || campaign.status === 'submitted')
        && campaignHasBalance()
        && campaign.payment_status !== 'pending_verification';
    const rejectedPayment = campaign.payment_status === 'rejected'
        ? [...campaign.payments].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
        : null;
    const rejectionReason = rejectedPayment?.status_message?.replace(/^Rejected:\s*/, '') || null;

    // Force the advertiser straight to payment when they land on an unpaid campaign.
    // Only fires once on load — closing the modal lets them keep browsing the page.
    useEffect(() => {
        if (needsPayment) {
            openPaymentModal();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handlePaymentSuccess = (paymentData: {
        payment_id: string;
        reference: string;
        mpesa_receipt: string;
    }) => {
        closePaymentModal();
        // Reload the page to show updated payment info
        router.reload({ only: ['campaign'] });
    };

    // ── Campaign journey helpers ───────────────────────────────────────────────
    type JourneyStep = 'done' | 'active' | 'pending' | 'cancelled';

    function journeySteps(status: string, paymentStatus?: string): JourneyStep[] {
        // [created, paid, riders_assigned, live, done]
        // Campaign lifecycle (status) and payment (paymentStatus) are
        // independent — a 'submitted' campaign can be unpaid, pending
        // verification, rejected, or paid, so the "paid" step needs both.
        if (status === 'cancelled') {
            return ['done', 'cancelled', 'cancelled', 'cancelled', 'cancelled'];
        }
        if (status === 'completed') {
            return ['done', 'done', 'done', 'done', 'done'];
        }
        if (status === 'active' || status === 'paused') {
            return ['done', 'done', 'done', 'active', 'pending'];
        }
        if (status === 'submitted') {
            return paymentStatus === 'paid'
                ? ['done', 'done', 'active', 'pending', 'pending']
                : ['done', 'active', 'pending', 'pending', 'pending'];
        }
        // draft
        return ['active', 'pending', 'pending', 'pending', 'pending'];
    }

    const stepLabels = [
        { label: 'Campaign Created',     icon: FileText },
        { label: 'Payment Complete',     icon: CheckCircle },
        { label: 'Riders Being Assigned', icon: Bike },
        { label: 'Campaign Live',        icon: Zap },
        { label: 'Completed',            icon: CheckCircle },
    ];

    const steps = journeySteps(campaign.status, campaign.payment_status);

    return (
        <AdvertiserLayout title={`Campaign: ${campaign.name}`} activeNav="campaigns">
            <div className="pb-12">
                {/* ── Page Header ── */}
                <div className="flex items-center gap-3 mb-6">
                    <Button
                        variant="subtle"
                        leftSection={<ArrowLeft size={16} />}
                        component={Link}
                        href={route('my-campaigns.index')}
                        size="sm"
                        className="text-gray-500 hover:text-gray-800"
                    >
                        My Campaigns
                    </Button>
                </div>

                <div className="mb-8">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                        <div>
                            <Group gap="sm" align="center">
                                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                                    {campaign.name}
                                </h1>
                                <Badge size="lg" color={getStatusColorPayment(campaign.payment_status)}>
                                    {campaign.payment_status?.replace('_', ' ').toUpperCase() || 'UNPAID'}
                                </Badge>
                            </Group>
                            <p className="text-sm text-gray-500 mt-1">
                                <Text component="span" fw={600} className="text-gray-700 dark:text-gray-300">{campaign.campaign_number}</Text>
                                {' '}&middot; {campaign.business_type?.replace('_', ' ')} &middot; Started {formatDate(campaign.start_date)}
                            </p>
                        </div>
                        <Group>
                            {needsPayment && (
                                <Button
                                    onClick={openPaymentModal}
                                    size="lg"
                                    leftSection={<CreditCard size={18} />}
                                    color="orange"
                                    variant="filled"
                                >
                                    Pay Now — {formatCurrency(campaignBalance())}
                                </Button>
                            )}
                            {campaign.status === 'draft' && (
                                <Button
                                    component={Link}
                                    href={route('my-campaigns.edit', campaign.id)}
                                    leftSection={<Edit size={16} />}
                                    variant="light"
                                >
                                    Edit Campaign
                                </Button>
                            )}
                            {(campaign.status === 'active' || campaign.status === 'completed') && (
                                <Button
                                    component={Link}
                                    href={route('advertiser.analytics', { campaign: campaign.id })}
                                    leftSection={<BarChart2 size={16} />}
                                    color="orange"
                                    variant="filled"
                                >
                                    View Analytics
                                </Button>
                            )}
                        </Group>
                    </div>

                    {/* ── Campaign Journey ── */}
                    <Paper shadow="sm" p="xl" radius="lg" className="bg-white dark:bg-gray-800 mb-6">
                        <Text size="sm" fw={600} c="dimmed" tt="uppercase" mb="lg" style={{ letterSpacing: '0.05em' }}>
                            Campaign Progress
                        </Text>

                        {/* Step track */}
                        <div className="relative">
                            {/* Connecting line */}
                            <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 dark:bg-gray-700 mx-8 hidden sm:block" />

                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 sm:gap-2 relative">
                                {stepLabels.map((step, i) => {
                                    const state = steps[i];
                                    const Icon = step.icon;
                                    return (
                                        <div key={i} className="flex flex-col items-center text-center gap-2 relative">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 flex-shrink-0 transition-all ${
                                                state === 'done'      ? 'bg-green-500 text-white shadow-md' :
                                                state === 'active'    ? 'bg-[#f79122] text-white shadow-md ring-4 ring-orange-100' :
                                                state === 'cancelled' ? 'bg-red-400 text-white' :
                                                                        'bg-gray-200 text-gray-400 dark:bg-gray-700'
                                            }`}>
                                                {state === 'done' ? (
                                                    <CheckCircle size={18} />
                                                ) : state === 'cancelled' ? (
                                                    <XCircle size={18} />
                                                ) : (
                                                    <Icon size={18} />
                                                )}
                                            </div>
                                            <div>
                                                <Text
                                                    size="xs"
                                                    fw={state === 'active' ? 700 : 500}
                                                    c={state === 'active' ? '#f79122' : state === 'done' ? 'green' : state === 'cancelled' ? 'red' : 'dimmed'}
                                                >
                                                    {step.label}
                                                </Text>
                                                {state === 'active' && campaign.status !== 'cancelled' && (
                                                    <Text size="xs" c="dimmed" mt={2}>Now</Text>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Contextual message for current step */}
                        <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-700">
                            {campaign.status === 'draft' && (
                                <Alert icon={<Info size={16} />} color="gray" variant="light">
                                    Your campaign is saved as a draft. Complete payment to get it started.
                                </Alert>
                            )}
                            {rejectionReason && (
                                <Alert icon={<XCircle size={16} />} color="red" title="Payment Rejected" mt="sm">
                                    <Text size="sm">
                                        Your last payment submission was rejected. Reason: <strong>{rejectionReason}</strong>.
                                        Please review and submit a new payment below.
                                    </Text>
                                </Alert>
                            )}
                            {needsPayment && (
                                <Alert icon={<AlertCircle size={16} />} color="yellow" title="Action Required: Complete Payment" mt="sm">
                                    <Text size="sm" mb="sm">
                                        Outstanding balance: <strong>{formatCurrency(campaignBalance())}</strong>. Pay now to activate your campaign.
                                    </Text>
                                    <Button onClick={openPaymentModal} size="sm" leftSection={<CreditCard size={14} />} color="orange">
                                        Pay Now — {formatCurrency(campaignBalance())}
                                    </Button>
                                </Alert>
                            )}
                            {campaign.payment_status === 'pending_verification' && (
                                <Alert icon={<Clock size={16} />} color="blue" title="Payment Submitted — Awaiting Verification" mt="sm">
                                    <Text size="sm">
                                        We've received your M-Pesa receipt and it's pending admin review. This usually takes under 1 business hour —
                                        no need to pay again in the meantime.
                                    </Text>
                                </Alert>
                            )}
                            {campaign.status === 'submitted' && campaign.payment_status === 'paid' && (
                                <Alert icon={<Bike size={16} />} color="blue" title="We're Getting Your Riders Ready">
                                    <Text size="sm">
                                        Payment received — thank you! Our team is now assigning riders and helmets to your campaign.
                                        This usually takes <strong>1–2 business days</strong>. You'll see your campaign go live once riders are assigned.
                                    </Text>
                                </Alert>
                            )}
                            {campaign.status === 'active' && (
                                <Alert icon={<Zap size={16} />} color="green" title="Your Campaign is Live!">
                                    <Stack gap="xs">
                                        <Text size="sm">
                                            Riders are out there right now displaying your brand across Nairobi. Check your analytics to see real-time impressions and reach.
                                        </Text>
                                        <Button
                                            component={Link}
                                            href={route('advertiser.analytics', { campaign: campaign.id })}
                                            size="sm"
                                            leftSection={<BarChart2 size={14} />}
                                            color="green"
                                        >
                                            View Live Analytics
                                        </Button>
                                    </Stack>
                                </Alert>
                            )}
                            {campaign.status === 'paused' && (
                                <Alert icon={<PauseCircle size={16} />} color="orange" title="Campaign Paused">
                                    <Text size="sm">Your campaign has been temporarily paused. Contact us if you have questions.</Text>
                                </Alert>
                            )}
                            {campaign.status === 'completed' && (
                                <Alert icon={<CheckCircle size={16} />} color="green" title="Campaign Complete — Great Work!">
                                    <Stack gap="xs">
                                        <Text size="sm">
                                            Your campaign has wrapped up successfully. View your full analytics report to see the total reach and impressions delivered.
                                        </Text>
                                        <Button
                                            component={Link}
                                            href={route('advertiser.analytics', { campaign: campaign.id })}
                                            size="sm"
                                            leftSection={<BarChart2 size={14} />}
                                            color="green"
                                        >
                                            View Full Report
                                        </Button>
                                    </Stack>
                                </Alert>
                            )}
                            {campaign.status === 'cancelled' && (
                                <Alert icon={<XCircle size={16} />} color="red" title="Campaign Cancelled">
                                    <Text size="sm">This campaign was cancelled. Contact us if you believe this is an error.</Text>
                                </Alert>
                            )}
                        </div>
                    </Paper>
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
                                        <Banknote size={24} />
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
                                        <Text size="xl" fw={700} c={campaignHasBalance() ? 'red' : 'green'}>
                                            {formatCurrency(campaignBalance())}
                                        </Text>
                                    </div>
                                    <ThemeIcon size={48} radius="md" variant="light" color={campaignHasBalance() ? 'red' : 'green'}>
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
                                    {campaignHasBalance() && (
                                        <Button
                                            leftSection={<CreditCard size={16} />}
                                            onClick={openPaymentModal}
                                            variant="filled"
                                            color="orange"
                                        >
                                            Pay Balance
                                        </Button>
                                    )}
                                </Group>
                                <Progress
                                    value={calculatePaymentProgress(campaign.total_paid_amount, campaign.current_cost.total_cost)}
                                    size="xl"
                                    radius="xl"
                                    color={campaignHasBalance() ? 'yellow' : 'green'}
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
                            <Tabs.Tab value="financials" leftSection={<Banknote size={16} />}>
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
                                                <Badge size="lg" color={getStatusColorPayment(campaign.payment_status)}>
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
                                                <Text fw={500} c={campaignHasBalance() ? 'red' : 'green'}>
                                                    {formatCurrency(campaignBalance())}
                                                </Text>
                                            </Group>
                                            <Progress
                                                value={calculatePaymentProgress(campaign.total_paid_amount, campaign.current_cost?.total_cost)}
                                                color={campaignHasBalance() ? 'yellow' : 'green'}
                                                size="lg"
                                                radius="xl"
                                            />
                                            {campaignHasBalance() && (
                                                <Button
                                                    onClick={openPaymentModal}
                                                    fullWidth
                                                    size="lg"
                                                    leftSection={<CreditCard size={18} />}
                                                    variant="filled"
                                                    color="orange"
                                                >
                                                    Pay Balance - {formatCurrency(campaignBalance())}
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
                                        bullet={<Banknote size={12} />}
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

                                {campaign.status === 'completed' && !!campaign.helmets_returned_count && (
                                    <Timeline.Item
                                        bullet={<Bike size={12} />}
                                        title="Helmets Returned"
                                        color="green"
                                    >
                                        <Text c="dimmed" size="sm">
                                            {campaign.helmets_returned_count} helmet{campaign.helmets_returned_count === 1 ? '' : 's'} returned to the pool. Riders have been notified to drop them off.
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

            {/* Payment Modal */}
            {campaign.current_cost && advertiser.id && campaignHasBalance() && (
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
                        total_cost: campaignBalance(),
                        currency: 'KES'
                    }}
                    advertiserId={advertiser.id}
                    campaignId={campaign.id}
                    campaignNumber={campaign.campaign_number}
                    campaignData={{
                        name: campaign.name,
                        helmet_count: campaign.helmet_count,
                        duration: campaign.current_cost.duration_days
                    }}
                    onPaymentSuccess={handlePaymentSuccess}
                />
            )}
        </AdvertiserLayout>
    );
}