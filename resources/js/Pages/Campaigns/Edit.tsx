import { useState, useCallback, useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, Link, usePage } from '@inertiajs/react';
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
    Checkbox,
    FileInput,
    Divider,
    Container,
    Badge,
    rem
} from '@mantine/core';
import {
    ArrowLeft,
    Info,
    Upload,
    FileText,
    MapPin,
    Users,
    Palette,
    Building,
    Save,
} from 'lucide-react';

interface Advertiser {
    id: number;
    company_name: string;
}

interface CoverageArea {
    id: number;
    name: string;
}

interface RiderDemographic {
    id: number;
    age_group: string;
    gender: string;
    rider_type: string;
}

interface Campaign {
    id: number;
    name: string;
    description: string | null;
    business_type: string | null;
    start_date: string;
    end_date: string;
    helmet_count: number;
    need_design: boolean;
    design_file: string | null;
    design_requirements: string | null;
    require_vat_receipt: boolean;
    special_instructions: string | null;
    status: string;
    advertiser: {
        id: number;
        company_name: string;
    };
    coverage_areas: CoverageArea[];
    rider_demographics: RiderDemographic[];
}

interface CampaignEditProps {
    campaign: Campaign;
    advertisers: Advertiser[];
    coverageareas: CoverageArea[];
}

