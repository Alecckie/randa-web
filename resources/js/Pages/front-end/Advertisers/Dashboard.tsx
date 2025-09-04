import React, { useState } from 'react';
import { Head, useForm, Link } from '@inertiajs/react';
import {
    Button,
    TextInput,
    Textarea,
    Card,
    Group,
    Text,
    Stack,
    Grid,
    Alert,
    Badge,
    Avatar,
    Container,
    Title,
    Paper,
    Divider,
} from '@mantine/core';
import {
    Building2,
    User,
    Mail,
    Phone,
    MapPin,
    FileText,
    Check,
    AlertCircle,
    Home,
    Settings,
    LogOut,
    Plus,
    BarChart3,
    Users,
} from 'lucide-react';

interface AdvertiserProfileProps {
    user: {
        id: number;
        name: string;
        email: string;
        phone: string;
        role: string;
    };
    advertiser?: {
        id?: number;
        company_name?: string;
        business_registration?: string;
        address?: string;
        contact_person?: string;
        status?: string;
    };
}

export default function AdvertiserDashboard({ user, advertiser }: AdvertiserProfileProps) {
    const { data, setData, post, processing, errors } = useForm({
        company_name: advertiser?.company_name || '',
        business_registration: advertiser?.business_registration || '',
        address: advertiser?.address || '',
        contact_person: advertiser?.contact_person || user.name,
    });

    const hasProfile = !!advertiser?.id;
    const isApproved = advertiser?.status === 'approved';
    const isPending = advertiser?.status === 'pending';
    const isRejected = advertiser?.status === 'rejected';

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const endpoint = hasProfile
            ? route('advertiser.profile.update', advertiser?.id)
            : route('advertiser.profile.store');

        post(endpoint, {
            onSuccess: () => {
                // Handle success
            }
        });
    };

    const isFormValid = () => {
        return data.company_name &&
            data.address &&
            data.contact_person;
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <Head title="Advertiser Dashboard - Complete Profile" />

            {/* Header */}
            <div className="bg-white border-b border-slate-200">
                <Container size="xl">
                    <div className="flex items-center justify-between py-4">
                        <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                                <span className="text-lg font-bold text-white">R</span>
                            </div>
                            <div>
                                <Title order={2} size="h3" className="text-slate-900">Randa Advertiser</Title>
                                <Text size="sm" c="dimmed">Complete your advertiser profile</Text>
                            </div>
                        </div>

                        <div className="flex items-center space-x-4">
                            <Button variant="light" leftSection={<Home size={16} />}>
                                Dashboard
                            </Button>
                            <Button variant="light" leftSection={<Settings size={16} />}>
                                Settings
                            </Button>
                            <Link
                                method="post"
                                as="button"
                                href="/logout"
                                className="
                               inline-flex items-center gap-2
                               px-4 py-2 rounded-md
                               text-red-600 hover:text-red-700
                               bg-red-50 hover:bg-red-100
                               transition-all duration-200
                             "
                            >
                                <LogOut size={16} />
                                Logout
                            </Link>
                        </div>
                    </div>
                </Container>
            </div>

            <Container size="xl" py="xl">
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* User Info Card */}
                    <Card>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <Avatar size="lg" color="purple">
                                    <Building2 size={24} />
                                </Avatar>
                                <div>
                                    <Text size="lg" fw={600}>{user.name}</Text>
                                    <Text size="sm" c="dimmed">{user.email}</Text>
                                    <Text size="sm" c="dimmed">{user.phone || 'No phone number'}</Text>
                                </div>
                            </div>
                            <div className="text-right">
                                <Badge
                                    color={isApproved ? 'green' : isPending ? 'yellow' : isRejected ? 'red' : 'gray'}
                                    variant="light"
                                    leftSection={
                                        isApproved ? <Check size={12} /> :
                                            isPending ? <AlertCircle size={12} /> :
                                                <AlertCircle size={12} />
                                    }
                                >
                                    {hasProfile && advertiser.status
                                        ? advertiser?.status?.charAt(0).toUpperCase() + advertiser?.status?.slice(1)
                                        : 'Not Completed'
                                    }
                                </Badge>
                                {advertiser?.company_name && (
                                    <Text size="sm" c="dimmed" mt="xs">
                                        Company: {advertiser.company_name}
                                    </Text>
                                )}
                            </div>
                        </div>
                    </Card>

                    {/* Status Messages */}
                    {!hasProfile && (
                        <Alert color="purple" variant="light" icon={<AlertCircle size={16} />}>
                            <Text size="sm">
                                <strong>Complete Your Profile:</strong> Please fill out your company information to start creating advertising campaigns.
                            </Text>
                        </Alert>
                    )}

                    {isPending && (
                        <Alert color="yellow" variant="light" icon={<AlertCircle size={16} />}>
                            <Text size="sm">
                                <strong>Application Under Review:</strong> Your advertiser profile is being reviewed by our team. You'll be notified once it's approved.
                            </Text>
                        </Alert>
                    )}

                    {isApproved && (
                        <Alert color="green" variant="light" icon={<Check size={16} />}>
                            <Text size="sm">
                                <strong>Profile Approved:</strong> Congratulations! Your advertiser profile has been approved and you can start creating campaigns.
                            </Text>
                        </Alert>
                    )}

                    {isRejected && (
                        <Alert color="red" variant="light" icon={<AlertCircle size={16} />}>
                            <Text size="sm">
                                <strong>Application Rejected:</strong> Please review and update your information, then resubmit your application.
                            </Text>
                        </Alert>
                    )}

                    {/* Company Profile Form */}
                    {(!hasProfile || isRejected) && (
                        <form onSubmit={handleSubmit}>
                            <Card>
                                <Stack>
                                    <div>
                                        <Text size="lg" fw={600} mb="sm" className="flex items-center">
                                            <Building2 size={20} className="mr-2" />
                                            Company Information
                                        </Text>
                                        <Text size="sm" c="dimmed">
                                            Provide your company details for the advertiser account.
                                        </Text>
                                    </div>

                                    <Divider />

                                    <Grid>
                                        <Grid.Col span={{ base: 12, md: 6 }}>
                                            <TextInput
                                                label="Company Name"
                                                placeholder="Enter company name"
                                                value={data.company_name}
                                                onChange={(e) => setData('company_name', e.currentTarget.value)}
                                                error={errors.company_name}
                                                leftSection={<Building2 size={16} />}
                                                required
                                            />
                                        </Grid.Col>

                                        <Grid.Col span={{ base: 12, md: 6 }}>
                                            <TextInput
                                                label="Business Registration Number"
                                                placeholder="Enter registration number (optional)"
                                                description="Company registration or license number"
                                                value={data.business_registration}
                                                onChange={(e) => setData('business_registration', e.currentTarget.value)}
                                                error={errors.business_registration}
                                                leftSection={<FileText size={16} />}
                                            />
                                        </Grid.Col>

                                        <Grid.Col span={12}>
                                            <Textarea
                                                label="Company Address"
                                                placeholder="Enter complete company address"
                                                description="Physical address of your company"
                                                value={data.address}
                                                onChange={(e) => setData('address', e.currentTarget.value)}
                                                error={errors.address}
                                                minRows={3}
                                                leftSection={<MapPin size={16} />}
                                                required
                                            />
                                        </Grid.Col>

                                        <Grid.Col span={{ base: 12, md: 6 }}>
                                            <TextInput
                                                label="Contact Person Name"
                                                placeholder="Enter contact person name"
                                                description="Primary contact person for this account"
                                                value={data.contact_person}
                                                onChange={(e) => setData('contact_person', e.currentTarget.value)}
                                                error={errors.contact_person}
                                                leftSection={<User size={16} />}
                                                required
                                            />
                                        </Grid.Col>
                                    </Grid>

                                    <Divider />

                                    {/* Information Alert */}
                                    <Alert icon={<AlertCircle size={16} />} color="purple" variant="light">
                                        <Text size="sm">
                                            <strong>Application Process:</strong>
                                            <br />• Your application will be submitted with "pending" status
                                            <br />• Admin review is required before approval
                                            <br />• You'll be notified once your application is reviewed
                                            <br />• Campaign creation access will be granted upon approval
                                        </Text>
                                    </Alert>

                                    {/* Submit Button */}
                                    <Group justify="flex-end">
                                        <Button
                                            type="submit"
                                            loading={processing}
                                            disabled={!isFormValid() || processing}
                                            color="purple"
                                            leftSection={<Building2 size={16} />}
                                        >
                                            {hasProfile ? 'Update Profile' : 'Submit Application'}
                                        </Button>
                                    </Group>

                                    {/* Error Summary */}
                                    {Object.keys(errors).length > 0 && (
                                        <Alert color="red" variant="light">
                                            <Text size="sm" fw={500} mb="xs">Please fix the following errors:</Text>
                                            <ul className="list-disc list-inside text-sm space-y-1">
                                                {Object.entries(errors).map(([field, error]) => (
                                                    <li key={field}>{error}</li>
                                                ))}
                                            </ul>
                                        </Alert>
                                    )}
                                </Stack>
                            </Card>
                        </form>
                    )}

                    {/* Approved Advertiser Dashboard Content */}
                    {isApproved && (
                        <div className="space-y-6">
                            {/* Company Info Card */}
                            <Card>
                                <Stack>
                                    <div>
                                        <Text size="lg" fw={600} mb="sm" className="flex items-center">
                                            <Building2 size={20} className="mr-2" />
                                            Company Profile
                                        </Text>
                                    </div>

                                    <Grid>
                                        <Grid.Col span={{ base: 12, md: 6 }}>
                                            <Paper p="md" withBorder className="bg-slate-50">
                                                <div className="flex items-center space-x-3 mb-2">
                                                    <Building2 size={16} className="text-slate-600" />
                                                    <Text size="sm" c="dimmed">Company Name</Text>
                                                </div>
                                                <Text fw={500}>{advertiser?.company_name}</Text>
                                            </Paper>
                                        </Grid.Col>

                                        <Grid.Col span={{ base: 12, md: 6 }}>
                                            <Paper p="md" withBorder className="bg-slate-50">
                                                <div className="flex items-center space-x-3 mb-2">
                                                    <User size={16} className="text-slate-600" />
                                                    <Text size="sm" c="dimmed">Contact Person</Text>
                                                </div>
                                                <Text fw={500}>{advertiser?.contact_person}</Text>
                                            </Paper>
                                        </Grid.Col>

                                        {advertiser?.business_registration && (
                                            <Grid.Col span={{ base: 12, md: 6 }}>
                                                <Paper p="md" withBorder className="bg-slate-50">
                                                    <div className="flex items-center space-x-3 mb-2">
                                                        <FileText size={16} className="text-slate-600" />
                                                        <Text size="sm" c="dimmed">Registration Number</Text>
                                                    </div>
                                                    <Text fw={500}>{advertiser.business_registration}</Text>
                                                </Paper>
                                            </Grid.Col>
                                        )}

                                        <Grid.Col span={12}>
                                            <Paper p="md" withBorder className="bg-slate-50">
                                                <div className="flex items-center space-x-3 mb-2">
                                                    <MapPin size={16} className="text-slate-600" />
                                                    <Text size="sm" c="dimmed">Company Address</Text>
                                                </div>
                                                <Text fw={500}>{advertiser?.address}</Text>
                                            </Paper>
                                        </Grid.Col>
                                    </Grid>
                                </Stack>
                            </Card>

                            {/* Quick Actions */}
                            <Card>
                                <Stack>
                                    <div>
                                        <Text size="lg" fw={600} mb="sm">Quick Actions</Text>
                                        <Text size="sm" c="dimmed">
                                            Get started with your advertising campaigns
                                        </Text>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <Button
                                            variant="light"
                                            color="purple"
                                            size="lg"
                                            leftSection={<Plus size={20} />}
                                            className="h-20 flex-col"
                                        >
                                            <Text size="sm" fw={600}>Create Campaign</Text>
                                            <Text size="xs" c="dimmed">Start a new advertising campaign</Text>
                                        </Button>

                                        <Button
                                            variant="light"
                                            color="blue"
                                            size="lg"
                                            leftSection={<BarChart3 size={20} />}
                                            className="h-20 flex-col"
                                        >
                                            <Text size="sm" fw={600}>View Analytics</Text>
                                            <Text size="xs" c="dimmed">Track campaign performance</Text>
                                        </Button>

                                        <Button
                                            variant="light"
                                            color="green"
                                            size="lg"
                                            leftSection={<Users size={20} />}
                                            className="h-20 flex-col"
                                        >
                                            <Text size="sm" fw={600}>Find Riders</Text>
                                            <Text size="xs" c="dimmed">Browse available riders</Text>
                                        </Button>
                                    </div>
                                </Stack>
                            </Card>

                            {/* Stats Overview */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <Card>
                                    <div className="flex items-center space-x-3">
                                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                            <Plus size={24} className="text-purple-600" />
                                        </div>
                                        <div>
                                            <Text size="sm" c="dimmed">Active Campaigns</Text>
                                            <Text size="lg" fw={600}>0</Text>
                                        </div>
                                    </div>
                                </Card>

                                <Card>
                                    <div className="flex items-center space-x-3">
                                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                            <BarChart3 size={24} className="text-blue-600" />
                                        </div>
                                        <div>
                                            <Text size="sm" c="dimmed">Total Impressions</Text>
                                            <Text size="lg" fw={600}>0</Text>
                                        </div>
                                    </div>
                                </Card>

                                <Card>
                                    <div className="flex items-center space-x-3">
                                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                            <Users size={24} className="text-green-600" />
                                        </div>
                                        <div>
                                            <Text size="sm" c="dimmed">Connected Riders</Text>
                                            <Text size="lg" fw={600}>0</Text>
                                        </div>
                                    </div>
                                </Card>

                                <Card>
                                    <div className="flex items-center space-x-3">
                                        <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                                            <Check size={24} className="text-orange-600" />
                                        </div>
                                        <div>
                                            <Text size="sm" c="dimmed">Campaign Budget</Text>
                                            <Text size="lg" fw={600}>KSh 0</Text>
                                        </div>
                                    </div>
                                </Card>
                            </div>

                            {/* Getting Started Guide */}
                            <Card>
                                <Stack>
                                    <div>
                                        <Text size="lg" fw={600} mb="sm">Getting Started</Text>
                                        <Text size="sm" c="dimmed">
                                            Follow these steps to launch your first campaign
                                        </Text>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-start space-x-4 p-4 bg-slate-50 rounded-lg">
                                            <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                                1
                                            </div>
                                            <div>
                                                <Text size="sm" fw={500} mb="xs">Create Your First Campaign</Text>
                                                <Text size="xs" c="dimmed">Define your campaign objectives, target audience, and budget</Text>
                                            </div>
                                        </div>

                                        <div className="flex items-start space-x-4 p-4 bg-slate-50 rounded-lg">
                                            <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                                2
                                            </div>
                                            <div>
                                                <Text size="sm" fw={500} mb="xs">Design Your Brand Message</Text>
                                                <Text size="xs" c="dimmed">Upload your logo and create compelling brand messaging</Text>
                                            </div>
                                        </div>

                                        <div className="flex items-start space-x-4 p-4 bg-slate-50 rounded-lg">
                                            <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                                3
                                            </div>
                                            <div>
                                                <Text size="sm" fw={500} mb="xs">Connect with Riders</Text>
                                                <Text size="xs" c="dimmed">Choose from available riders in your target areas</Text>
                                            </div>
                                        </div>

                                        <div className="flex items-start space-x-4 p-4 bg-slate-50 rounded-lg">
                                            <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                                4
                                            </div>
                                            <div>
                                                <Text size="sm" fw={500} mb="xs">Launch and Monitor</Text>
                                                <Text size="xs" c="dimmed">Launch your campaign and track performance with real-time analytics</Text>
                                            </div>
                                        </div>
                                    </div>

                                    <Group justify="center" mt="md">
                                        <Button color="purple" leftSection={<Plus size={16} />}>
                                            Create Your First Campaign
                                        </Button>
                                    </Group>
                                </Stack>
                            </Card>
                        </div>
                    )}
                </div>
            </Container>
        </div>
    );
}