import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link } from '@inertiajs/react';
import {
    Button,
    TextInput,
    Select,
    Card,
    Group,
    Text,
    Stack,
    Grid,
    Alert,
} from '@mantine/core';
import { ArrowLeft, Info, HardHat, QrCodeIcon } from 'lucide-react';

interface HelmetFormData {
    helmet_code: string;
    status: string;
}

export default function Create() {
    const { data, setData, post, processing, errors } = useForm<HelmetFormData>({
        helmet_code: '',
        status: 'available',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('helmets.store'));
    };

    const generateHelmetCode = () => {
        const timestamp = Date.now().toString().slice(-6);
        const randomNum = Math.floor(Math.random() * 999).toString().padStart(3, '0');
        const generatedCode = `HMT${timestamp}${randomNum}`;
        setData('helmet_code', generatedCode);
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center space-x-4">
                    <Button
                        variant="subtle"
                        leftSection={<ArrowLeft size={16} />}
                        component={Link}
                        href={route('helmets.index')}
                    >
                        Back to Helmets
                    </Button>
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                            Add New Helmet
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Create a new helmet entry in the inventory
                        </p>
                    </div>
                </div>
            }
        >
            <Head title="Add New Helmet" />

            <div className="w-full max-w-7xl mx-auto">
                <form onSubmit={handleSubmit}>
                    <Card withBorder shadow="sm" radius="md" p="lg">
                        <Stack gap="xl">
                            {/* Helmet Information */}
                            <Stack>
                                <Group>
                                    <HardHat size={24} className="text-blue-500" />
                                    <Text size="lg" fw={600}>Helmet Information</Text>
                                </Group>
                                <Grid>
                                    <Grid.Col span={12}>
                                        <Group align="end">
                                            <div style={{ flex: 1 }}>
                                                <TextInput
                                                    label="Helmet Code"
                                                    placeholder="Enter helmet code (e.g., HMT123456789)"
                                                    value={data.helmet_code}
                                                    onChange={(e) => setData('helmet_code', e.currentTarget.value.toUpperCase())}
                                                    error={errors.helmet_code}
                                                    required
                                                    description="Unique identifier for the helmet. Use uppercase letters, numbers, underscores, and hyphens only."
                                                />
                                            </div>
                                            <Button
                                                variant="light"
                                                onClick={generateHelmetCode}
                                                leftSection={<QrCodeIcon size={16} />}
                                            >
                                                Generate Code
                                            </Button>
                                        </Group>
                                    </Grid.Col>
                                    <Grid.Col span={{ base: 12, md: 6 }}>
                                        <Select
                                            label="Status"
                                            data={[
                                                { value: 'available', label: 'Available' },
                                                { value: 'maintenance', label: 'Maintenance' },
                                                { value: 'retired', label: 'Retired' },
                                            ]}
                                            value={data.status}
                                            onChange={(value) => setData('status', value || 'available')}
                                            error={errors.status}
                                            description="Initial status of the helmet"
                                        />
                                    </Grid.Col>
                                </Grid>
                            </Stack>

                            {/* Status Information */}
                            <Alert icon={<Info size={16} />} color="blue" variant="light">
                                <Stack gap="xs">
                                    <Text size="sm" fw={500}>Helmet Status Information</Text>
                                    <div className="text-sm space-y-1">
                                        <div><strong>Available:</strong> Ready for assignment to campaigns</div>
                                        <div><strong>Maintenance:</strong> Under repair or servicing</div>
                                        <div><strong>Retired:</strong> No longer in service</div>
                                    </div>
                                </Stack>
                            </Alert>

                            {/* QR Code Information */}
                            <Alert icon={<QrCodeIcon size={16} />} color="green" variant="light">
                                <Text size="sm">
                                    <strong>QR Code Generation:</strong> A unique QR code will be automatically generated 
                                    for this helmet upon creation. This code will be used for tracking and scanning purposes.
                                </Text>
                            </Alert>

                            {/* Actions */}
                            <Group justify="flex-end">
                                <Button variant="light" component={Link} href={route('helmets.index')}>
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    loading={processing}
                                    disabled={processing}
                                    leftSection={<HardHat size={16} />}
                                >
                                    Create Helmet
                                </Button>
                            </Group>
                        </Stack>
                    </Card>
                </form>

                {/* Additional Information Card */}
                {/* <Card withBorder shadow="sm" radius="md" p="lg" className="mt-6">
                    <Stack gap="md">
                        <Group>
                            <Info size={20} className="text-blue-500" />
                            <Text size="md" fw={600}>Additional Information</Text>
                        </Group>
                        <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
                            <div>
                                <Text fw={500} className="mb-2">Helmet Code Guidelines:</Text>
                                <ul className="list-disc list-inside space-y-1 ml-4">
                                    <li>Must be unique across all helmets</li>
                                    <li>Use only uppercase letters, numbers, underscores, and hyphens</li>
                                    <li>Recommended format: HMT + timestamp + random digits</li>
                                    <li>Example: HMT123456789</li>
                                </ul>
                            </div>
                            
                            <div>
                                <Text fw={500} className="mb-2">After Creation:</Text>
                                <ul className="list-disc list-inside space-y-1 ml-4">
                                    <li>A unique QR code will be automatically generated</li>
                                    <li>The helmet will appear in the inventory</li>
                                    <li>Status can be updated later from the helmet list</li>
                                    <li>Assignment to campaigns is handled separately</li>
                                </ul>
                            </div>

                           
                        </div>
                    </Stack>
                </Card> */}
            </div>
        </AuthenticatedLayout>
    );
}