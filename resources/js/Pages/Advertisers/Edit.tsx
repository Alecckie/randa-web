import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link } from '@inertiajs/react';
import {
    Button,
    TextInput,
    Select,
    Textarea,
    Card,
    Group,
    Text,
    Stack,
    Grid,
    Alert,
    Badge,
} from '@mantine/core';
import { ArrowLeft, Save, Building2, User, AlertCircle } from 'lucide-react';
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

interface AdvertiserEditProps {
    advertiser: Advertiser;
}

interface AdvertiserFormData {
    company_name: string;
    business_registration?: string;
    address: string;
    email: string;
    phone?: string;
    status: 'pending' | 'approved' | 'rejected';
}

export default function AdvertiserEdit({ advertiser }: AdvertiserEditProps) {
    const { data, setData, put, processing, errors } = useForm<AdvertiserFormData>({
        company_name: advertiser.company_name,
        business_registration: advertiser.business_registration || '',
        address: advertiser.address,
        email: advertiser.user.email,
        phone: advertiser.user.phone || '',
        status: advertiser.status,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('advertisers.update', advertiser.id), {
            onSuccess: () => {
                notifications.show({
                    title: 'Success',
                    message: 'Advertiser updated successfully',
                    color: 'green',
                });
            },
            onError: () => {
                notifications.show({
                    title: 'Error',
                    message: 'Failed to update advertiser',
                    color: 'red',
                });
            },
        });
    };

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

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center space-x-4">
                    <Button
                        variant="subtle"
                        leftSection={<ArrowLeft size={16} />}
                        component={Link}
                        href={route('advertisers.show', advertiser.id)}
                    >
                        Back to Details
                    </Button>
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                            Edit Advertiser
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Update advertiser information and account details
                        </p>
                    </div>
                </div>
            }
        >
            <Head title={`Edit - ${advertiser.company_name}`} />

            <div className="w-full max-w-7xl mx-auto space-y-6">
                <form onSubmit={handleSubmit}>
                    <Stack>
                        {/* Current Status */}
                        <Card>
                            <Group justify="space-between" align="center">
                                <div>
                                    <Text size="sm" c="dimmed" mb={4}>Current Status</Text>
                                    <Badge 
                                        size="lg" 
                                        color={getStatusColor(advertiser.status)}
                                        variant="light"
                                    >
                                        {advertiser.status.toUpperCase()}
                                    </Badge>
                                </div>
                                <Text size="xs" c="dimmed">
                                    User ID: {advertiser.user_id}
                                </Text>
                            </Group>
                        </Card>

                        {/* Company Information */}
                        <Card>
                            <Stack>
                                <div>
                                    <Text size="lg" fw={600} mb="sm" className="flex items-center">
                                        <Building2 size={20} className="mr-2" />
                                        Company Information
                                    </Text>
                                    <Text size="sm" c="dimmed">
                                        Update the company details for this advertiser account.
                                    </Text>
                                </div>

                                <Grid>
                                    <Grid.Col span={{ base: 12, md: 6 }}>
                                        <TextInput
                                            label="Company Name"
                                            placeholder="Enter company name"
                                            value={data.company_name}
                                            onChange={(e) => setData('company_name', e.currentTarget.value)}
                                            error={errors.company_name}
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
                                        />
                                    </Grid.Col>

                                    <Grid.Col span={12}>
                                        <Textarea
                                            label="Company Address"
                                            placeholder="Enter complete company address"
                                            description="Physical address of the company"
                                            value={data.address}
                                            onChange={(e) => setData('address', e.currentTarget.value)}
                                            error={errors.address}
                                            minRows={3}
                                            required
                                        />
                                    </Grid.Col>
                                </Grid>
                            </Stack>
                        </Card>

                        {/* Contact Information */}
                        <Card>
                            <Stack>
                                <div>
                                    <Text size="lg" fw={600} mb="sm" className="flex items-center">
                                        <User size={20} className="mr-2" />
                                        Contact Information
                                    </Text>
                                    <Text size="sm" c="dimmed">
                                        Update contact details for the advertiser account.
                                    </Text>
                                </div>

                                <Grid>
                                    <Grid.Col span={{ base: 12, md: 6 }}>
                                        <TextInput
                                            label="Contact Person"
                                            value={advertiser.user.name}
                                            disabled
                                            description="Contact name cannot be changed from this form"
                                        />
                                    </Grid.Col>

                                    <Grid.Col span={{ base: 12, md: 6 }}>
                                        <TextInput
                                            label="Email Address"
                                            placeholder="example@company.com"
                                            type="email"
                                            value={data.email}
                                            onChange={(e) => setData('email', e.currentTarget.value)}
                                            error={errors.email}
                                            required
                                        />
                                    </Grid.Col>

                                    <Grid.Col span={{ base: 12, md: 6 }}>
                                        <TextInput
                                            label="Phone Number"
                                            placeholder="254712345678"
                                            description="Enter phone number in format 254XXXXXXXX"
                                            value={data.phone}
                                            onChange={(e) => setData('phone', e.currentTarget.value)}
                                            error={errors.phone}
                                        />
                                    </Grid.Col>

                                    <Grid.Col span={{ base: 12, md: 6 }}>
                                        <Select
                                            label="Application Status"
                                            description="Change the application status"
                                            value={data.status}
                                            onChange={(value) => setData('status', value as 'pending' | 'approved' | 'rejected')}
                                            data={[
                                                { value: 'pending', label: 'Pending' },
                                                { value: 'approved', label: 'Approved' },
                                                { value: 'rejected', label: 'Rejected' },
                                            ]}
                                            error={errors.status}
                                        />
                                    </Grid.Col>
                                </Grid>
                            </Stack>
                        </Card>

                        {/* Warning Alert */}
                        {data.status !== advertiser.status && (
                            <Alert icon={<AlertCircle size={16} />} color="orange" variant="light">
                                <Text size="sm">
                                    <strong>Status Change:</strong>
                                    <br />• Changing status to "Approved" will activate the user account
                                    <br />• Changing status to "Rejected" will deactivate the user account
                                    <br />• Consider using the Approve/Reject buttons on the details page for proper workflow
                                </Text>
                            </Alert>
                        )}

                        {/* Submit Button */}
                        <Card>
                            <Group justify="flex-end">
                                <Button
                                    variant="light"
                                    component={Link}
                                    href={route('advertisers.show', advertiser.id)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    loading={processing}
                                    disabled={processing}
                                    leftSection={<Save size={16} />}
                                >
                                    Save Changes
                                </Button>
                            </Group>
                        </Card>

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
                </form>
            </div>
        </AuthenticatedLayout>
    );
}