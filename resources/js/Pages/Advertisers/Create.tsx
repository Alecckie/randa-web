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
} from '@mantine/core';
import { ArrowLeft, Info, Building2 } from 'lucide-react';

interface User {
    id: number;
    name: string;
    email: string;
    phone?: string;
}

interface AdvertiserCreateProps {
    users: User[];
}

interface AdvertiserFormData {
    user_id?: number;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    company_name: string;
    business_registration?: string;
    address: string;
    contact_person: string;
}

export default function AdvertiserCreate({ users }: AdvertiserCreateProps) {
    const { data, setData, post, processing, errors } = useForm<AdvertiserFormData>({
        user_id: undefined,
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        company_name: '',
        business_registration: '',
        address: '',
        contact_person: '',
    });

    const [useExistingUser, setUseExistingUser] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('advertisers.store'), {
            onSuccess: () => {
                // Form will redirect on success
            }
        });
    };

    const handleUserTypeChange = (value: string) => {
        const isExistingUser = value === 'existing';
        setUseExistingUser(isExistingUser);
        
        if (isExistingUser) {
            // Clear user fields when using existing user
            setData({
                ...data,
                first_name: '',
                last_name: '',
                email: '',
                phone: '',
                user_id: undefined,
            });
        } else {
            // Clear user_id when creating new user
            setData({
                ...data,
                user_id: undefined,
            });
        }
    };

    const handleExistingUserSelect = (value: string | null) => {
        if (value) {
            const selectedUser = users.find(u => u.id.toString() === value);
            if (selectedUser) {
                setData({
                    ...data,
                    user_id: selectedUser.id,
                    contact_person: selectedUser.name,
                    email: selectedUser.email,
                    phone: selectedUser.phone || '',
                });
            }
        } else {
            setData({
                ...data,
                user_id: undefined,
                email: '',
                phone: '',
            });
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
                        href={route('advertisers.index')}
                    >
                        Back to Advertisers
                    </Button>
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                            New Advertiser Application
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Register a new advertiser with their company details
                        </p>
                    </div>
                </div>
            }
        >
            <Head title="New Advertiser Application" />

            <div className="w-full max-w-7xl mx-auto space-y-6">
                <form onSubmit={handleSubmit}>
                    <Stack>
                        {/* User Selection */}
                        {/* <Card>
                            <Stack>
                                <div>
                                    <Text size="lg" fw={600} mb="sm" className="flex items-center">
                                        <Building2 size={20} className="mr-2" />
                                        User Information
                                    </Text>
                                    <Text size="sm" c="dimmed">
                                        Choose whether to link to an existing user or create new contact details.
                                    </Text>
                                </div>

                                <Select
                                    label="User Type"
                                    placeholder="Select user type"
                                    data={[
                                        { value: 'new', label: 'Create New User' },
                                        { value: 'existing', label: 'Use Existing User' },
                                    ]}
                                    value={useExistingUser ? 'existing' : 'new'}
                                    onChange={(value) => handleUserTypeChange(value || 'new')}
                                />

                                {useExistingUser && (
                                    <Select
                                        label="Select User"
                                        placeholder="Choose an existing user"
                                        data={users.map(user => ({
                                            value: user.id.toString(),
                                            label: `${user.name} (${user.email})`
                                        }))}
                                        value={data.user_id?.toString() || ''}
                                        onChange={handleExistingUserSelect}
                                        error={errors.user_id}
                                        searchable
                                        clearable
                                    />
                                )}
                            </Stack>
                        </Card> */}

                        {/* Company Information */}
                        <Card>
                            <Stack>
                                <div>
                                    <Text size="lg" fw={600} mb="sm">Company Information</Text>
                                    <Text size="sm" c="dimmed">
                                        Provide the company details for the advertiser account.
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
                                    <Text size="lg" fw={600} mb="sm">Contact Information</Text>
                                    <Text size="sm" c="dimmed">
                                        {useExistingUser 
                                            ? "Contact details from the selected user account." 
                                            : "Create login credentials and contact details for the new advertiser account. The phone number will be used as the login password."}
                                    </Text>
                                </div>

                                {!useExistingUser && (
                                    <Grid>
                                        <Grid.Col span={{ base: 12, md: 6 }}>
                                            <TextInput
                                                label="First Name"
                                                placeholder="Enter first name"
                                                value={data.first_name}
                                                onChange={(e) => setData('first_name', e.currentTarget.value)}
                                                error={errors.first_name}
                                                required
                                            />
                                        </Grid.Col>

                                        <Grid.Col span={{ base: 12, md: 6 }}>
                                            <TextInput
                                                label="Last Name"
                                                placeholder="Enter last name"
                                                value={data.last_name}
                                                onChange={(e) => setData('last_name', e.currentTarget.value)}
                                                error={errors.last_name}
                                                required
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
                                                description="Enter phone number in format 254XXXXXXXX (will be used as login password)"
                                                value={data.phone}
                                                onChange={(e) => setData('phone', e.currentTarget.value)}
                                                error={errors.phone}
                                                required
                                            />
                                        </Grid.Col>
                                    </Grid>
                                )}

                                <Grid>
                                    <Grid.Col span={{ base: 12, md: 6 }}>
                                        <TextInput
                                            label="Contact Person Name"
                                            placeholder="Enter contact person name"
                                            description="Primary contact person for this account"
                                            value={data.contact_person}
                                            onChange={(e) => setData('contact_person', e.currentTarget.value)}
                                            error={errors.contact_person}
                                            disabled={useExistingUser && !!data.user_id}
                                            required
                                        />
                                    </Grid.Col>

                                    {useExistingUser && (
                                        <>
                                            <Grid.Col span={{ base: 12, md: 6 }}>
                                                <TextInput
                                                    label="Email Address"
                                                    value={data.email}
                                                    disabled
                                                    description="Email from selected user account"
                                                />
                                            </Grid.Col>

                                            <Grid.Col span={{ base: 12, md: 6 }}>
                                                <TextInput
                                                    label="Phone Number"
                                                    value={data.phone || 'No phone number'}
                                                    disabled
                                                    description="Phone from selected user account"
                                                />
                                            </Grid.Col>
                                        </>
                                    )}
                                </Grid>
                            </Stack>
                        </Card>

                        {/* Information Alert */}
                        <Alert icon={<Info size={16} />} color="blue" variant="light">
                            <Text size="sm">
                                <strong>Application Process:</strong>
                                <br />• The application will be submitted with "pending" status
                                <br />• Admin review is required before approval
                                <br />• The advertiser will be notified once the application is reviewed
                                <br />• Account access will be granted upon approval
                            </Text>
                        </Alert>

                        {/* Submit Button */}
                        <Card>
                            <Group justify="flex-end">
                                <Button
                                    variant="light"
                                    component={Link}
                                    href={route('advertisers.index')}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    loading={processing}
                                    disabled={processing}
                                    leftSection={<Building2 size={16} />}
                                >
                                    Submit Application
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