import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import { Badge, Button, Card, Container, Drawer, Grid, Group, Stack, Text, Avatar, Paper, Divider, Alert } from '@mantine/core';
import {
    User,
    Mail,
    Phone,
    CreditCard,
    MapPin,
    Wallet,
    Calendar,
    FileText,
    CheckCircle,
    XCircle,
    Clock,
    AlertCircle,
    Edit,
    Briefcase,
    Users,
    Image as ImageIcon
} from 'lucide-react';
import Sidebar from '@/Components/frontend/layouts/Sidebar';
import Header from '@/Components/frontend/layouts/Header';
import { usePage } from '@inertiajs/react';
import type { PageProps } from '@/types';
import RiderHeader from '@/Components/frontend/layouts/RiderHeader';
import RiderSidebar from '@/Components/frontend/layouts/RiderSidebar';

interface Location {
    id: number;
    stage_name: string;
    latitude: number | null;
    longitude: number | null;
    effective_from: string;
    status: string;
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
    full_address: string;
}

interface Campaign {
    id: number;
    name: string;
}

interface Assignment {
    id: number;
    assigned_at: string;
    status: string;
    campaign: Campaign;
}

interface RejectionReason {
    id: number;
    reason: string;
    rejected_at: string;
    rejected_by: {
        id: number;
        name: string;
    } | null;
}

interface Documents {
    national_id_front_photo: string | null;
    national_id_back_photo: string | null;
    passport_photo: string | null;
    good_conduct_certificate: string | null;
    motorbike_license: string | null;
    motorbike_registration: string | null;
}

interface UserData {
    id: number;
    first_name: string;
    last_name: string;
    name: string;
    full_name: string;
    email: string;
    phone: string;
    is_active: boolean;
    created_at: string;
}

interface Rider {
    id: number;
    national_id: string;
    mpesa_number: string;
    next_of_kin_name: string;
    next_of_kin_phone: string;
    status: 'pending' | 'approved' | 'rejected';
    daily_rate: number;
    wallet_balance: number;
    location_changes_count: number;
    location_last_updated: string | null;
    created_at: string;
    is_profile_complete: boolean;
    can_work: boolean;
    user: UserData;
    documents: Documents;
    current_location: Location | null;
    current_assignment: Assignment | null;
    rejection_reasons: RejectionReason[];
}

interface ShowProps {
    rider: Rider;
}

