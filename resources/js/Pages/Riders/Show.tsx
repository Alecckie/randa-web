import { useState, useEffect } from 'react';
import axios from 'axios';
import { getPersonStatusColor } from '@/utils/status';
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
    Image,
    Tabs,
    Alert,
    ActionIcon,
    Menu,
    Modal,
    Avatar,
    Divider,
    Paper,
    Timeline,
    Tooltip,
    Textarea,
    Table,
    Loader,
    rem
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { showSuccessToast, showErrorToast } from '@/utils/toast';
import {
    ArrowLeft,
    Download,
    Printer,
    Edit,
    Phone,
    Mail,
    MapPin,
    CreditCard,
    User,
    Calendar,
    Clock,
    CheckCircle,
    XCircle,
    AlertTriangle,
    FileText,
    Image as ImageIcon,
    MoreHorizontal,
    Eye,
    ThumbsUp,
    ThumbsDown,
    Navigation,
    Home,
    Building2,
    Globe
} from 'lucide-react';

// Props interface
interface RiderShowProps {
    rider: {
        id: number;
        rider_number?: string;
        status: 'pending' | 'approved' | 'rejected';
        national_id: string;
        mpesa_number: string;
        next_of_kin_name: string;
        next_of_kin_phone: string;
        daily_rate: string;
        wallet_balance: string;
        signed_agreement: string;
        location_last_updated: string;
        location_changes_count: number;
        created_at: string;
        updated_at: string;
        national_id_front_photo?: string;
        national_id_back_photo?: string;
        passport_photo?: string;
        good_conduct_certificate?: string;
        motorbike_license?: string;
        motorbike_registration?: string;
        user: {
            id: number;
            name: string;
            first_name: string;
            last_name: string;
            email: string;
            phone: string;
        };
        currentAssignment?: {
            id: number;
            campaign: {
                id: number;
                name: string;
            };
            assigned_at: string;
        };
        current_location?: {
            id: number;
            stage_name: string;
            latitude?: string;
            longitude?: string;
            effective_from: string;
            notes?: string;
            county: {
                id: number;
                name: string;
            };
            subcounty: {
                id: number;
                name: string;
            };
            ward: {
                id: number;
                name: string;
            };
        };
        rejectionReasons?: Array<{
            id: number;
            reason: string;
            rejected_by: {
                name: string;
            };
            created_at: string;
        }>;
    };
    tripStats: {
        total_check_ins: number;
        completed_check_ins: number;
        total_earnings: string;
        total_hours_worked: number;
        this_month_check_ins: number;
        this_month_earnings: string;
        average_hours_per_day: number;
    };
    activityTimeline: Array<{
        type: string;
        title: string;
        description: string;
        timestamp: string;
        time_human: string;
    }>;
}

const ACTIVITY_ICONS: Record<string, { icon: typeof User; color: string }> = {
    application_submitted: { icon: User, color: 'gray' },
    application_approved: { icon: CheckCircle, color: 'green' },
    application_rejected: { icon: XCircle, color: 'red' },
    campaign_assigned: { icon: MapPin, color: 'blue' },
    campaign_assignment_completed: { icon: CheckCircle, color: 'teal' },
    shift_started: { icon: Clock, color: 'green' },
    shift_ended: { icon: CheckCircle, color: 'gray' },
    shift_auto_closed: { icon: AlertTriangle, color: 'orange' },
};

