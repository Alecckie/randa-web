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
    Badge,
} from '@mantine/core';
import {
    ArrowLeft,
    Info,
    HardHat,
    QrCodeIcon,
    SaveIcon,
    AlertTriangleIcon,
} from 'lucide-react';

interface Helmet {
    id: number;
    helmet_code: string;
    qr_code?: string;
    status: 'available' | 'assigned' | 'maintenance' | 'retired';
    current_branding?: string;
    created_at: string;
    updated_at: string;
    current_assignment?: {
        id: number;
        campaign: { id: number; name: string };
        rider: { id: number; name: string };
    };
}

interface HelmetFormData {
    helmet_code: string;
    status: string;
    current_branding: string;
}

interface EditProps {
    helmet: Helmet;
}

export default function Edit({ helmet }: EditProps) {
    const { data, setData, put, processing, errors } = useForm<HelmetFormData>({
        helmet_code: helmet.helmet_code,
        status: helmet.status,
        current_branding: helmet.current_branding || '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('helmets.update', helmet.id));
    };

    const getStatusColor = (status: Helmet['status']) => {
        const colors: Record<string, string> = {
            available: 'green',
            assigned: 'blue',
            maintenance: 'yellow',
            retired: 'red',
        };
        return colors[status] || 'gray';
    };

    const isAssigned = helmet.status === 'assigned';

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center space-x-4">
                    <Button
                        variant="subtle"
                        leftSection={<ArrowLeft size={16} />}
                        component={Link}
                        href={route('helmets.show', helmet.id)}
                    >
                        Back to Helmet
                    </Button>
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                            Edit Helmet
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Update details for <span className="font-mono font-semibold">{helmet.helmet_code}</span>
                        </p>
                    </div>
                </div>
            }
        >
            <Head title={`Edit Helmet — ${helmet.helmet_code}`} />

            <div className="w-full max-w-7xl mx-auto">
                <form onSubmit={handleSubmit}>
                    <Stack gap="lg">
                        {/* Warning if helmet is currently assigned */}
                        {isAssigned && (
                            <Alert
                                icon={<AlertTriangleIcon size={16} />}
                                color="orange"
                                variant="light"
                                title="Helmet Currently Assigned"
                            >
                                This helmet is currently assigned to campaign{' '}
                                <strong>{helmet.current_assignment?.campaign.name}</strong> and ridden by{' '}
                                <strong>{helmet.current_assignment?.rider.name}</strong>. Changing the status
                                may affect the active campaign assignment.
                            </Alert>
                        )}

                        <Card withBorder shadow="sm" radius="md" p="lg">
                            <Stack gap="xl">
                                {/* Helmet Information */}
                                <Stack>
                                    <Group>
                                        <HardHat size={24} className="text-blue-500" />
                                        <Text size="lg" fw={600}>Helmet Information</Text>
                                        <Badge color={getStatusColor(helmet.status)} variant="light" size="sm">
                                            Current: {helmet.status.charAt(0).toUpperCase() + helmet.status.slice(1)}
                                        </Badge>
                                    </Group>

                                    <Grid>
                                        {/* Helmet Code */}
                                        <Grid.Col span={12}>
                                            <TextInput
                                                label="Helmet Code"
                                                placeholder="Enter helmet code (e.g., HMT123456789)"
                                                value={data.helmet_code}
                                                onChange={(e) =>
                                                    setData('helmet_code', e.currentTarget.value.toUpperCase())
                                                }
                                                error={errors.helmet_code}
                                                required
                                                description="Unique identifier for the helmet. Use uppercase letters, numbers, underscores, and hyphens only."
                                                disabled={isAssigned}
                                            />
                                            {isAssigned && (
                                                <Text size="xs" c="dimmed" mt={4}>
                                                    Helmet code cannot be changed while the helmet is assigned.
                                                </Text>
                                            )}
                                        </Grid.Col>

                                        {/* Status */}
                                        <Grid.Col span={{ base: 12, md: 12 }}>
                                            <Select
                                                label="Status"
                                                data={[
                                                    { value: 'available', label: 'Available' },
                                                    { value: 'assigned', label: 'Assigned' },
                                                    { value: 'maintenance', label: 'Maintenance' },
                                                    { value: 'retired', label: 'Retired' },
                                                ]}
                                                value={data.status}
                                                onChange={(value) => setData('status', value || 'available')}
                                                error={errors.status}
                                                description="Current operational status of the helmet"
                                            />
                                        </Grid.Col>

                                        {/* Current Branding */}
                                        {/* <Grid.Col span={{ base: 12, md: 6 }}>
                                            <TextInput
                                                label="Current Branding"
                                                placeholder="e.g., Campaign name or brand"
                                                value={data.current_branding}
                                                onChange={(e) => setData('current_branding', e.currentTarget.value)}
                                                error={errors.current_branding}
                                                description="Active branding or campaign name on this helmet"
                                            />
                                        </Grid.Col> */}
                                    </Grid>
                                </Stack>

                                {/* QR Code Info (read-only) */}
                                {helmet.qr_code && (
                                    <Stack>
                                        <Group>
                                            <QrCodeIcon size={20} className="text-green-500" />
                                            <Text size="md" fw={600}>QR Code</Text>
                                        </Group>
                                        <Card withBorder p="sm" radius="sm" className="bg-gray-50 dark:bg-gray-900">
                                            <Group>
                                                <QrCodeIcon size={16} className="text-gray-400" />
                                                <Text size="sm" className="font-mono text-gray-700 dark:text-gray-300">
                                                    {helmet.qr_code}
                                                </Text>
                                            </Group>
                                            <Text size="xs" c="dimmed" mt={4}>
                                                QR codes are system-generated and cannot be manually edited.
                                            </Text>
                                        </Card>
                                    </Stack>
                                )}

                                {/* Status Information Alert */}
                                <Alert icon={<Info size={16} />} color="blue" variant="light">
                                    <Stack gap="xs">
                                        <Text size="sm" fw={500}>Helmet Status Guide</Text>
                                        <div className="text-sm space-y-1">
                                            <div><strong>Available:</strong> Ready for assignment to campaigns</div>
                                            <div><strong>Assigned:</strong> Currently deployed in an active campaign</div>
                                            <div><strong>Maintenance:</strong> Under repair or servicing</div>
                                            <div><strong>Retired:</strong> No longer in service</div>
                                        </div>
                                    </Stack>
                                </Alert>

                                {/* Actions */}
                                <Group justify="flex-end">
                                    <Button
                                        variant="light"
                                        component={Link}
                                        href={route('helmets.show', helmet.id)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        loading={processing}
                                        disabled={processing}
                                        leftSection={<SaveIcon size={16} />}
                                    >
                                        Save Changes
                                    </Button>
                                </Group>
                            </Stack>
                        </Card>
                    </Stack>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}