export default function Show({ rider }: ShowProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeNav, setActiveNav] = useState('profile');
    const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
    const { auth } = usePage<PageProps>().props;
    const user = auth?.user;

    const getStatusBadge = (status: string) => {
        const statusConfig = {
            pending: { color: 'yellow', label: 'Pending Review', icon: Clock },
            approved: { color: 'green', label: 'Approved', icon: CheckCircle },
            rejected: { color: 'red', label: 'Rejected', icon: XCircle },
        };

        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
        const Icon = config.icon;

        return (
            <Badge
                color={config.color}
                variant="light"
                size="lg"
                leftSection={<Icon size={14} />}
            >
                {config.label}
            </Badge>
        );
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const formatDateTime = (dateString: string | null) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const InfoRow = ({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) => (
        <div className="flex items-start gap-3">
            <div className="mt-1 text-gray-500 dark:text-gray-400">
                <Icon size={18} />
            </div>
            <div className="flex-1">
                <Text size="sm" c="dimmed">{label}</Text>
                <Text size="sm" fw={500} className="text-gray-900 dark:text-white">{value}</Text>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-gray-900 flex">
            <Head title="My Profile" />

            {/* Desktop Sidebar */}
            <div className="hidden lg:block w-64 fixed inset-y-0 left-0 z-30">
                <RiderSidebar user={user} activeNav="profile" />

            </div>

            {/* Mobile Drawer */}
            <Drawer
                opened={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                size="280px"
                padding={0}
                withCloseButton={false}
            >
                <RiderSidebar user={user} activeNav="profile" />

            </Drawer>

            {/* Main Content */}
            <div className="flex-1 lg:ml-64">
                {/* Header */}
                <RiderHeader onMenuClick={() => setSidebarOpen(true)} rider={rider} />


                {/* Page Content */}
                <div className="p-2 sm:p-6 lg:p-4">
                    <Container size="xl">
                        {/* Page Header */}
                        <div className="mb-6">
                            <Group justify="space-between" align="center">
                                <div>
                                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                                        My Profile
                                    </h2>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                        View and manage your rider profile information
                                    </p>
                                </div>
                                <Link href={route('rider.profile.store')}>
                                    <Button leftSection={<Edit size={16} />} variant="light">
                                        Edit Profile
                                    </Button>
                                </Link>
                            </Group>
                        </div>

                        {/* Status Alert */}
                        {rider.status === 'pending' && (
                            <Alert icon={<Clock size={16} />} color="yellow" variant="light" className="mb-6">
                                <Text size="sm" fw={500}>Profile Under Review</Text>
                                <Text size="sm" mt="xs">
                                    Your profile is currently being reviewed by our team. You will be notified once approved.
                                </Text>
                            </Alert>
                        )}

                        {rider.status === 'rejected' && rider.rejection_reasons.length > 0 && (
                            <Alert icon={<XCircle size={16} />} color="red" variant="light" className="mb-6">
                                <Text size="sm" fw={500}>Profile Rejected</Text>
                                <Text size="sm" mt="xs">
                                    {rider.rejection_reasons[0].reason}
                                </Text>
                                <Text size="xs" c="dimmed" mt="sm">
                                    Rejected on {formatDateTime(rider.rejection_reasons[0].rejected_at)}
                                    {rider.rejection_reasons[0].rejected_by &&
                                        ` by ${rider.rejection_reasons[0].rejected_by.name}`
                                    }
                                </Text>
                            </Alert>
                        )}

                        {rider.status === 'approved' && rider.can_work && (
                            <Alert icon={<CheckCircle size={16} />} color="green" variant="light" className="mb-6">
                                <Text size="sm" fw={500}>Profile Approved</Text>
                                <Text size="sm" mt="xs">
                                    Your profile has been approved. You can now receive helmet assignments and start earning.
                                </Text>
                            </Alert>
                        )}

                        {!rider.is_profile_complete && (
                            <Alert icon={<AlertCircle size={16} />} color="blue" variant="light" className="mb-6">
                                <Text size="sm" fw={500}>Complete Your Profile</Text>
                                <Text size="sm" mt="xs">
                                    Please complete all required information to activate your account.
                                </Text>
                            </Alert>
                        )}

                        <Grid gutter="md">
                            {/* Profile Overview Card */}
                            <Grid.Col span={{ base: 12, md: 4 }}>
                                <Card shadow="sm" padding="lg" radius="md" withBorder>
                                    <Stack align="center" gap="md">
                                        <Avatar
                                            src={rider.documents.passport_photo}
                                            size={120}
                                            radius="xl"
                                            alt={rider.user.full_name}
                                        />
                                        <div className="text-center">
                                            <Text size="xl" fw={600} className="text-gray-900 dark:text-white">
                                                {rider.user.full_name}
                                            </Text>
                                            <Text size="sm" c="dimmed" mt={4}>
                                                Rider ID: #{rider.id.toString().padStart(6, '0')}
                                            </Text>
                                            <div className="mt-3">
                                                {getStatusBadge(rider.status)}
                                            </div>
                                        </div>

                                        <Divider w="100%" />

                                        <Stack gap="md" w="100%">
                                            <div className="text-center">
                                                <Text size="xs" c="dimmed">Daily Rate</Text>
                                                <Text size="lg" fw={600} className="text-gray-900 dark:text-white">
                                                    KSh {rider?.daily_rate}
                                                </Text>
                                            </div>
                                            <div className="text-center">
                                                <Text size="xs" c="dimmed">Wallet Balance</Text>
                                                <Text size="lg" fw={600} className="text-green-600 dark:text-green-400">
                                                    KSh {rider?.wallet_balance}
                                                </Text>
                                            </div>
                                        </Stack>

                                        <Divider w="100%" />

                                        <div className="w-full text-center">
                                            <Text size="xs" c="dimmed">Member Since</Text>
                                            <Text size="sm" fw={500} className="text-gray-900 dark:text-white">
                                                {formatDate(rider.created_at)}
                                            </Text>
                                        </div>
                                    </Stack>
                                </Card>
                            </Grid.Col>

                            {/* Main Information Grid */}
                            <Grid.Col span={{ base: 12, md: 8 }}>
                                <Stack gap="md">
                                    {/* Personal Information Card */}
                                    <Card shadow="sm" padding="lg" radius="md" withBorder>
                                        <div className="mb-4">
                                            <Group gap="xs">
                                                <User size={20} className="text-blue-600" />
                                                <Text size="lg" fw={600} className="text-gray-900 dark:text-white">
                                                    Personal Information
                                                </Text>
                                            </Group>
                                        </div>
                                        <Grid>
                                            <Grid.Col span={{ base: 12, sm: 6 }}>
                                                <InfoRow icon={User} label="First Name" value={rider.user.first_name} />
                                            </Grid.Col>
                                            <Grid.Col span={{ base: 12, sm: 6 }}>
                                                <InfoRow icon={User} label="Last Name" value={rider.user.last_name} />
                                            </Grid.Col>
                                            <Grid.Col span={{ base: 12, sm: 6 }}>
                                                <InfoRow icon={Mail} label="Email Address" value={rider.user.email} />
                                            </Grid.Col>
                                            <Grid.Col span={{ base: 12, sm: 6 }}>
                                                <InfoRow icon={Phone} label="Phone Number" value={rider.user.phone} />
                                            </Grid.Col>
                                            <Grid.Col span={{ base: 12, sm: 6 }}>
                                                <InfoRow icon={CreditCard} label="National ID" value={rider.national_id} />
                                            </Grid.Col>
                                            <Grid.Col span={{ base: 12, sm: 6 }}>
                                                <InfoRow
                                                    icon={Phone}
                                                    label="Account Status"
                                                    value={rider.user.is_active ? 'Active' : 'Inactive'}
                                                />
                                            </Grid.Col>
                                        </Grid>
                                    </Card>

                                    {/* Payment Information Card */}
                                    <Card shadow="sm" padding="lg" radius="md" withBorder>
                                        <div className="mb-4">
                                            <Group gap="xs">
                                                <Wallet size={20} className="text-green-600" />
                                                <Text size="lg" fw={600} className="text-gray-900 dark:text-white">
                                                    Payment Information
                                                </Text>
                                            </Group>
                                        </div>
                                        <Grid>
                                            <Grid.Col span={{ base: 12, sm: 6 }}>
                                                <InfoRow icon={Phone} label="M-Pesa Number" value={rider.mpesa_number} />
                                            </Grid.Col>
                                            <Grid.Col span={{ base: 12, sm: 6 }}>
                                                <InfoRow
                                                    icon={CreditCard}
                                                    label="Daily Rate"
                                                    value={`KSh ${rider.daily_rate}`}
                                                />
                                            </Grid.Col>
                                        </Grid>
                                    </Card>

                                    {/* Emergency Contact Card */}
                                    <Card shadow="sm" padding="lg" radius="md" withBorder>
                                        <div className="mb-4">
                                            <Group gap="xs">
                                                <Users size={20} className="text-purple-600" />
                                                <Text size="lg" fw={600} className="text-gray-900 dark:text-white">
                                                    Emergency Contact
                                                </Text>
                                            </Group>
                                        </div>
                                        <Grid>
                                            <Grid.Col span={{ base: 12, sm: 6 }}>
                                                <InfoRow icon={User} label="Next of Kin Name" value={rider.next_of_kin_name} />
                                            </Grid.Col>
                                            <Grid.Col span={{ base: 12, sm: 6 }}>
                                                <InfoRow icon={Phone} label="Next of Kin Phone" value={rider.next_of_kin_phone} />
                                            </Grid.Col>
                                        </Grid>
                                    </Card>
                                </Stack>
                            </Grid.Col>

                            {/* Location Information Card */}
                            <Grid.Col span={12}>
                                <Card shadow="sm" padding="lg" radius="md" withBorder>
                                    <div className="mb-4">
                                        <Group gap="xs">
                                            <MapPin size={20} className="text-red-600" />
                                            <Text size="lg" fw={600} className="text-gray-900 dark:text-white">
                                                Current Location
                                            </Text>
                                        </Group>
                                    </div>
                                    {rider.current_location ? (
                                        <Grid>
                                            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                                                <InfoRow
                                                    icon={MapPin}
                                                    label="County"
                                                    value={rider.current_location.county.name}
                                                />
                                            </Grid.Col>
                                            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                                                <InfoRow
                                                    icon={MapPin}
                                                    label="Sub County"
                                                    value={rider.current_location.subcounty.name}
                                                />
                                            </Grid.Col>
                                            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                                                <InfoRow
                                                    icon={MapPin}
                                                    label="Ward"
                                                    value={rider.current_location.ward.name}
                                                />
                                            </Grid.Col>
                                            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                                                <InfoRow
                                                    icon={MapPin}
                                                    label="Stage Name"
                                                    value={rider.current_location.stage_name}
                                                />
                                            </Grid.Col>
                                            <Grid.Col span={{ base: 12, md: 6 }}>
                                                <InfoRow
                                                    icon={Calendar}
                                                    label="Effective From"
                                                    value={formatDate(rider.current_location.effective_from)}
                                                />
                                            </Grid.Col>
                                            <Grid.Col span={{ base: 12, md: 6 }}>
                                                <InfoRow
                                                    icon={FileText}
                                                    label="Location Changes"
                                                    value={`${rider.location_changes_count} time(s)`}
                                                />
                                            </Grid.Col>
                                        </Grid>
                                    ) : (
                                        <Alert icon={<AlertCircle size={16} />} color="yellow" variant="light">
                                            <Text size="sm">No location information available</Text>
                                        </Alert>
                                    )}
                                </Card>
                            </Grid.Col>

                            {/* Current Assignment Card */}
                            {rider.current_assignment && (
                                <Grid.Col span={12}>
                                    <Card shadow="sm" padding="lg" radius="md" withBorder>
                                        <div className="mb-4">
                                            <Group gap="xs">
                                                <Briefcase size={20} className="text-orange-600" />
                                                <Text size="lg" fw={600} className="text-gray-900 dark:text-white">
                                                    Current Assignment
                                                </Text>
                                            </Group>
                                        </div>
                                        <Grid>
                                            <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                                                <InfoRow
                                                    icon={Briefcase}
                                                    label="Campaign"
                                                    value={rider.current_assignment.campaign.name}
                                                />
                                            </Grid.Col>
                                            <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                                                <InfoRow
                                                    icon={Calendar}
                                                    label="Assigned At"
                                                    value={formatDateTime(rider.current_assignment.assigned_at)}
                                                />
                                            </Grid.Col>
                                            <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                                                <div className="flex items-start gap-3">
                                                    <div className="mt-1 text-gray-500 dark:text-gray-400">
                                                        <CheckCircle size={18} />
                                                    </div>
                                                    <div className="flex-1">
                                                        <Text size="sm" c="dimmed">Status</Text>
                                                        <Badge color="green" variant="light" size="sm" mt={4}>
                                                            {rider.current_assignment.status}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </Grid.Col>
                                        </Grid>
                                    </Card>
                                </Grid.Col>
                            )}

                            {/* Documents Card */}
                            <Grid.Col span={12}>
                                <Card shadow="sm" padding="lg" radius="md" withBorder>
                                    <div className="mb-4">
                                        <Group gap="xs">
                                            <FileText size={20} className="text-indigo-600" />
                                            <Text size="lg" fw={600} className="text-gray-900 dark:text-white">
                                                Uploaded Documents
                                            </Text>
                                        </Group>
                                    </div>
                                    <Grid>
                                        {/* National ID Front */}
                                        <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                                            <Paper p="md" withBorder className="h-full">
                                                <Stack gap="sm">
                                                    <Group gap="xs">
                                                        <ImageIcon size={16} className="text-gray-500" />
                                                        <Text size="sm" fw={500}>National ID - Front</Text>
                                                    </Group>
                                                    {rider.documents.national_id_front_photo ? (
                                                        <>
                                                            <img
                                                                src={rider.documents.national_id_front_photo}
                                                                alt="National ID Front"
                                                                className="w-full h-32 object-cover rounded cursor-pointer hover:opacity-80 transition"
                                                                onClick={() => setSelectedDocument(rider.documents.national_id_front_photo)}
                                                            />
                                                            <Button
                                                                variant="light"
                                                                size="xs"
                                                                fullWidth
                                                                component="a"
                                                                href={rider.documents.national_id_front_photo}
                                                                target="_blank"
                                                            >
                                                                View Full Size
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <Text size="xs" c="dimmed">Not uploaded</Text>
                                                    )}
                                                </Stack>
                                            </Paper>
                                        </Grid.Col>

                                        {/* National ID Back */}
                                        <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                                            <Paper p="md" withBorder className="h-full">
                                                <Stack gap="sm">
                                                    <Group gap="xs">
                                                        <ImageIcon size={16} className="text-gray-500" />
                                                        <Text size="sm" fw={500}>National ID - Back</Text>
                                                    </Group>
                                                    {rider.documents.national_id_back_photo ? (
                                                        <>
                                                            <img
                                                                src={rider.documents.national_id_back_photo}
                                                                alt="National ID Back"
                                                                className="w-full h-32 object-cover rounded cursor-pointer hover:opacity-80 transition"
                                                                onClick={() => setSelectedDocument(rider.documents.national_id_back_photo)}
                                                            />
                                                            <Button
                                                                variant="light"
                                                                size="xs"
                                                                fullWidth
                                                                component="a"
                                                                href={rider.documents.national_id_back_photo}
                                                                target="_blank"
                                                            >
                                                                View Full Size
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <Text size="xs" c="dimmed">Not uploaded</Text>
                                                    )}
                                                </Stack>
                                            </Paper>
                                        </Grid.Col>

                                        {/* Passport Photo */}
                                        <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                                            <Paper p="md" withBorder className="h-full">
                                                <Stack gap="sm">
                                                    <Group gap="xs">
                                                        <ImageIcon size={16} className="text-gray-500" />
                                                        <Text size="sm" fw={500}>Passport Photo</Text>
                                                    </Group>
                                                    {rider.documents.passport_photo ? (
                                                        <>
                                                            <img
                                                                src={rider.documents.passport_photo}
                                                                alt="Passport Photo"
                                                                className="w-full h-32 object-cover rounded cursor-pointer hover:opacity-80 transition"
                                                                onClick={() => setSelectedDocument(rider.documents.passport_photo)}
                                                            />
                                                            <Button
                                                                variant="light"
                                                                size="xs"
                                                                fullWidth
                                                                component="a"
                                                                href={rider.documents.passport_photo}
                                                                target="_blank"
                                                            >
                                                                View Full Size
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <Text size="xs" c="dimmed">Not uploaded</Text>
                                                    )}
                                                </Stack>
                                            </Paper>
                                        </Grid.Col>

                                        {/* Good Conduct Certificate */}
                                        <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                                            <Paper p="md" withBorder className="h-full">
                                                <Stack gap="sm">
                                                    <Group gap="xs">
                                                        <FileText size={16} className="text-gray-500" />
                                                        <Text size="sm" fw={500}>Good Conduct Certificate</Text>
                                                    </Group>
                                                    {rider.documents.good_conduct_certificate ? (
                                                        <>
                                                            <div className="w-full h-32 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center">
                                                                <FileText size={48} className="text-gray-400" />
                                                            </div>
                                                            <Button
                                                                variant="light"
                                                                size="xs"
                                                                fullWidth
                                                                component="a"
                                                                href={rider.documents.good_conduct_certificate}
                                                                target="_blank"
                                                            >
                                                                View Document
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <Text size="xs" c="dimmed">Not uploaded</Text>
                                                    )}
                                                </Stack>
                                            </Paper>
                                        </Grid.Col>

                                        {/* Motorbike License */}
                                        <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                                            <Paper p="md" withBorder className="h-full">
                                                <Stack gap="sm">
                                                    <Group gap="xs">
                                                        <FileText size={16} className="text-gray-500" />
                                                        <Text size="sm" fw={500}>Motorbike License</Text>
                                                    </Group>
                                                    {rider.documents.motorbike_license ? (
                                                        <>
                                                            <div className="w-full h-32 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center">
                                                                <FileText size={48} className="text-gray-400" />
                                                            </div>
                                                            <Button
                                                                variant="light"
                                                                size="xs"
                                                                fullWidth
                                                                component="a"
                                                                href={rider.documents.motorbike_license}
                                                                target="_blank"
                                                            >
                                                                View Document
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <Text size="xs" c="dimmed">Not uploaded</Text>
                                                    )}
                                                </Stack>
                                            </Paper>
                                        </Grid.Col>

                                        {/* Motorbike Registration */}
                                        <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                                            <Paper p="md" withBorder className="h-full">
                                                <Stack gap="sm">
                                                    <Group gap="xs">
                                                        <FileText size={16} className="text-gray-500" />
                                                        <Text size="sm" fw={500}>Motorbike Registration</Text>
                                                    </Group>
                                                    {rider.documents.motorbike_registration ? (
                                                        <>
                                                            <div className="w-full h-32 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center">
                                                                <FileText size={48} className="text-gray-400" />
                                                            </div>
                                                            <Button
                                                                variant="light"
                                                                size="xs"
                                                                fullWidth
                                                                component="a"
                                                                href={rider.documents.motorbike_registration}
                                                                target="_blank"
                                                            >
                                                                View Document
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <Text size="xs" c="dimmed">Not uploaded</Text>
                                                    )}
                                                </Stack>
                                            </Paper>
                                        </Grid.Col>
                                    </Grid>
                                </Card>
                            </Grid.Col>
                        </Grid>
                    </Container>
                </div>
            </div>

            {/* Image Modal */}
            {selectedDocument && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
                    onClick={() => setSelectedDocument(null)}
                >
                    <div className="max-w-4xl max-h-full">
                        <img
                            src={selectedDocument}
                            alt="Document"
                            className="max-w-full max-h-[90vh] object-contain rounded-lg"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}