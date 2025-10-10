import { useState, useCallback, useMemo, useEffect } from 'react';
import { router } from '@inertiajs/react';
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
    Stepper,
    Checkbox,
    FileInput,
    Divider,
    Paper,
    Title,
    Table,
    Loader,
    Progress,
    Modal,
    Box,
    rem
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
    Info,
    Flag,
    Upload,
    Calculator,
    CheckCircle,
    ArrowRight,
    ArrowLeft,
    Eye,
    FileText,
    MapPin,
    Users,
    Palette,
    Plus,
    Building
} from 'lucide-react';
import type { User } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { Advertiser } from '@/types/advertiser';



interface CoverageArea {
    id: number;
    name: string;
    area_code?: string;
    county?: string;
    sub_county?: string;
    ward?: string;
}

interface CampaignFormData {
    advertiser_id: number | null;
    name: string;
    description: string;
    business_type: string;
    start_date: string;
    end_date: string;
    coverage_areas: string[];
    helmet_count: number | null;
    need_design: boolean;
    design_file: File | null;
    design_requirements: string;
    rider_demographics: {
        age_groups: string[];
        genders: string[];
        rider_types: string[];
    };
    require_vat_receipt: boolean;
    agree_to_terms: boolean;
    special_instructions: string;
    status: string;
}

interface CostBreakdown {
    helmet_count: number;
    duration_days: number;
    daily_rate: number;
    base_cost: number;
    design_cost: number;
    subtotal: number;
    vat_amount: number;
    total_cost: number;
    currency: string;
}



interface CampaignFormProps {
    advertiser: Advertiser
    advertisers: Advertiser[];
    coverageareas: CoverageArea[];
}