export default function RiderShow({ rider, tripStats, activityTimeline }: RiderShowProps) {
    const [activeTab, setActiveTab] = useState('overview');
    const [imageModalOpened, { open: openImageModal, close: closeImageModal }] = useDisclosure(false);
    const [rejectModalOpened, { open: openRejectModal, close: closeRejectModal }] = useDisclosure(false);
    const [selectedImage, setSelectedImage] = useState<{ src: string; title: string } | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [payoutSummary, setPayoutSummary] = useState<{
        total_hours_worked: number;
        total_earning: number;
        total_owed: number;
        total_settled: number;
        days: Array<{
            date: string;
            worked_hours: number;
            daily_earning: number;
            max_possible_earning: number;
            qualified: boolean;
            settled: boolean;
        }>;
    } | null>(null);
    const [payoutLoading, setPayoutLoading] = useState(true);

    useEffect(() => {
        axios
            .get(`/riders/${rider.id}/payout-audit`, { params: { from: '2020-01-01', to: new Date().toISOString().slice(0, 10) } })
            .then((res) => { if (res.data.success) setPayoutSummary(res.data.data); })
            .catch(() => { /* table just stays empty */ })
            .finally(() => setPayoutLoading(false));
    }, [rider.id]);

    const getStatusColor = getPersonStatusColor;

    const getStatusIcon = (status: string) => {
        const icons = {
            pending: <Clock size={14} />,
            approved: <CheckCircle size={14} />,
            rejected: <XCircle size={14} />,
        };
        return icons[status as keyof typeof icons];
    };

    const handleImageView = (src: string, title: string) => {
        setSelectedImage({ src, title });
        openImageModal();
    };

    const handlePrint = () => {
        window.print();
    };

    const handleDownloadPDF = () => {
        console.log('Download PDF functionality to be implemented');
    };

    const handleApprove = () => {
        setLoading(true);
        router.patch(route('rider.approve', rider.id), {}, {
            onSuccess: () => showSuccessToast('Rider approved successfully'),
            onError: () => showErrorToast('Failed to approve rider'),
            onFinish: () => setLoading(false),
        });
    };

    const handleReject = () => {
        if (!rejectionReason.trim()) {
            showErrorToast('Please provide a reason for rejection');
            return;
        }

        setLoading(true);
        router.patch(route('rider.reject', rider.id), {
            reason: rejectionReason
        }, {
            onSuccess: () => {
                showSuccessToast('Rider rejected successfully');
                closeRejectModal();
                setRejectionReason('');
            },
            onError: () => showErrorToast('Failed to reject rider'),
            onFinish: () => setLoading(false),
        });
    };

    const documents = [
        { key: 'national_id_front_photo', label: 'National ID - Front', file: rider.national_id_front_photo },
        { key: 'national_id_back_photo', label: 'National ID - Back', file: rider.national_id_back_photo },
        { key: 'passport_photo', label: 'Passport Photo', file: rider.passport_photo },
        { key: 'good_conduct_certificate', label: 'Good Conduct Certificate', file: rider.good_conduct_certificate },
        { key: 'motorbike_license', label: 'Motorbike License', file: rider.motorbike_license },
        { key: 'motorbike_registration', label: 'Motorbike Registration', file: rider.motorbike_registration },
    ];

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center space-x-4">
                        <Button
                            variant="subtle"
                            leftSection={<ArrowLeft size={16} />}
                            component={Link}
                            href={route('riders.index')}
                        >
                            Back to Riders
                        </Button>
                        <div>
                            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                                Rider Details
                            </h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {rider.rider_number && <span className="font-semibold text-gray-700 dark:text-gray-300">{rider.rider_number} &middot; </span>}
                                View complete rider information and documents
                            </p>
                        </div>
                    </div>
                    <Group>
                        {rider.status === 'pending' && (
                            <>
                                <Button
                                    color="green"
                                    leftSection={<ThumbsUp size={16} />}
                                    onClick={handleApprove}
                                    loading={loading}
                                >
                                    Approve
                                </Button>
                                <Button
                                    color="red"
                                    variant="outline"
                                    leftSection={<ThumbsDown size={16} />}
                                    onClick={openRejectModal}
                                    loading={loading}
                                >
                                    Reject
                                </Button>
                            </>
                        )}
                        <Button
                            variant="light"
                            leftSection={<Printer size={16} />}
                            onClick={handlePrint}
                        >
                            Print
                        </Button>
                        <Button
                            variant="filled"
                            leftSection={<Download size={16} />}
                            onClick={handleDownloadPDF}
                        >
                            Download PDF
                        </Button>
                        <Menu shadow="md" width={200}>
                            <Menu.Target>
                                <ActionIcon variant="light" size="lg">
                                    <MoreHorizontal size={18} />
                                </ActionIcon>
                            </Menu.Target>
                            <Menu.Dropdown>
                                <Menu.Item
                                    leftSection={<Edit size={14} />}
                                    component={Link}
                                    href={route('riders.edit', rider.id)}
                                >
                                    Edit Rider
                                </Menu.Item>
                            </Menu.Dropdown>
                        </Menu>
                    </Group>
                </div>
            }
        >
            <Head title={`Rider - ${rider.user.name}`} />

            <div className="space-y-6">
                {/* Header Card with Basic Info */}
                <Card className="bg-white dark:bg-gray-800">
                    <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1">
                            <Avatar
                                src={rider.passport_photo ? `/storage/${rider.passport_photo}` : undefined}
                                size={80}
                                radius="md"
                                className="border-2 border-gray-200 dark:border-gray-600"
                            >
                                <User size={32} />
                            </Avatar>

                            <div className="flex-1">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                                    <Text size="xl" fw={700} className="text-gray-900 dark:text-white">
                                        {rider.user.name}

                                    </Text>
                                    <Badge
                                        color={getStatusColor(rider.status)}
                                        leftSection={getStatusIcon(rider.status)}
                                        variant="light"
                                        size="lg"
                                    >
                                        {rider.status.charAt(0).toUpperCase() + rider.status.slice(1)}
                                    </Badge>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                        <User size={14} />
                                        <span>ID: {rider.national_id}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                        <Phone size={14} />
                                        <span>{rider.user.phone}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                        <Mail size={14} />
                                        <span>{rider.user.email}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                        <Calendar size={14} />
                                        <span>Joined {new Date(rider.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Earnings Breakdown */}
                <Card withBorder radius="md" p="lg">
                    <Group justify="space-between" mb="md">
                        <Text fw={600} size="lg">Earnings Breakdown</Text>
                        {payoutSummary && payoutSummary.total_owed > 0 && (
                            <Badge color="orange" size="lg" variant="light">
                                KSh {payoutSummary.total_owed.toFixed(2)} owed
                            </Badge>
                        )}
                    </Group>

                    {payoutLoading ? (
                        <Group justify="center" py="xl"><Loader size="sm" /></Group>
                    ) : payoutSummary && payoutSummary.days.length > 0 ? (
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
                                    {payoutSummary.days.map((day) => (
                                        <Table.Tr key={day.date}>
                                            <Table.Td>{new Date(day.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</Table.Td>
                                            <Table.Td ta="right">{day.worked_hours.toFixed(2)}h</Table.Td>
                                            <Table.Td ta="right">
                                                <Text span c="dimmed">KSh </Text>
                                                <Text span fw={600} c="green">{day.daily_earning.toFixed(2)}</Text>
                                                <Text span c="dimmed"> / {day.max_possible_earning.toFixed(2)}</Text>
                                            </Table.Td>
                                            <Table.Td ta="right">
                                                <Badge
                                                    size="sm"
                                                    color={!day.qualified ? 'gray' : day.settled ? 'blue' : 'yellow'}
                                                    variant="light"
                                                >
                                                    {!day.qualified ? 'Below minimum' : day.settled ? 'Settled' : 'Pending'}
                                                </Badge>
                                            </Table.Td>
                                        </Table.Tr>
                                    ))}
                                </Table.Tbody>
                                <Table.Tfoot>
                                    <Table.Tr>
                                        <Table.Th>Total</Table.Th>
                                        <Table.Th ta="right">{payoutSummary.total_hours_worked.toFixed(2)}h</Table.Th>
                                        <Table.Th ta="right">
                                            <Text span c="dimmed" fw={400}>KSh </Text>
                                            <Text span c="green">{payoutSummary.total_earning.toFixed(2)}</Text>
                                            <Text span c="dimmed" fw={400}>
                                                {' / '}
                                                {payoutSummary.days.reduce((sum, d) => sum + d.max_possible_earning, 0).toFixed(2)}
                                            </Text>
                                        </Table.Th>
                                        <Table.Th ta="right">
                                            {payoutSummary.total_owed > 0
                                                ? `KSh ${payoutSummary.total_owed.toFixed(2)} owed`
                                                : 'All settled'}
                                        </Table.Th>
                                    </Table.Tr>
                                </Table.Tfoot>
                            </Table>
                        </Table.ScrollContainer>
                        </div>
                    ) : (
                        <Text c="dimmed" ta="center" py="xl" size="sm">No completed shifts yet.</Text>
                    )}
                </Card>

                {/* Current Assignment Alert */}
                {rider.currentAssignment && (
                    <Alert color="blue" variant="light" icon={<CheckCircle size={16} />}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                                <Text fw={500}>Currently Assigned</Text>
                                <Text size="sm">Campaign: {rider.currentAssignment.campaign.name}</Text>
                            </div>
                            <Text size="xs" c="dimmed">
                                Since {new Date(rider.currentAssignment.assigned_at).toLocaleDateString()}
                            </Text>
                        </div>
                    </Alert>
                )}

                {/* Location Alert */}
                {rider.current_location && (
                    <Alert color="cyan" variant="light" icon={<MapPin size={16} />}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                                <Text fw={500}>Current Location</Text>
                                <Text size="sm">
                                    {rider.current_location.stage_name}, {rider.current_location.ward.name}, {rider.current_location.subcounty.name}, {rider.current_location.county.name}
                                </Text>
                            </div>
                            <div className="text-right">
                                <Text size="xs" c="dimmed">
                                    Active since {new Date(rider.current_location.effective_from).toLocaleDateString()}
                                </Text>
                                <Text size="xs" c="dimmed">
                                    {rider.location_changes_count} location changes
                                </Text>
                            </div>
                        </div>
                    </Alert>
                )}

                {/* Rejection Alert */}
                {rider.status === 'rejected' && rider.rejectionReasons && rider.rejectionReasons.length > 0 && (
                    <Alert color="red" variant="light" icon={<XCircle size={16} />}>
                        <div>
                            <Text fw={500} mb="xs">Application Rejected</Text>
                            {rider.rejectionReasons.map((rejection, index) => (
                                <div key={rejection.id} className="mb-2">
                                    <Text size="sm" mb="xs">{rejection.reason}</Text>
                                    <Text size="xs" c="dimmed">
                                        Rejected by {rejection.rejected_by.name} on {new Date(rejection.created_at).toLocaleDateString()}
                                    </Text>
                                </div>
                            ))}
                        </div>
                    </Alert>
                )}

                {/* Tabs Content */}
                <Tabs value={activeTab} onChange={(value) => setActiveTab(value || 'overview')}>
                    <Tabs.List>
                        <Tabs.Tab value="overview">Overview</Tabs.Tab>
                        <Tabs.Tab value="location">Location</Tabs.Tab>
                        <Tabs.Tab value="documents">Documents</Tabs.Tab>
                        <Tabs.Tab value="agreement">Agreement</Tabs.Tab>
                        <Tabs.Tab value="activity">Activity</Tabs.Tab>
                    </Tabs.List>

                    <Tabs.Panel value="overview" pt="md">
                        <Grid>
                            {/* Personal Information */}
                            <Grid.Col span={{ base: 12, lg: 8 }}>
                                <Card>
                                    <Text size="lg" fw={600} mb="md">Personal Information</Text>
                                    <Grid>
                                        <Grid.Col span={{ base: 12, sm: 6 }}>
                                            <Stack gap="sm">
                                                <div>
                                                    <Text size="sm" c="dimmed">First Name</Text>
                                                    <Text fw={500}>{rider.user.first_name}</Text>
                                                </div>
                                                <div>
                                                    <Text size="sm" c="dimmed">Email Address</Text>
                                                    <Text fw={500}>{rider.user.email}</Text>
                                                </div>
                                                <div>
                                                    <Text size="sm" c="dimmed">National ID</Text>
                                                    <Text fw={500}>{rider.national_id}</Text>
                                                </div>
                                            </Stack>
                                        </Grid.Col>
                                        <Grid.Col span={{ base: 12, sm: 6 }}>
                                            <Stack gap="sm">
                                                <div>
                                                    <Text size="sm" c="dimmed">Last Name</Text>
                                                    <Text fw={500}>{rider.user.last_name}</Text>
                                                </div>
                                                <div>
                                                    <Text size="sm" c="dimmed">Phone Number</Text>
                                                    <Text fw={500}>{rider.user.phone}</Text>
                                                </div>
                                                <div>
                                                    <Text size="sm" c="dimmed">M-Pesa Number</Text>
                                                    <Text fw={500}>{rider.mpesa_number}</Text>
                                                </div>
                                            </Stack>
                                        </Grid.Col>
                                    </Grid>
                                </Card>
                            </Grid.Col>

                            {/* Emergency Contact */}
                            <Grid.Col span={{ base: 12, lg: 4 }}>
                                <Card>
                                    <Text size="lg" fw={600} mb="md">Emergency Contact</Text>
                                    <Stack gap="sm">
                                        <div>
                                            <Text size="sm" c="dimmed">Next of Kin Name</Text>
                                            <Text fw={500}>{rider.next_of_kin_name}</Text>
                                        </div>
                                        <div>
                                            <Text size="sm" c="dimmed">Next of Kin Phone</Text>
                                            <Text fw={500}>{rider.next_of_kin_phone}</Text>
                                        </div>
                                    </Stack>
                                </Card>
                            </Grid.Col>
                        </Grid>
                    </Tabs.Panel>

                    <Tabs.Panel value="location" pt="md">
                        <Grid>
                            <Grid.Col span={{ base: 12, lg: 8 }}>
                                <Card>
                                    <Text size="lg" fw={600} mb="md">Current Location Details</Text>
                                    {rider.current_location ? (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <Text size="sm" c="dimmed" mb="xs">County</Text>
                                                    <div className="flex items-center gap-2">
                                                        <Globe size={16} className="text-blue-500" />
                                                        <Text fw={500}>{rider.current_location.county.name}</Text>
                                                    </div>
                                                </div>
                                                <div>
                                                    <Text size="sm" c="dimmed" mb="xs">Sub-County</Text>
                                                    <div className="flex items-center gap-2">
                                                        <Building2 size={16} className="text-green-500" />
                                                        <Text fw={500}>{rider.current_location.subcounty.name}</Text>
                                                    </div>
                                                </div>
                                                <div>
                                                    <Text size="sm" c="dimmed" mb="xs">Ward</Text>
                                                    <div className="flex items-center gap-2">
                                                        <Home size={16} className="text-orange-500" />
                                                        <Text fw={500}>{rider.current_location.ward.name}</Text>
                                                    </div>
                                                </div>
                                                <div>
                                                    <Text size="sm" c="dimmed" mb="xs">Stage/Area</Text>
                                                    <div className="flex items-center gap-2">
                                                        <MapPin size={16} className="text-red-500" />
                                                        <Text fw={500}>{rider.current_location.stage_name}</Text>
                                                    </div>
                                                </div>
                                            </div>

                                            {(rider.current_location.latitude && rider.current_location.longitude) && (
                                                <div className="mt-4">
                                                    <Text size="sm" c="dimmed" mb="xs">GPS Coordinates</Text>
                                                    <div className="flex items-center gap-2">
                                                        <Navigation size={16} className="text-purple-500" />
                                                        <Text fw={500}>
                                                            {parseFloat(rider.current_location.latitude).toFixed(6)}, {parseFloat(rider.current_location.longitude).toFixed(6)}
                                                        </Text>
                                                    </div>
                                                </div>
                                            )}

                                            {rider.current_location.notes && (
                                                <div className="mt-4">
                                                    <Text size="sm" c="dimmed" mb="xs">Location Notes</Text>
                                                    <Paper p="sm" className="bg-gray-50 dark:bg-gray-700">
                                                        <Text size="sm">{rider.current_location.notes}</Text>
                                                    </Paper>
                                                </div>
                                            )}

                                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                                    <div>
                                                        <Text c="dimmed">Location Active Since</Text>
                                                        <Text fw={500}>{new Date(rider.current_location.effective_from).toLocaleDateString()}</Text>
                                                    </div>
                                                    <div>
                                                        <Text c="dimmed">Total Location Changes</Text>
                                                        <Text fw={500}>{rider.location_changes_count}</Text>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <Alert color="orange" variant="light" icon={<AlertTriangle size={16} />}>
                                            No location information available for this rider.
                                        </Alert>
                                    )}
                                </Card>
                            </Grid.Col>

                            <Grid.Col span={{ base: 12, lg: 4 }}>
                                <Card>
                                    <Text size="lg" fw={600} mb="md">Location Summary</Text>
                                    <Stack gap="md">
                                        <Paper p="md" className="text-center bg-blue-50 dark:bg-blue-900/20">
                                            <Text size="xs" c="dimmed" mb="xs">Total Changes</Text>
                                            <Text size="xl" fw={700} c="blue">{rider.location_changes_count}</Text>
                                        </Paper>
                                        <Paper p="md" className="text-center bg-green-50 dark:bg-green-900/20">
                                            <Text size="xs" c="dimmed" mb="xs">Last Updated</Text>
                                            <Text size="sm" fw={500} c="green">
                                                {rider.location_last_updated ? new Date(rider.location_last_updated).toLocaleDateString() : 'Never'}
                                            </Text>
                                        </Paper>
                                    </Stack>
                                </Card>
                            </Grid.Col>
                        </Grid>
                    </Tabs.Panel>

                    <Tabs.Panel value="documents" pt="md">
                        <Card>
                            <Text size="lg" fw={600} mb="md">Uploaded Documents</Text>
                            <Grid>
                                {documents.map((doc) => (
                                    <Grid.Col span={{ base: 12, sm: 6, lg: 4 }} key={doc.key}>
                                        <Paper
                                            p="md"
                                            withBorder
                                            className="hover:bg-gray-50 transition-colors cursor-pointer"
                                            onClick={() => doc.file && handleImageView(`/storage/${doc.file}`, doc.label)}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <Text size="sm" fw={500}>{doc.label}</Text>
                                                {doc.file ? (
                                                    <Badge color="green" size="xs">Uploaded</Badge>
                                                ) : (
                                                    <Badge color="red" size="xs">Missing</Badge>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <ImageIcon size={16} className="text-gray-400" />
                                                <Text size="xs" c="dimmed">
                                                    {doc.file ? 'Click to view' : 'Not uploaded'}
                                                </Text>
                                            </div>
                                        </Paper>
                                    </Grid.Col>
                                ))}
                            </Grid>
                        </Card>
                    </Tabs.Panel>

                    <Tabs.Panel value="agreement" pt="md">
                        <Card>
                            <Text size="lg" fw={600} mb="md">Signed Agreement</Text>
                            <Paper p="md" withBorder className="bg-gray-50 dark:bg-gray-700">
                                <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                                    {rider.signed_agreement || 'No agreement signed yet.'}
                                </Text>
                            </Paper>
                            <div className="flex items-center justify-between mt-4">
                                <Text size="sm" c="dimmed">
                                    Agreement Date: {new Date(rider.created_at).toLocaleDateString()}
                                </Text>
                                <Badge color="green" leftSection={<CheckCircle size={12} />}>
                                    Digitally Signed
                                </Badge>
                            </div>
                        </Card>
                    </Tabs.Panel>

                    <Tabs.Panel value="activity" pt="md">
                        <Card>
                            <Text size="lg" fw={600} mb="md">Activity Timeline</Text>
                            {activityTimeline.length > 0 ? (
                                <div style={{ maxHeight: 480, overflowY: 'auto' }} className="pr-2">
                                    <Timeline active={activityTimeline.length} bulletSize={24} lineWidth={2}>
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
                                                    <Text size="xs" mt={4} c="dimmed">
                                                        {new Date(event.timestamp).toLocaleString()} · {event.time_human}
                                                    </Text>
                                                </Timeline.Item>
                                            );
                                        })}
                                    </Timeline>
                                </div>
                            ) : (
                                <Text c="dimmed" size="sm" ta="center" py="xl">No activity recorded yet.</Text>
                            )}
                        </Card>
                    </Tabs.Panel>
                </Tabs>
            </div>

            {/* Image Modal */}
            <Modal
                opened={imageModalOpened}
                onClose={closeImageModal}
                title={selectedImage?.title}
                size="lg"
                centered
            >
                {selectedImage && (
                    <div className="text-center">
                        <Image
                            src={selectedImage.src}
                            alt={selectedImage.title}
                            fit="contain"
                            className="max-h-96 mx-auto"
                        />
                    </div>
                )}
            </Modal>

            {/* Rejection Modal */}
            <Modal
                opened={rejectModalOpened}
                onClose={closeRejectModal}
                title="Reject Rider Application"
                size="md"
                centered
            >
                <div className="space-y-4">
                    <Text size="sm" c="dimmed">
                        Please provide a detailed reason for rejecting this rider application. This will be recorded and may be shared with the rider.
                    </Text>

                    <Textarea
                        label="Rejection Reason"
                        placeholder="Enter the reason for rejection..."
                        value={rejectionReason}
                        onChange={(event) => setRejectionReason(event.currentTarget.value)}
                        minRows={4}
                        maxRows={8}
                        required
                        error={!rejectionReason.trim() && "Rejection reason is required"}
                    />

                    <Group justify="flex-end" mt="md">
                        <Button
                            variant="light"
                            onClick={closeRejectModal}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button
                            color="red"
                            onClick={handleReject}
                            loading={loading}
                            disabled={!rejectionReason.trim()}
                        >
                            Reject Application
                        </Button>
                    </Group>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}