export default function Edit({ campaign, coverageareas }: CampaignEditProps) {
    const { errors: pageErrors } = usePage().props as { errors?: Record<string, string> };

    const [name, setName] = useState(campaign.name || '');
    const [description, setDescription] = useState(campaign.description || '');
    const [businessType, setBusinessType] = useState(campaign.business_type || '');
    const [startDate, setStartDate] = useState(campaign.start_date?.slice(0, 10) || '');
    const [endDate, setEndDate] = useState(campaign.end_date?.slice(0, 10) || '');
    const [coverageAreaIds, setCoverageAreaIds] = useState<string[]>(
        (campaign.coverage_areas || []).map(a => a.id.toString())
    );
    const [helmetCount, setHelmetCount] = useState<number | string>(campaign.helmet_count ?? '');
    const [needDesign, setNeedDesign] = useState(campaign.need_design);
    const [designFile, setDesignFile] = useState<File | null>(null);
    const [designRequirements, setDesignRequirements] = useState(campaign.design_requirements || '');
    const [requireVatReceipt, setRequireVatReceipt] = useState(campaign.require_vat_receipt);
    const [specialInstructions, setSpecialInstructions] = useState(campaign.special_instructions || '');

    const initialDemographics = useMemo(() => {
        const rows = campaign.rider_demographics || [];
        return {
            age_groups: [...new Set(rows.map(r => r.age_group))],
            genders: [...new Set(rows.map(r => r.gender))],
            rider_types: [...new Set(rows.map(r => r.rider_type))],
        };
    }, [campaign.rider_demographics]);

    const [ageGroups, setAgeGroups] = useState<string[]>(initialDemographics.age_groups);
    const [genders, setGenders] = useState<string[]>(initialDemographics.genders);
    const [riderTypes, setRiderTypes] = useState<string[]>(initialDemographics.rider_types);

    const [submitting, setSubmitting] = useState(false);
    const errors = pageErrors || {};

    const coverageAreaOptions = useMemo(() =>
        coverageareas?.map(area => ({ value: area.id.toString(), label: area.name })) || [],
        [coverageareas]
    );

    const businessTypeOptions = useMemo(() => [
        { value: 'retail', label: 'Retail' },
        { value: 'food_beverage', label: 'Food & Beverage' },
        { value: 'technology', label: 'Technology' },
        { value: 'healthcare', label: 'Healthcare' },
        { value: 'education', label: 'Education' },
        { value: 'finance', label: 'Finance' },
        { value: 'other', label: 'Other' },
    ], []);

    const ageGroupOptions = useMemo(() => [
        { value: '18-25', label: '18-25 years' },
        { value: '26-35', label: '26-35 years' },
        { value: '36-45', label: '36-45 years' },
        { value: '46-55', label: '46-55 years' },
        { value: '55+', label: '55+ years' },
    ], []);

    const genderOptions = useMemo(() => [
        { value: 'male', label: 'Male' },
        { value: 'female', label: 'Female' },
        { value: 'any', label: 'Any' },
    ], []);

    const riderTypeOptions = useMemo(() => [
        { value: 'courier', label: 'Courier' },
        { value: 'boda', label: 'Boda Boda' },
        { value: 'delivery', label: 'Delivery' },
        { value: 'taxi', label: 'Taxi' },
    ], []);

    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        router.post(route('campaigns.update', campaign.id), {
            _method: 'put',
            name,
            description,
            business_type: businessType,
            start_date: startDate,
            end_date: endDate,
            coverage_area_ids: coverageAreaIds.map(id => parseInt(id)),
            helmet_count: helmetCount === '' ? null : Number(helmetCount),
            need_design: needDesign,
            design_file: designFile,
            design_requirements: designRequirements,
            rider_demographics: {
                age_groups: ageGroups,
                genders,
                rider_types: riderTypes,
            },
            require_vat_receipt: requireVatReceipt,
            special_instructions: specialInstructions,
        }, {
            forceFormData: designFile !== null,
            onFinish: () => setSubmitting(false),
        });
    }, [
        campaign.id, name, description, businessType, startDate, endDate,
        coverageAreaIds, helmetCount, needDesign, designFile, designRequirements,
        ageGroups, genders, riderTypes, requireVatReceipt, specialInstructions,
    ]);

    return (
        <AuthenticatedLayout
            header={
                <Container size="xl">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
                        <Button
                            variant="subtle"
                            leftSection={<ArrowLeft size={16} />}
                            component={Link}
                            href={route('campaigns.show', campaign.id)}
                            size="md"
                            style={{ borderRadius: rem(8) }}
                        >
                            Back to Campaign
                        </Button>
                        <div className="flex-1">
                            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                                Edit Campaign
                            </h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {campaign.name}
                            </p>
                        </div>
                        <Badge size="lg" variant="light">{campaign.status.toUpperCase()}</Badge>
                    </div>
                </Container>
            }
        >
            <Head title={`Edit: ${campaign.name}`} />

            <Container size="100%" px="sm" py="md">
                <Card withBorder shadow="lg" radius="xl" p={{ base: 'md', sm: 'lg' }} className="w-full max-w-none">
                    <form onSubmit={handleSubmit}>
                        <Stack gap="xl">
                            <Stack gap="md">
                                <Text fw={600} size="lg" className="flex items-center gap-2 text-gray-800">
                                    <FileText size={20} className="text-[#f79122]" />
                                    Basic Campaign Information
                                </Text>
                                <Grid>
                                    <Grid.Col span={12}>
                                        <TextInput
                                            label="Advertiser"
                                            value={campaign.advertiser?.company_name || ''}
                                            readOnly
                                            disabled
                                            leftSection={<Building size={16} />}
                                            description="The advertiser cannot be changed after a campaign is created."
                                        />
                                    </Grid.Col>
                                    <Grid.Col span={{ base: 12, md: 6 }}>
                                        <TextInput
                                            label="Campaign Name"
                                            value={name}
                                            onChange={(e) => setName(e.currentTarget.value)}
                                            error={errors.name}
                                            required
                                        />
                                    </Grid.Col>
                                    <Grid.Col span={{ base: 12, md: 6 }}>
                                        <Select
                                            label="Business Type"
                                            data={businessTypeOptions}
                                            value={businessType}
                                            onChange={(v) => setBusinessType(v || '')}
                                            error={errors.business_type}
                                            searchable
                                        />
                                    </Grid.Col>
                                    <Grid.Col span={12}>
                                        <Textarea
                                            label="Campaign Description"
                                            value={description}
                                            onChange={(e) => setDescription(e.currentTarget.value)}
                                            error={errors.description}
                                            minRows={3}
                                        />
                                    </Grid.Col>
                                </Grid>
                            </Stack>

                            <Divider />

                            <Stack gap="md">
                                <Text fw={600} size="lg" className="flex items-center gap-2 text-gray-800">
                                    <MapPin size={20} className="text-[#f79122]" />
                                    Campaign Details & Coverage
                                </Text>
                                <Grid>
                                    <Grid.Col span={{ base: 12, md: 6 }}>
                                        <TextInput
                                            type="date"
                                            label="Start Date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.currentTarget.value)}
                                            error={errors.start_date}
                                            required
                                        />
                                    </Grid.Col>
                                    <Grid.Col span={{ base: 12, md: 6 }}>
                                        <TextInput
                                            type="date"
                                            label="End Date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.currentTarget.value)}
                                            error={errors.end_date}
                                            required
                                        />
                                    </Grid.Col>
                                    <Grid.Col span={12}>
                                        <MultiSelect
                                            label="Coverage Areas"
                                            data={coverageAreaOptions}
                                            value={coverageAreaIds}
                                            onChange={setCoverageAreaIds}
                                            error={errors.coverage_area_ids}
                                            searchable
                                            clearable
                                            required
                                        />
                                    </Grid.Col>
                                    <Grid.Col span={{ base: 12, md: 6 }}>
                                        <NumberInput
                                            label="Number of Helmets"
                                            value={helmetCount}
                                            onChange={setHelmetCount}
                                            error={errors.helmet_count}
                                            min={1}
                                            max={10000}
                                            required
                                        />
                                    </Grid.Col>
                                </Grid>

                                <Divider label="Rider Demographics (Optional)" labelPosition="center" size="sm" />
                                <Grid>
                                    <Grid.Col span={{ base: 12, md: 4 }}>
                                        <MultiSelect
                                            label="Preferred Age Groups"
                                            data={ageGroupOptions}
                                            value={ageGroups}
                                            onChange={setAgeGroups}
                                        />
                                    </Grid.Col>
                                    <Grid.Col span={{ base: 12, md: 4 }}>
                                        <MultiSelect
                                            label="Gender Preference"
                                            data={genderOptions}
                                            value={genders}
                                            onChange={setGenders}
                                        />
                                    </Grid.Col>
                                    <Grid.Col span={{ base: 12, md: 4 }}>
                                        <MultiSelect
                                            label="Rider Types"
                                            data={riderTypeOptions}
                                            value={riderTypes}
                                            onChange={setRiderTypes}
                                        />
                                    </Grid.Col>
                                </Grid>
                            </Stack>

                            <Divider />

                            <Stack gap="md">
                                <Text fw={600} size="lg" className="flex items-center gap-2 text-gray-800">
                                    <Palette size={20} className="text-[#f79122]" />
                                    Design Requirements
                                </Text>
                                <Card withBorder p="lg" radius="md">
                                    <Checkbox
                                        label="Needs design services (+ KES 3,000)"
                                        description="Our professional designers will create the helmet graphics"
                                        checked={needDesign}
                                        onChange={(e) => setNeedDesign(e.currentTarget.checked)}
                                    />
                                </Card>

                                {needDesign ? (
                                    <Textarea
                                        label="Design Requirements"
                                        value={designRequirements}
                                        onChange={(e) => setDesignRequirements(e.currentTarget.value)}
                                        error={errors.design_requirements}
                                        minRows={4}
                                    />
                                ) : (
                                    <Stack gap="xs">
                                        {campaign.design_file && !designFile && (
                                            <Text size="sm" c="dimmed">
                                                Current file: <a href={`/storage/${campaign.design_file}`} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                                                    View uploaded design
                                                </a>
                                            </Text>
                                        )}
                                        <FileInput
                                            label="Replace Design File (optional)"
                                            placeholder="Upload a new file (JPG, PNG, PDF, AI, PSD)"
                                            accept=".jpg,.jpeg,.png,.pdf,.ai,.psd"
                                            value={designFile}
                                            onChange={setDesignFile}
                                            error={errors.design_file}
                                            leftSection={<Upload size={16} />}
                                            clearable
                                        />
                                    </Stack>
                                )}
                            </Stack>

                            <Divider />

                            <Stack gap="md">
                                <Text fw={600} size="lg" className="flex items-center gap-2 text-gray-800">
                                    <Users size={20} className="text-orange-600" />
                                    Additional Details
                                </Text>
                                <Card withBorder p="lg" radius="md">
                                    <Checkbox
                                        label="Requires a VAT receipt"
                                        checked={requireVatReceipt}
                                        onChange={(e) => setRequireVatReceipt(e.currentTarget.checked)}
                                    />
                                </Card>
                                <Textarea
                                    label="Special Instructions"
                                    value={specialInstructions}
                                    onChange={(e) => setSpecialInstructions(e.currentTarget.value)}
                                    minRows={3}
                                />
                            </Stack>

                            <Alert icon={<Info size={16} />} color="blue" variant="light">
                                <Text size="sm">
                                    Changing helmets, dates, or design will recalculate the campaign's cost. The advertiser cannot be changed here.
                                </Text>
                            </Alert>

                            <Group justify="flex-end" pt="md">
                                <Button
                                    variant="light"
                                    component={Link}
                                    href={route('campaigns.show', campaign.id)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    loading={submitting}
                                    leftSection={<Save size={16} />}
                                    variant="filled"
                                    color="orange"
                                >
                                    Save Changes
                                </Button>
                            </Group>
                        </Stack>
                    </form>
                </Card>
            </Container>
        </AuthenticatedLayout>
    );
}