export default function CampaignForm({ advertiser, advertisers, coverageareas }: CampaignFormProps) {
    const { isAdmin } = useAuth();
    const [formData, setFormData] = useState<CampaignFormData>({
        advertiser_id: isAdmin() ? null : advertiser?.id,
        name: '',
        description: '',
        business_type: '',
        start_date: '',
        end_date: '',
        coverage_areas: [],
        helmet_count: null,
        need_design: false,
        design_file: null,
        design_requirements: '',
        rider_demographics: {
            age_groups: [],
            genders: [],
            rider_types: []
        },
        require_vat_receipt: false,
        agree_to_terms: true,
        special_instructions: '',
        status: 'draft',
    });

    const [activeStep, setActiveStep] = useState(0);
    const [costBreakdown, setCostBreakdown] = useState<CostBreakdown | null>(null);
    const [loadingCosts, setLoadingCosts] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [coverageAreaModalOpened, { open: openCoverageModal, close: closeCoverageModal }] = useDisclosure(false);
    const [newCoverageArea, setNewCoverageArea] = useState({
        name: '',
        county_id: null as number | null,
        description: ''
    });

    // Memoize options
    const advertiserOptions = useMemo(() =>
        advertisers?.map(advertiser => ({
            value: advertiser.id.toString(),
            label: advertiser.company_name
        })) || [], [advertisers]
    );

    const coverageAreaOptions = useMemo(() =>
        coverageareas?.map(area => ({
            value: area?.id.toString(),
            label: area?.name
        })) || [], [coverageareas]
    );

    const businessTypeOptions = useMemo(() => [
        { value: 'retail', label: 'Retail' },
        { value: 'food_beverage', label: 'Food & Beverage' },
        { value: 'technology', label: 'Technology' },
        { value: 'healthcare', label: 'Healthcare' },
        { value: 'education', label: 'Education' },
        { value: 'finance', label: 'Finance' },
        { value: 'other', label: 'Other' }
    ], []);

    const ageGroupOptions = useMemo(() => [
        { value: '18-25', label: '18-25 years' },
        { value: '26-35', label: '26-35 years' },
        { value: '36-45', label: '36-45 years' },
        { value: '46-55', label: '46-55 years' },
        { value: '55+', label: '55+ years' }
    ], []);

    const genderOptions = useMemo(() => [
        { value: 'male', label: 'Male' },
        { value: 'female', label: 'Female' },
        { value: 'any', label: 'Any' }
    ], []);

    const riderTypeOptions = useMemo(() => [
        { value: 'courier', label: 'Courier' },
        { value: 'boda', label: 'Boda Boda' },
        { value: 'delivery', label: 'Delivery' },
        { value: 'taxi', label: 'Taxi' }
    ], []);

    const updateFormData = useCallback((updates: Partial<CampaignFormData>) => {
        setFormData(prev => ({ ...prev, ...updates }));
    }, []);

    const duration = useMemo(() => {
        if (formData.start_date && formData.end_date) {
            const start = new Date(formData.start_date);
            const end = new Date(formData.end_date);
            return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
        }
        return 0;
    }, [formData.start_date, formData.end_date]);

    const calculateCosts = useCallback(() => {
        if (!formData.helmet_count || !duration) return;

        setLoadingCosts(true);

        setTimeout(() => {
            const baseCost = formData.helmet_count! * duration * 200;
            const designCost = formData.need_design ? 3000 : 0;
            const subtotal = baseCost + designCost;
            const vatAmount = subtotal * 0.16;
            const totalCost = subtotal + vatAmount;

            setCostBreakdown({
                helmet_count: formData.helmet_count!,
                duration_days: duration,
                daily_rate: 200,
                base_cost: baseCost,
                design_cost: designCost,
                subtotal: subtotal,
                vat_amount: vatAmount,
                total_cost: totalCost,
                currency: 'KES'
            });
            setLoadingCosts(false);
        }, 1000);
    }, [formData.helmet_count, duration, formData.need_design]);

    useEffect(() => {
        if (activeStep === 4 && formData.helmet_count && duration && !costBreakdown && !loadingCosts) {
            calculateCosts();
        }
    }, [activeStep, formData.helmet_count, duration, costBreakdown, loadingCosts, calculateCosts]);

    const nextStep = useCallback(() => {
        if (activeStep === 3) {
            calculateCosts();
        }
        setActiveStep(current => Math.min(current + 1, 5));
    }, [activeStep, calculateCosts]);

    const prevStep = useCallback(() => {
        setActiveStep(current => Math.max(current - 1, 0));
    }, []);

    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        if (activeStep === 5) {
            setSubmitting(true);

            const submissionData = {
                ...formData,
                coverage_area_ids: formData.coverage_areas.map(id => parseInt(id)),
                advertiser_id: formData.advertiser_id ? parseInt(formData.advertiser_id.toString()) : null
            };

            router.post(route('my-campaigns.store'), submissionData, {
                onSuccess: () => {
                    setSubmitting(false);
                },
                onError: (errors: Record<string, string>) => {
                    setErrors(errors);
                    setSubmitting(false);
                },
                forceFormData: formData.design_file !== null
            });
        } else {
            nextStep();
        }
    }, [activeStep, formData, nextStep]);

    const isStepValid = useMemo(() => {
        switch (activeStep) {
            case 0:
                return formData.advertiser_id && formData.name && formData.business_type;
            case 1:
                return formData.start_date && formData.end_date && formData.coverage_areas.length > 0 && formData.helmet_count;
            case 2:
                return formData.need_design ? formData.design_requirements : (formData.design_file || formData.need_design);
            case 3:
                return true;
            case 4:
                return costBreakdown !== null;
            case 5:
                return formData.agree_to_terms;
            default:
                return true;
        }
    }, [activeStep, formData, costBreakdown]);

    const handleCreateCoverageArea = useCallback(() => {
        router.post(route('coverage-areas.store'), newCoverageArea, {
            onSuccess: () => {
                closeCoverageModal();
                setNewCoverageArea({ name: '', county_id: null, description: '' });
                router.reload({ only: ['coverageareas'] });
            }
        });
    }, [newCoverageArea, closeCoverageModal]);

    // Step components
    const StepBasicInfo = useMemo(() => (
        <Stack gap="md">
            <Title order={3} className="flex items-center gap-2 text-gray-800">
                <FileText size={20} className="text-blue-600" />
                Basic Campaign Information
            </Title>
            <Grid>
                {isAdmin() && (
                    <Grid.Col span={12}>
                        <Select
                            label="Advertiser"
                            placeholder="Select the advertiser for this campaign"
                            data={advertiserOptions}
                            value={formData.advertiser_id?.toString() || null}
                            onChange={(value) => updateFormData({ advertiser_id: value ? parseInt(value) : null })}
                            error={errors.advertiser_id}
                            searchable
                            required
                            size="md"
                            leftSection={<Building size={16} />}
                        />
                    </Grid.Col>

                )}

                <Grid.Col span={{ base: 12, md: 6 }}>
                    <TextInput
                        label="Campaign Name"
                        placeholder="e.g., Summer Brand Awareness Campaign"
                        value={formData.name}
                        onChange={(e) => updateFormData({ name: e.currentTarget.value })}
                        error={errors.name}
                        required
                        size="md"
                    />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                    <Select
                        label="Business Type"
                        placeholder="Select your business type"
                        data={businessTypeOptions}
                        value={formData.business_type}
                        onChange={(value) => updateFormData({ business_type: value || '' })}
                        error={errors.business_type}
                        searchable
                        size="md"
                    />
                </Grid.Col>
                <Grid.Col span={12}>
                    <Textarea
                        label="Campaign Description"
                        placeholder="Describe your campaign objectives and key messages..."
                        value={formData.description}
                        onChange={(e) => updateFormData({ description: e.currentTarget.value })}
                        error={errors.description}
                        minRows={3}
                        size="md"
                    />
                </Grid.Col>
            </Grid>
        </Stack>
    ), [advertiserOptions, formData, errors, updateFormData]);

    const StepCampaignDetails = useMemo(() => (
        <Stack gap="md">
            <Title order={3} className="flex items-center gap-2 text-gray-800">
                <MapPin size={20} className="text-green-600" />
                Campaign Details & Coverage
            </Title>
            <Grid>
                <Grid.Col span={{ base: 12, md: 6 }}>
                    <TextInput
                        type="date"
                        label="Start Date"
                        value={formData.start_date}
                        onChange={(e) => updateFormData({ start_date: e.currentTarget.value })}
                        error={errors.start_date}
                        required
                        size="md"
                    />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                    <TextInput
                        type="date"
                        label="End Date"
                        value={formData.end_date}
                        onChange={(e) => updateFormData({ end_date: e.currentTarget.value })}
                        error={errors.end_date}
                        required
                        size="md"
                    />
                </Grid.Col>
                <Grid.Col span={12}>
                    <Group gap="sm" align="flex-end">
                        <Box style={{ flex: 1 }}>
                            <MultiSelect
                                label="Coverage Areas"
                                placeholder="Select areas where you want your campaign to run"
                                data={coverageAreaOptions}
                                value={formData.coverage_areas}
                                onChange={(values) => updateFormData({ coverage_areas: values })}
                                error={errors.coverage_areas}
                                searchable
                                clearable
                                required
                                size="md"
                            />
                        </Box>
                        <Button
                            variant="light"
                            leftSection={<Plus size={16} />}
                            onClick={openCoverageModal}
                            size="md"
                        >
                            Add New
                        </Button>
                    </Group>
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                    <NumberInput
                        label="Number of Helmets"
                        placeholder="How many helmets do you need?"
                        value={formData.helmet_count ?? undefined}
                        onChange={(val) => updateFormData({ helmet_count: val !== '' ? Number(val) : null })}
                        error={errors.helmet_count}
                        min={1}
                        max={10000}
                        required
                        size="md"
                    />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                    <Paper p="md" className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
                        <Text size="sm" fw={500} c="blue.7">Campaign Duration</Text>
                        <Text size="xl" fw={700} c="blue.8">{duration} days</Text>
                    </Paper>
                </Grid.Col>
            </Grid>

            <Divider label="Rider Demographics (Optional)" labelPosition="center" size="sm" />
            <Grid>
                <Grid.Col span={{ base: 12, md: 4 }}>
                    <MultiSelect
                        label="Preferred Age Groups"
                        data={ageGroupOptions}
                        value={formData.rider_demographics.age_groups}
                        onChange={(values) => updateFormData({
                            rider_demographics: { ...formData.rider_demographics, age_groups: values }
                        })}
                        size="md"
                    />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 4 }}>
                    <MultiSelect
                        label="Gender Preference"
                        data={genderOptions}
                        value={formData.rider_demographics.genders}
                        onChange={(values) => updateFormData({
                            rider_demographics: { ...formData.rider_demographics, genders: values }
                        })}
                        size="md"
                    />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 4 }}>
                    <MultiSelect
                        label="Rider Types"
                        data={riderTypeOptions}
                        value={formData.rider_demographics.rider_types}
                        onChange={(values) => updateFormData({
                            rider_demographics: { ...formData.rider_demographics, rider_types: values }
                        })}
                        size="md"
                    />
                </Grid.Col>
            </Grid>
        </Stack>
    ), [formData, errors, duration, coverageAreaOptions, updateFormData, openCoverageModal]);

    const StepDesignRequirements = useMemo(() => (
        <Stack gap="md">
            <Title order={3} className="flex items-center gap-2 text-gray-800">
                <Palette size={20} className="text-purple-600" />
                Design Requirements
            </Title>

            <Card withBorder p="lg">
                <Checkbox
                    label="I need design services (+ KES 3,000)"
                    description="Our professional designers will create your helmet graphics"
                    checked={formData.need_design}
                    onChange={(e) => updateFormData({ need_design: e.currentTarget.checked })}
                    size="md"
                />
            </Card>

            {formData.need_design ? (
                <Textarea
                    label="Design Requirements"
                    placeholder="Describe your design preferences, brand colors, logos, messages, etc..."
                    value={formData.design_requirements}
                    onChange={(e) => updateFormData({ design_requirements: e.currentTarget.value })}
                    error={errors.design_requirements}
                    minRows={4}
                    required
                    size="md"
                />
            ) : (
                <FileInput
                    label="Upload Design File"
                    placeholder="Upload your design file (JPG, PNG, PDF, AI, PSD)"
                    accept=".jpg,.jpeg,.png,.pdf,.ai,.psd"
                    value={formData.design_file}
                    onChange={(file) => updateFormData({ design_file: file })}
                    error={errors.design_file}
                    leftSection={<Upload size={16} />}
                    size="md"
                />
            )}

            <Alert icon={<Info size={16} />} color="blue" variant="light">
                <Text size="sm">
                    {formData.need_design
                        ? "Our design team will create professional graphics based on your requirements."
                        : "Please upload your design in high resolution. We support JPG, PNG, PDF, AI, and PSD formats."
                    }
                </Text>
            </Alert>
        </Stack>
    ), [formData, errors, updateFormData]);

    const StepAgreement = useMemo(() => (
        <Stack gap="md">
            <Title order={3} className="flex items-center gap-2 text-gray-800">
                <Users size={20} className="text-orange-600" />
                Agreement Details
            </Title>

            <Divider label="VAT Information" labelPosition="center" />
            <Card withBorder p="lg">
                <Checkbox
                    label="I require a VAT receipt"
                    checked={formData.require_vat_receipt}
                    onChange={(e) => updateFormData({ require_vat_receipt: e.currentTarget.checked })}
                    size="md"
                />
            </Card>

            <Textarea
                label="Special Instructions"
                placeholder="Any special requirements or instructions for your campaign..."
                value={formData.special_instructions}
                onChange={(e) => updateFormData({ special_instructions: e.currentTarget.value })}
                minRows={3}
                size="md"
            />
        </Stack>
    ), [formData, updateFormData]);

    const StepCostReview = useMemo(() => (
        <Stack gap="md">
            <Group justify="space-between" align="center">
                <Title order={3} className="flex items-center gap-2 text-gray-800">
                    <Calculator size={20} className="text-emerald-600" />
                    Cost Breakdown & Review
                </Title>
                <Button
                    variant="light"
                    size="sm"
                    onClick={calculateCosts}
                    disabled={!formData.helmet_count || !duration || loadingCosts}
                    leftSection={<Calculator size={16} />}
                >
                    Recalculate
                </Button>
            </Group>

            {loadingCosts ? (
                <Paper p="xl" className="text-center">
                    <Loader size="lg" />
                    <Text mt="md" c="dimmed">Calculating your campaign costs...</Text>
                </Paper>
            ) : costBreakdown ? (
                <Stack gap="md">
                    <Card withBorder p="lg">
                        <Stack gap="sm">
                            <Text size="lg" fw={600} c="gray.8">Campaign Summary</Text>
                            <Grid>
                                <Grid.Col span={6}>
                                    <Text size="sm" c="dimmed">Helmets</Text>
                                    <Text fw={500} size="lg">{costBreakdown.helmet_count}</Text>
                                </Grid.Col>
                                <Grid.Col span={6}>
                                    <Text size="sm" c="dimmed">Duration</Text>
                                    <Text fw={500} size="lg">{costBreakdown.duration_days} days</Text>
                                </Grid.Col>
                            </Grid>
                        </Stack>
                    </Card>

                    <Paper withBorder p="lg">
                        <Table striped highlightOnHover>
                            <Table.Tbody>
                                <Table.Tr>
                                    <Table.Td fw={500}>Base Campaign Cost</Table.Td>
                                    <Table.Td className="text-right text-sm text-gray-600">
                                        {costBreakdown.helmet_count} × {costBreakdown.duration_days} × KES {costBreakdown.daily_rate}
                                    </Table.Td>
                                    <Table.Td className="text-right font-semibold text-lg">
                                        KES {costBreakdown.base_cost.toLocaleString()}
                                    </Table.Td>
                                </Table.Tr>
                                {costBreakdown.design_cost > 0 && (
                                    <Table.Tr>
                                        <Table.Td fw={500}>Design Services</Table.Td>
                                        <Table.Td className="text-right text-sm text-gray-600">One-time fee</Table.Td>
                                        <Table.Td className="text-right font-semibold text-lg">
                                            KES {costBreakdown.design_cost.toLocaleString()}
                                        </Table.Td>
                                    </Table.Tr>
                                )}
                                <Table.Tr>
                                    <Table.Td fw={600}>Subtotal</Table.Td>
                                    <Table.Td></Table.Td>
                                    <Table.Td className="text-right font-semibold text-lg">
                                        KES {costBreakdown.subtotal.toLocaleString()}
                                    </Table.Td>
                                </Table.Tr>
                                <Table.Tr>
                                    <Table.Td fw={500}>VAT (16%)</Table.Td>
                                    <Table.Td></Table.Td>
                                    <Table.Td className="text-right font-semibold text-lg">
                                        KES {costBreakdown.vat_amount.toLocaleString()}
                                    </Table.Td>
                                </Table.Tr>
                                <Table.Tr className="bg-gradient-to-r from-emerald-50 to-green-50">
                                    <Table.Td fw={700}>
                                        <Text size="lg" fw={700}>Total Amount</Text>
                                    </Table.Td>
                                    <Table.Td></Table.Td>
                                    <Table.Td className="text-right font-bold text-2xl text-emerald-700">
                                        KES {costBreakdown.total_cost.toLocaleString()}
                                    </Table.Td>
                                </Table.Tr>
                            </Table.Tbody>
                        </Table>
                    </Paper>

                    <Alert icon={<Info size={16} />} color="green" variant="light">
                        <Text size="sm" fw={500}>
                            Your campaign total is <Text component="span" fw={700} c="green.7">KES {costBreakdown.total_cost.toLocaleString()}</Text>.
                            Proceed to the next step to review and submit your campaign.
                        </Text>
                    </Alert>
                </Stack>
            ) : (
                <Paper p="xl" className="text-center">
                    <Text c="dimmed" size="lg" mb="md">No cost breakdown available</Text>
                    <Text c="dimmed" size="sm" mb="xl">
                        Please ensure you have filled in the helmet count and campaign dates in previous steps.
                    </Text>
                    <Button
                        onClick={calculateCosts}
                        disabled={!formData.helmet_count || !duration}
                        leftSection={<Calculator size={16} />}
                        gradient={{ from: 'blue', to: 'purple', deg: 45 }}
                        variant="gradient"
                    >
                        Calculate Costs
                    </Button>
                </Paper>
            )}
        </Stack>
    ), [loadingCosts, costBreakdown, formData.helmet_count, duration, calculateCosts]);

    const StepFinalReview = useMemo(() => (
        <Stack gap="md">
            <Title order={3} className="flex items-center gap-2 text-gray-800">
                <Eye size={20} className="text-indigo-600" />
                Final Review & Submit
            </Title>

            <Alert icon={<CheckCircle size={16} />} color="blue" variant="light">
                <Text size="sm">
                    Please review all details before submitting your campaign.
                </Text>
            </Alert>

            <Card withBorder p="lg">
                <Stack gap="sm">
                    <Text fw={600} size="lg" c="gray.8">Campaign Overview</Text>
                    <Grid>
                        <Grid.Col span={{ base: 12, sm: 6 }}>
                            <Text size="sm" c="dimmed">Name</Text>
                            <Text fw={500}>{formData.name}</Text>
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, sm: 6 }}>
                            <Text size="sm" c="dimmed">Duration</Text>
                            <Text fw={500}>{formData.start_date} to {formData.end_date}</Text>
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, sm: 6 }}>
                            <Text size="sm" c="dimmed">Helmets</Text>
                            <Text fw={500}>{formData.helmet_count}</Text>
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, sm: 6 }}>
                            <Text size="sm" c="dimmed">Total Cost</Text>
                            <Text fw={700} c="green.7" size="lg">
                                KES {costBreakdown?.total_cost.toLocaleString()}
                            </Text>
                        </Grid.Col>
                    </Grid>
                </Stack>
            </Card>
        </Stack>
    ), [formData, costBreakdown]);

    return (
        <>
            <Card withBorder shadow="lg" radius="xl" p={{ base: "md", sm: "lg" }} className="w-full max-w-none">
                <Stack gap="xl">
                    <Stepper
                        active={activeStep}
                        onStepClick={setActiveStep}
                        allowNextStepsSelect={false}
                        size="sm"
                        radius="md"
                        completedIcon={<CheckCircle size={16} />}
                    >
                        <Stepper.Step label="Basic Info" description="Campaign details" icon={<FileText size={16} />} />
                        <Stepper.Step label="Campaign Setup" description="Dates & coverage" icon={<MapPin size={16} />} />
                        <Stepper.Step label="Design" description="Visual requirements" icon={<Palette size={16} />} />
                        <Stepper.Step label="Additional Details" description="VAT and Special Instructions" icon={<Users size={16} />} />
                        <Stepper.Step label="Cost Review" description="Pricing breakdown" icon={<Calculator size={16} />} />
                        <Stepper.Step label="Submit" description="Final review" icon={<Flag size={16} />} />
                    </Stepper>

                    <Progress
                        value={(activeStep + 1) / 6 * 100}
                        size="md"
                        radius="xl"
                        className="w-full"
                    />

                    <form onSubmit={handleSubmit}>
                        {activeStep === 0 && StepBasicInfo}
                        {activeStep === 1 && StepCampaignDetails}
                        {activeStep === 2 && StepDesignRequirements}
                        {activeStep === 3 && StepAgreement}
                        {activeStep === 4 && StepCostReview}
                        {activeStep === 5 && StepFinalReview}

                        <Group justify="space-between" pt="xl">
                            <Button
                                variant="light"
                                onClick={prevStep}
                                disabled={activeStep === 0}
                                size="md"
                                radius="md"
                                leftSection={<ArrowLeft size={16} />}
                            >
                                Previous
                            </Button>
                            <Button
                                type="submit"
                                loading={submitting || (activeStep === 4 && loadingCosts)}
                                disabled={!isStepValid}
                                rightSection={activeStep === 5 ? <Flag size={16} /> : <ArrowRight size={16} />}
                                size="md"
                                radius="md"
                                gradient={{ from: 'blue', to: 'purple', deg: 45 }}
                                variant="gradient"
                            >
                                {activeStep === 5 ? 'Submit Campaign' : 'Continue'}
                            </Button>
                        </Group>
                    </form>
                </Stack>
            </Card>

            {/* Coverage Area Modal */}
            <Modal
                opened={coverageAreaModalOpened}
                onClose={closeCoverageModal}
                title="Add New Coverage Area"
                size="md"
                radius="md"
            >
                <Stack gap="md">
                    <TextInput
                        label="Coverage Area Name"
                        placeholder="e.g., Westlands Mall, Karen Shopping Center"
                        value={newCoverageArea.name}
                        onChange={(e) => setNewCoverageArea({
                            ...newCoverageArea,
                            name: e.currentTarget.value
                        })}
                        required
                        size="md"
                    />

                    <Select
                        label="County (Optional)"
                        placeholder="Select county"
                        data={[
                            { value: '1', label: 'Nairobi' },
                            { value: '2', label: 'Kiambu' },
                            { value: '3', label: 'Machakos' },
                            { value: '4', label: 'Kajiado' },
                        ]}
                        value={newCoverageArea.county_id?.toString()}
                        onChange={(value) => setNewCoverageArea({
                            ...newCoverageArea,
                            county_id: value ? parseInt(value) : null
                        })}
                        searchable
                        size="md"
                    />

                    <Textarea
                        label="Description (Optional)"
                        placeholder="Brief description of the coverage area"
                        value={newCoverageArea.description}
                        onChange={(e) => setNewCoverageArea({
                            ...newCoverageArea,
                            description: e.currentTarget.value
                        })}
                        minRows={3}
                        size="md"
                    />

                    <Group justify="flex-end" mt="md">
                        <Button variant="light" onClick={closeCoverageModal} radius="md">
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreateCoverageArea}
                            disabled={!newCoverageArea.name}
                            gradient={{ from: 'blue', to: 'purple', deg: 45 }}
                            variant="gradient"
                            radius="md"
                        >
                            Add Coverage Area
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </>
    );
}