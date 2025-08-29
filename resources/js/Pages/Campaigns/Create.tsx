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
    MultiSelect,
    NumberInput,
    Alert,
} from '@mantine/core';
import { ArrowLeft, Info, Flag } from 'lucide-react';

interface Advertiser {
    id: number;
    company_name: string;
}

interface CampaignFormData {
    advertiser_id?: number;
    name: string;
    description?: string;
    start_date: string;
    end_date: string;
    coverage_areas: string[];
    helmet_count: number | null;
    budget: number | null;
    status: string;
}

interface CampaignCreateProps {
    advertisers: Advertiser[];
    coverage_areas: string[]
}

export default function Create({ advertisers, coverage_areas }: CampaignCreateProps) {
    const { data, setData, post, processing, errors } = useForm<CampaignFormData>({
        advertiser_id: undefined,
        name: '',
        description: '',
        start_date: '',
        end_date: '',
        coverage_areas: [],
        helmet_count: null,
        budget: null,
        status: 'draft',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('campaigns.store'));
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center space-x-4">
                    <Button
                        variant="subtle"
                        leftSection={<ArrowLeft size={16} />}
                        component={Link}
                        href={route('campaigns.index')}
                    >
                        Back to Campaigns
                    </Button>
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                            New Campaign
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Create a new campaign for an advertiser
                        </p>
                    </div>
                </div>
            }
        >
            <Head title="New Campaign" />

            <div className="w-full max-w-7xl mx-auto">
                <form onSubmit={handleSubmit}>
                    <Card withBorder shadow="sm" radius="md" p="lg">
                        <Stack gap="xl">
                            {/* Advertiser */}
                            {/* <Stack>
                                <Text size="lg" fw={600}>Advertiser</Text>
                                <Select
                                    label="Advertiser"
                                    placeholder="Select advertiser"
                                    data={advertisers.map(a => ({
                                        value: a.id.toString(),
                                        label: a.company_name,
                                    }))}
                                    value={data.advertiser_id?.toString() || ''}
                                    onChange={(value) => setData('advertiser_id', value ? parseInt(value) : undefined)}
                                    error={errors.advertiser_id}
                                    required
                                    searchable
                                />
                            </Stack> */}

                            {/* Campaign Information */}
                            <Stack>
                                <Text size="lg" fw={600}>Campaign Information</Text>
                                <Grid>
                                    <Grid.Col span={{ base: 12, md: 6 }}>
                                        <TextInput
                                            label="Campaign Name"
                                            placeholder="Enter campaign name"
                                            value={data.name}
                                            onChange={(e) => setData('name', e.currentTarget.value)}
                                            error={errors.name}
                                            required
                                        />
                                    </Grid.Col>
                                    <Grid.Col span={{ base: 12, md: 6 }}>
                                        <Select
                                            label="Status"
                                            data={[
                                                { value: 'draft', label: 'Draft' },
                                                { value: 'active', label: 'Active' },
                                                { value: 'paused', label: 'Paused' },
                                                { value: 'completed', label: 'Completed' },
                                                { value: 'cancelled', label: 'Cancelled' },
                                            ]}
                                            value={data.status}
                                            onChange={(value) => setData('status', value || 'draft')}
                                            error={errors.status}
                                        />
                                    </Grid.Col>
                                    <Grid.Col span={12}>
                                        <Textarea
                                            label="Description"
                                            placeholder="Enter campaign description"
                                            value={data.description}
                                            onChange={(e) => setData('description', e.currentTarget.value)}
                                            error={errors.description}
                                            minRows={3}
                                        />
                                    </Grid.Col>
                                </Grid>
                            </Stack>

                            {/* Campaign Dates */}
                            <Stack>
                                <Text size="lg" fw={600}>Campaign Dates</Text>
                                <Grid>
                                    <Grid.Col span={{ base: 12, md: 6 }}>
                                        <TextInput
                                            type="date"
                                            label="Start Date"
                                            value={data.start_date}
                                            onChange={(e) => setData('start_date', e.currentTarget.value)}
                                            error={errors.start_date}
                                            required
                                        />
                                    </Grid.Col>
                                    <Grid.Col span={{ base: 12, md: 6 }}>
                                        <TextInput
                                            type="date"
                                            label="End Date"
                                            value={data.end_date}
                                            onChange={(e) => setData('end_date', e.currentTarget.value)}
                                            error={errors.end_date}
                                            required
                                        />
                                    </Grid.Col>
                                </Grid>
                            </Stack>

                            {/* Coverage & Resources */}
                            <Stack>
                                <Text size="lg" fw={600}>Coverage & Resources</Text>
                                <Grid>
                                    <Grid.Col span={12}>
                                        <MultiSelect
                                            label="Coverage Areas"
                                            placeholder="Select coverage areas"
                                            data={[
                                                'nairobi_cbd',
                                                'westlands',
                                                'karen',
                                                'kilimani',
                                                'parklands',
                                                'kasarani',
                                                'embakasi',
                                                'langata',
                                                'dagoretti',
                                                'kibra',
                                                'roysambu',
                                                'mathare'
                                            ]}
                                            value={data.coverage_areas}
                                            onChange={(values) => setData('coverage_areas', values)}
                                            error={errors.coverage_areas}
                                            searchable
                                            clearable
                                            required
                                        />
                                    </Grid.Col>
                                    <Grid.Col span={{ base: 12, md: 6 }}>
                                        <NumberInput
                                            label="Helmet Count"
                                            placeholder="Enter number of helmets"
                                            value={data.helmet_count ?? undefined}
                                            onChange={(val) => setData('helmet_count', val !== '' ? Number(val) : null)}
                                            error={errors.helmet_count}
                                            required
                                        />
                                    </Grid.Col>
                                    <Grid.Col span={{ base: 12, md: 6 }}>
                                        <NumberInput
                                            label="Budget"
                                            placeholder="Enter budget (KES)"
                                            value={data.budget ?? undefined}
                                            onChange={(val) => setData('budget', val !== '' ? Number(val) : null)}
                                            error={errors.budget}
                                            required
                                        />
                                    </Grid.Col>
                                </Grid>
                            </Stack>

                            {/* Info */}
                            <Alert icon={<Info size={16} />} color="blue" variant="light">
                                <Text size="sm">
                                    The campaign will start as <strong>{data.status}</strong>.
                                    Ensure the dates and budget are accurate.
                                </Text>
                            </Alert>

                            {/* Actions */}
                            <Group justify="flex-end">
                                <Button variant="light" component={Link} href={route('campaigns.index')}>
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    loading={processing}
                                    disabled={processing}
                                    leftSection={<Flag size={16} />}
                                >
                                    Create Campaign
                                </Button>
                            </Group>
                        </Stack>
                    </Card>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
