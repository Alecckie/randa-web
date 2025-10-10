import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link, router } from '@inertiajs/react';
import {
    Button,
    Card,
    Group,
    Text,
    Stack,
    Grid,
    Badge,
    Modal,
    Textarea,
    Alert,
    Table,
} from '@mantine/core';
import { ArrowLeft, Download, CheckCircle, XCircle, Edit, Building2, User, Mail, Phone, MapPin, FileText, Calendar, AlertCircle, Target, Eye } from 'lucide-react';
import { notifications } from '@mantine/notifications';

interface User {
    id: number;
    first_name?: string;
    last_name?: string;
    name: string;
    email: string;
    phone?: string;
    is_active: boolean;
}

interface Advertiser {
    id: number;
    user_id: number;
    company_name: string;
    business_registration?: string;
    address: string;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
    updated_at: string;
    user: User;
}

interface RejectionReason {
    id: number;
    reason: string;
    rejected_by: number;
    created_at: string;
    rejected_by_user?: {
        name: string;
    };
}

interface AdvertiserShowProps {
    advertiser: Advertiser;
    rejectionReasons?: RejectionReason[];
}

export default function AdvertiserShow({ advertiser, rejectionReasons = [] }: AdvertiserShowProps) {
    const [rejectModalOpened, setRejectModalOpened] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({
        reason: '',
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved':
                return 'green';
            case 'rejected':
                return 'red';
            case 'pending':
                return 'yellow';
            default:
                return 'gray';
        }
    };

    const handleApprove = () => {
        if (confirm('Are you sure you want to approve this advertiser? This will activate their account.')) {
            router.post(
                route('advertiser.approve', advertiser.id),
                {},
                {
                    onSuccess: () => {
                        notifications.show({
                            title: 'Success',
                            message: 'Advertiser approved successfully',
                            color: 'green',
                        });
                    },
                    onError: () => {
                        notifications.show({
                            title: 'Error',
                            message: 'Failed to approve advertiser',
                            color: 'red',
                        });
                    },
                }
            );
        }
    };

    const handleRejectSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!data.reason.trim()) {
            notifications.show({
                title: 'Error',
                message: 'Please provide a reason for rejection',
                color: 'red',
            });
            return;
        }

        post(route('advertiser.reject', advertiser.id), {
            onSuccess: () => {
                notifications.show({
                    title: 'Success',
                    message: 'Advertiser rejected successfully',
                    color: 'green',
                });
                setRejectModalOpened(false);
                reset();
            },
            onError: () => {
                notifications.show({
                    title: 'Error',
                    message: 'Failed to reject advertiser',
                    color: 'red',
                });
            },
        });
    };

    const handleDownloadPDF = () => {
        window.open(route('advertiser.download-pdf', advertiser.id), '_blank');
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <Button
                            variant="subtle"
                            leftSection={<ArrowLeft size={16} />}
                            component={Link}
                            href={route('advertisers.index')}
                        >
                            Back to Advertisers
                        </Button>
                        <div>
                            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                                Advertiser Details
                            </h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                View and manage advertiser information
                            </p>
                        </div>
                    </div>
                    <Group>
                        <Button
                            variant="light"
                            leftSection={<Download size={16} />}
                            onClick={handleDownloadPDF}
                        >
                            Download PDF
                        </Button>
                        <Button
                            variant="filled"
                            leftSection={<Edit size={16} />}
                            component={Link}
                            href={route('advertisers.edit', advertiser.id)}
                        >
                            Edit
                        </Button>
                    </Group>
                </div>
            }
        >
            <Head title={`Advertiser - ${advertiser.company_name}`} />

            <div className="w-full max-w-7xl mx-auto space-y-6">
                {/* Status Card */}
                <Card>
                    <Group justify="space-between" align="center">
                        <div>
                            <Text size="sm" c="dimmed" mb={4}>Application Status</Text>
                            <Badge 
                                size="lg" 
                                color={getStatusColor(advertiser.status)}
                                variant="light"
                            >
                                {advertiser.status.toUpperCase()}
                            </Badge>
                        </div>
                        
                        {advertiser.status === 'pending' && (
                            <Group>
                                <Button
                                    color="green"
                                    leftSection={<CheckCircle size={16} />}
                                    onClick={handleApprove}
                                >
                                    Approve
                                </Button>
                                <Button
                                    color="red"
                                    variant="light"
                                    leftSection={<XCircle size={16} />}
                                    onClick={() => setRejectModalOpened(true)}
                                >
                                    Reject
                                </Button>
                            </Group>
                        )}

                        {advertiser.status === 'approved' && (
                            <Button
                                color="red"
                                variant="light"
                                leftSection={<XCircle size={16} />}
                                onClick={() => setRejectModalOpened(true)}
                            >
                                Revoke Approval
                            </Button>
                        )}
                    </Group>
                </Card>

                {/* Company Information */}
                <Card>
                    <Stack>
                        <Text size="lg" fw={600} className="flex items-center">
                            <Building2 size={20} className="mr-2" />
                            Company Information
                        </Text>

                        <Grid>
                            <Grid.Col span={{ base: 12, md: 6 }}>
                                <div className="space-y-1">
                                    <Text size="sm" c="dimmed">Company Name</Text>
                                    <Text size="md" fw={500}>{advertiser.company_name}</Text>
                                </div>
                            </Grid.Col>

                            <Grid.Col span={{ base: 12, md: 6 }}>
                                <div className="space-y-1">
                                    <Text size="sm" c="dimmed">Business Registration Number</Text>
                                    <Text size="md" fw={500}>
                                        {advertiser.business_registration || 'Not provided'}
                                    </Text>
                                </div>
                            </Grid.Col>

                            <Grid.Col span={12}>
                                <div className="space-y-1">
                                    <Text size="sm" c="dimmed" className="flex items-center">
                                        <MapPin size={14} className="mr-1" />
                                        Company Address
                                    </Text>
                                    <Text size="md">{advertiser.address}</Text>
                                </div>
                            </Grid.Col>
                        </Grid>
                    </Stack>
                </Card>

                {/* Contact Information */}
                <Card>
                    <Stack>
                        <Text size="lg" fw={600} className="flex items-center">
                            <User size={20} className="mr-2" />
                            Contact Information
                        </Text>

                        <Grid>
                            <Grid.Col span={{ base: 12, md: 6 }}>
                                <div className="space-y-1">
                                    <Text size="sm" c="dimmed">Contact Person</Text>
                                    <Text size="md" fw={500}>{advertiser.user.name}</Text>
                                </div>
                            </Grid.Col>

                            <Grid.Col span={{ base: 12, md: 6 }}>
                                <div className="space-y-1">
                                    <Text size="sm" c="dimmed" className="flex items-center">
                                        <Mail size={14} className="mr-1" />
                                        Email Address
                                    </Text>
                                    <Text size="md">{advertiser.user.email}</Text>
                                </div>
                            </Grid.Col>

                            <Grid.Col span={{ base: 12, md: 6 }}>
                                <div className="space-y-1">
                                    <Text size="sm" c="dimmed" className="flex items-center">
                                        <Phone size={14} className="mr-1" />
                                        Phone Number
                                    </Text>
                                    <Text size="md">{advertiser.user.phone || 'Not provided'}</Text>
                                </div>
                            </Grid.Col>

                            <Grid.Col span={{ base: 12, md: 6 }}>
                                <div className="space-y-1">
                                    <Text size="sm" c="dimmed">Account Status</Text>
                                    <Badge color={advertiser.user.is_active ? 'green' : 'red'} variant="light">
                                        {advertiser.user.is_active ? 'Active' : 'Inactive'}
                                    </Badge>
                                </div>
                            </Grid.Col>
                        </Grid>
                    </Stack>
                </Card>

                {/* Timestamps */}
                <Card>
                    <Stack>
                        <Text size="lg" fw={600} className="flex items-center">
                            <Calendar size={20} className="mr-2" />
                            Timeline
                        </Text>

                        <Grid>
                            <Grid.Col span={{ base: 12, md: 6 }}>
                                <div className="space-y-1">
                                    <Text size="sm" c="dimmed">Application Submitted</Text>
                                    <Text size="md">{formatDate(advertiser.created_at)}</Text>
                                </div>
                            </Grid.Col>

                            <Grid.Col span={{ base: 12, md: 6 }}>
                                <div className="space-y-1">
                                    <Text size="sm" c="dimmed">Last Updated</Text>
                                    <Text size="md">{formatDate(advertiser.updated_at)}</Text>
                                </div>
                            </Grid.Col>
                        </Grid>
                    </Stack>
                </Card>

                {/* Rejection Reasons */}
                {rejectionReasons && rejectionReasons.length > 0 && (
                    <Card>
                        <Stack>
                            <Text size="lg" fw={600} className="flex items-center" c="red">
                                <AlertCircle size={20} className="mr-2" />
                                Rejection History
                            </Text>

                            <Stack gap="md">
                                {rejectionReasons.map((rejection) => (
                                    <Alert
                                        key={rejection.id}
                                        icon={<XCircle size={16} />}
                                        color="red"
                                        variant="light"
                                    >
                                        <Text size="sm" fw={500} mb={4}>
                                            Rejected on {formatDate(rejection.created_at)}
                                            {rejection.rejected_by_user && (
                                                <span className="text-gray-600"> by {rejection.rejected_by_user.name}</span>
                                            )}
                                        </Text>
                                        <Text size="sm">{rejection.reason}</Text>
                                    </Alert>
                                ))}
                            </Stack>
                        </Stack>
                    </Card>
                )}
            </div>

            {/* Reject Modal */}
            <Modal
                opened={rejectModalOpened}
                onClose={() => {
                    setRejectModalOpened(false);
                    reset();
                }}
                title={
                    <Text size="lg" fw={600}>
                        Reject Advertiser Application
                    </Text>
                }
                size="md"
            >
                <form onSubmit={handleRejectSubmit}>
                    <Stack>
                        <Alert icon={<AlertCircle size={16} />} color="red" variant="light">
                            <Text size="sm">
                                This action will reject the advertiser application and deactivate their account. 
                                Please provide a clear reason for rejection.
                            </Text>
                        </Alert>

                        <Textarea
                            label="Rejection Reason"
                            placeholder="Provide a detailed reason for rejecting this application..."
                            description="This reason will be recorded for future reference"
                            value={data.reason}
                            onChange={(e) => setData('reason', e.currentTarget.value)}
                            error={errors.reason}
                            minRows={4}
                            required
                        />

                        <Group justify="flex-end">
                            <Button
                                variant="light"
                                onClick={() => {
                                    setRejectModalOpened(false);
                                    reset();
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                color="red"
                                loading={processing}
                                disabled={processing}
                                leftSection={<XCircle size={16} />}
                            >
                                Reject Application
                            </Button>
                        </Group>
                    </Stack>
                </form>
            </Modal>
        </AuthenticatedLayout>
    );
}