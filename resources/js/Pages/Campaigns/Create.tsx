import { useState, useCallback, useMemo } from 'react';
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
    Stepper,
    Checkbox,
    FileInput,
    Badge,
    Divider,
    Paper,
    Title,
    Table,
    ActionIcon,
    Loader,
    Progress
} from '@mantine/core';
import { 
    ArrowLeft, 
    Info, 
    Flag, 
    Upload, 
    Calculator, 
    CreditCard,
    CheckCircle,
    ArrowRight,
    Eye,
    FileText,
    MapPin,
    Users,
    DollarSign,
    Palette
} from 'lucide-react';

interface Advertiser {
    id: number;
    company_name: string;
}

interface CampaignFormData {
    name: string;
    description?: string;
    business_type?: string;
    target_audience?: string;
    start_date: string;
    end_date: string;
    coverage_areas: string[];
    helmet_count: number | null;
    need_design: boolean;
    design_file: File | null;
    design_requirements?: string;
    rider_demographics: {
        age_groups: string[];
        gender: string[];
        rider_types: string[];
    };
    require_vat_receipt: boolean;
    vat_number?: string;
    additional_services: string[];
    special_instructions?: string;
    agree_to_terms: boolean;
    status: string;
}

interface CostBreakdown {
    helmet_count: number;
    duration_days: number;
    daily_rate: number;
    base_cost: number;
    design_cost: number;
    additional_services_cost: number;
    subtotal: number;
    vat_amount: number;
    total_cost: number;
    currency: string;
}

interface CampaignCreateProps {
    advertisers: Advertiser[];
    coverage_areas: string[];
}

const COVERAGE_AREA_OPTIONS = [
    { value: 'nairobi_cbd', label: 'Nairobi CBD' },
    { value: 'westlands', label: 'Westlands' },
    { value: 'karen', label: 'Karen' },
    { value: 'kilimani', label: 'Kilimani' },
    { value: 'parklands', label: 'Parklands' },
    { value: 'kasarani', label: 'Kasarani' },
    { value: 'embakasi', label: 'Embakasi' },
    { value: 'langata', label: 'Lang\'ata' },
    { value: 'dagoretti', label: 'Dagoretti' },
    { value: 'kibra', label: 'Kibra' },
    { value: 'roysambu', label: 'Roysambu' },
    { value: 'mathare', label: 'Mathare' }
];

const ADDITIONAL_SERVICES_OPTIONS = [
    { value: 'gps_tracking', label: 'GPS Tracking (+KES 50/helmet/day)' },
    { value: 'daily_reports', label: 'Daily Reports (+KES 100 flat)' },
    { value: 'photo_verification', label: 'Photo Verification (+KES 25/helmet/day)' },
    { value: 'custom_analytics', label: 'Custom Analytics (+KES 200 flat)' }
];

const BUSINESS_TYPE_OPTIONS = [
    { value: 'retail', label: 'Retail' },
    { value: 'food_beverage', label: 'Food & Beverage' },
    { value: 'technology', label: 'Technology' },
    { value: 'healthcare', label: 'Healthcare' },
    { value: 'education', label: 'Education' },
    { value: 'finance', label: 'Finance' },
    { value: 'other', label: 'Other' }
];

export default function Create({ advertisers, coverage_areas }: CampaignCreateProps) {
    const [activeStep, setActiveStep] = useState(0);
    const [costBreakdown, setCostBreakdown] = useState<CostBreakdown | null>(null);
    const [loadingCosts, setLoadingCosts] = useState(false);

    const { data, setData, post, processing, errors } = useForm<CampaignFormData>({
        name: '',
        description: '',
        business_type: '',
        target_audience: '',
        start_date: '',
        end_date: '',
        coverage_areas: [],
        helmet_count: null,
        need_design: false,
        design_file: null,
        design_requirements: '',
        rider_demographics: {
            age_groups: [],
            gender: [],
            rider_types: []
        },
        require_vat_receipt: false,
        vat_number: '',
        additional_services: [],
        special_instructions: '',
        agree_to_terms: false,
        status: 'draft',
    });

    const campaignDuration = useMemo(() => {
        if (!data.start_date || !data.end_date) return 0;
        const start = new Date(data.start_date);
        const end = new Date(data.end_date);
        return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    }, [data.start_date, data.end_date]);

    const stepValidation = useMemo(() => ({
        0: data.name && data.business_type,
        1: data.start_date && data.end_date && data.coverage_areas.length > 0 && data.helmet_count,
        2: data.need_design ? data.design_requirements : (data.design_file || data.need_design),
        3: costBreakdown !== null,
        4: data.agree_to_terms,
    }), [data.name, data.business_type, data.start_date, data.end_date, data.coverage_areas.length, data.helmet_count, data.need_design, data.design_requirements, data.design_file, costBreakdown, data.agree_to_terms]);

    // Debounced input handlers using useCallback
    const handleNameChange = useCallback((value: string) => {
        setData('name', value);
    }, [setData]);

    const handleDescriptionChange = useCallback((value: string) => {
        setData('description', value);
    }, [setData]);

    const handleBusinessTypeChange = useCallback((value: string | null) => {
        setData('business_type', value || '');
    }, [setData]);

    const handleTargetAudienceChange = useCallback((value: string) => {
        setData('target_audience', value);
    }, [setData]);

    const handleStartDateChange = useCallback((value: string) => {
        setData('start_date', value);
    }, [setData]);

    const handleEndDateChange = useCallback((value: string) => {
        setData('end_date', value);
    }, [setData]);

    const handleCoverageAreasChange = useCallback((values: string[]) => {
        setData('coverage_areas', values);
    }, [setData]);

    const handleHelmetCountChange = useCallback((val: string | number) => {
        setData('helmet_count', val !== '' ? Number(val) : null);
    }, [setData]);

    const handleDesignNeedChange = useCallback((checked: boolean) => {
        setData('need_design', checked);
    }, [setData]);

    const handleDesignRequirementsChange = useCallback((value: string) => {
        setData('design_requirements', value);
    }, [setData]);

    const handleDesignFileChange = useCallback((file: File | null) => {
        setData('design_file', file);
    }, [setData]);

    // Rider demographics handlers
    const handleRiderDemographicsChange = useCallback((field: string, values: string[]) => {
        setData('rider_demographics', {
            ...data.rider_demographics,
            [field]: values
        });
    }, [data.rider_demographics, setData]);

    const calculateCosts = useCallback(async () => {
        if (!data.helmet_count || !data.start_date || !data.end_date) return;

        setLoadingCosts(true);
        
        // Simulate API call
        setTimeout(() => {
            const baseCost = data.helmet_count! * campaignDuration * 200;
            const designCost = data.need_design ? 3000 : 0;
            const additionalCost = data.additional_services.length * 100; 
            const subtotal = baseCost + designCost + additionalCost;
            const vatAmount = subtotal * 0.16;
            const totalCost = subtotal + vatAmount;

            setCostBreakdown({
                helmet_count: data.helmet_count!,
                duration_days: campaignDuration,
                daily_rate: 200,
                base_cost: baseCost,
                design_cost: designCost,
                additional_services_cost: additionalCost,
                subtotal: subtotal,
                vat_amount: vatAmount,
                total_cost: totalCost,
                currency: 'KES'
            });
            setLoadingCosts(false);
        }, 1500);
    }, [data.helmet_count, data.start_date, data.end_date, campaignDuration, data.need_design, data.additional_services.length]);

    const nextStep = useCallback(() => {
        if (activeStep === 2) { 
            calculateCosts();
        }
        setActiveStep((current) => Math.min(current + 1, 5));
    }, [activeStep, calculateCosts]);

    const prevStep = useCallback(() => {
        setActiveStep((current) => Math.max(current - 1, 0));
    }, []);

    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        if (activeStep === 4) { 
            post(route('campaigns.store'));
        } else {
            nextStep();
        }
    }, [activeStep, nextStep, post]);

    const isStepValid = useCallback((step: number) => {
        return stepValidation[step as keyof typeof stepValidation] || true;
    }, [stepValidation]);

    // Memoized components to prevent unnecessary re-renders
    const StepBasicInfo = useMemo(() => (
        <Stack gap="md">
            <Title order={3} className="flex items-center gap-2">
                <FileText size={20} />
                Basic Campaign Information
            </Title>
            <Grid>
                <Grid.Col span={{ base: 12, md: 6 }}>
                    <TextInput
                        label="Campaign Name"
                        placeholder="e.g., Summer Brand Awareness Campaign"
                        value={data.name}
                        onChange={(e) => handleNameChange(e.currentTarget.value)}
                        error={errors.name}
                        required
                    />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                    <Select
                        label="Business Type"
                        placeholder="Select your business type"
                        data={BUSINESS_TYPE_OPTIONS}
                        value={data.business_type}
                        onChange={handleBusinessTypeChange}
                        error={errors.business_type}
                        searchable
                    />
                </Grid.Col>
                <Grid.Col span={12}>
                    <Textarea
                        label="Campaign Description"
                        placeholder="Describe your campaign objectives and key messages..."
                        value={data.description}
                        onChange={(e) => handleDescriptionChange(e.currentTarget.value)}
                        error={errors.description}
                        minRows={3}
                    />
                </Grid.Col>
                <Grid.Col span={12}>
                    <Textarea
                        label="Target Audience"
                        placeholder="Describe your target audience demographics and characteristics..."
                        value={data.target_audience}
                        onChange={(e) => handleTargetAudienceChange(e.currentTarget.value)}
                        error={errors.target_audience}
                        minRows={2}
                    />
                </Grid.Col>
            </Grid>
        </Stack>
    ), [data.name, data.business_type, data.description, data.target_audience, errors, handleNameChange, handleBusinessTypeChange, handleDescriptionChange, handleTargetAudienceChange]);

    const StepCampaignDetails = useMemo(() => (
        <Stack gap="md">
            <Title order={3} className="flex items-center gap-2">
                <MapPin size={20} />
                Campaign Details & Coverage
            </Title>
            <Grid>
                <Grid.Col span={{ base: 12, md: 6 }}>
                    <TextInput
                        type="date"
                        label="Start Date"
                        value={data.start_date}
                        onChange={(e) => handleStartDateChange(e.currentTarget.value)}
                        error={errors.start_date}
                        required
                    />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                    <TextInput
                        type="date"
                        label="End Date"
                        value={data.end_date}
                        onChange={(e) => handleEndDateChange(e.currentTarget.value)}
                        error={errors.end_date}
                        required
                    />
                </Grid.Col>
                <Grid.Col span={12}>
                    <MultiSelect
                        label="Coverage Areas"
                        placeholder="Select areas where you want your campaign to run"
                        data={COVERAGE_AREA_OPTIONS}
                        value={data.coverage_areas}
                        onChange={handleCoverageAreasChange}
                        error={errors.coverage_areas}
                        searchable
                        clearable
                        required
                    />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                    <NumberInput
                        label="Number of Helmets"
                        placeholder="How many helmets do you need?"
                        value={data.helmet_count ?? undefined}
                        onChange={handleHelmetCountChange}
                        error={errors.helmet_count}
                        min={1}
                        max={10000}
                        required
                    />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                    <Paper p="sm" className="bg-blue-50">
                        <Text size="sm" fw={500}>Campaign Duration</Text>
                        <Text size="lg" fw={700} c="blue">
                            {campaignDuration} days
                        </Text>
                    </Paper>
                </Grid.Col>
            </Grid>

            <Divider label="Rider Demographics (Optional)" labelPosition="center" />
            <Grid>
                <Grid.Col span={{ base: 12, md: 4 }}>
                    <MultiSelect
                        label="Preferred Age Groups"
                        data={[
                            { value: '18-25', label: '18-25 years' },
                            { value: '26-35', label: '26-35 years' },
                            { value: '36-45', label: '36-45 years' },
                            { value: '46-55', label: '46-55 years' },
                            { value: '55+', label: '55+ years' }
                        ]}
                        value={data.rider_demographics.age_groups}
                        onChange={(values) => handleRiderDemographicsChange('age_groups', values)}
                    />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 4 }}>
                    <MultiSelect
                        label="Gender Preference"
                        data={[
                            { value: 'male', label: 'Male' },
                            { value: 'female', label: 'Female' },
                        ]}
                        value={data.rider_demographics.gender}
                        onChange={(values) => handleRiderDemographicsChange('gender', values)}
                    />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 4 }}>
                    <MultiSelect
                        label="Rider Types"
                        data={[
                            { value: 'courier', label: 'Courier' },
                            { value: 'boda', label: 'Boda Boda' },
                            { value: 'delivery', label: 'Delivery' },
                            { value: 'taxi', label: 'Taxi' }
                        ]}
                        value={data.rider_demographics.rider_types}
                        onChange={(values) => handleRiderDemographicsChange('rider_types', values)}
                    />
                </Grid.Col>
            </Grid>
        </Stack>
    ), [data.start_date, data.end_date, data.coverage_areas, data.helmet_count, campaignDuration, data.rider_demographics, errors, handleStartDateChange, handleEndDateChange, handleCoverageAreasChange, handleHelmetCountChange, handleRiderDemographicsChange]);

    const StepDesignRequirements = useMemo(() => (
        <Stack gap="md">
            <Title order={3} className="flex items-center gap-2">
                <Palette size={20} />
                Design Requirements
            </Title>
            
            <Card withBorder>
                <Checkbox
                    label="I need design services (+ KES 3,000)"
                    description="Our professional designers will create your helmet graphics"
                    checked={data.need_design}
                    onChange={(event) => handleDesignNeedChange(event.currentTarget.checked)}
                />
            </Card>

            {data.need_design ? (
                <Textarea
                    label="Design Requirements"
                    placeholder="Describe your design preferences, brand colors, logos, messages, etc..."
                    value={data.design_requirements}
                    onChange={(e) => handleDesignRequirementsChange(e.currentTarget.value)}
                    error={errors.design_requirements}
                    minRows={4}
                    required
                />
            ) : (
                <FileInput
                    label="Upload Design File"
                    placeholder="Upload your design file (JPG, PNG, PDF, AI, PSD)"
                    accept=".jpg,.jpeg,.png,.pdf,.ai,.psd"
                    value={data.design_file}
                    onChange={handleDesignFileChange}
                    error={errors.design_file}
                    leftSection={<Upload size={16} />}
                />
            )}

            <Alert icon={<Info size={16} />} color="blue" variant="light">
                <Text size="sm">
                    {data.need_design 
                        ? "Our design team will create professional graphics based on your requirements."
                        : "Please upload your design in high resolution. We support JPG, PNG, PDF, AI, and PSD formats."
                    }
                </Text>
            </Alert>
        </Stack>
    ), [data.need_design, data.design_requirements, data.design_file, errors, handleDesignNeedChange, handleDesignRequirementsChange, handleDesignFileChange]);

    const StepCostReview = useMemo(() => (
        <Stack gap="md">
            <Title order={3} className="flex items-center gap-2">
                <Calculator size={20} />
                Cost Breakdown & Review
            </Title>

            {loadingCosts ? (
                <Paper p="xl" className="text-center">
                    <Loader size="lg" />
                    <Text mt="md">Calculating your campaign costs...</Text>
                </Paper>
            ) : costBreakdown ? (
                <Stack gap="md">
                    <Card withBorder>
                        <Stack gap="sm">
                            <Text size="lg" fw={600}>Campaign Summary</Text>
                            <Grid>
                                <Grid.Col span={6}>
                                    <Text size="sm" c="dimmed">Helmets</Text>
                                    <Text fw={500}>{costBreakdown.helmet_count}</Text>
                                </Grid.Col>
                                <Grid.Col span={6}>
                                    <Text size="sm" c="dimmed">Duration</Text>
                                    <Text fw={500}>{costBreakdown.duration_days} days</Text>
                                </Grid.Col>
                            </Grid>
                        </Stack>
                    </Card>

                    <Paper withBorder p="md">
                        <Table>
                            <Table.Tbody>
                                <Table.Tr>
                                    <Table.Td>Base Campaign Cost</Table.Td>
                                    <Table.Td className="text-right">
                                        {costBreakdown.helmet_count} × {costBreakdown.duration_days} × KES {costBreakdown.daily_rate}
                                    </Table.Td>
                                    <Table.Td className="text-right font-semibold">
                                        KES {costBreakdown.base_cost.toLocaleString()}
                                    </Table.Td>
                                </Table.Tr>
                                {costBreakdown.design_cost > 0 && (
                                    <Table.Tr>
                                        <Table.Td>Design Services</Table.Td>
                                        <Table.Td className="text-right">One-time fee</Table.Td>
                                        <Table.Td className="text-right font-semibold">
                                            KES {costBreakdown.design_cost.toLocaleString()}
                                        </Table.Td>
                                    </Table.Tr>
                                )}
                                {costBreakdown.additional_services_cost > 0 && (
                                    <Table.Tr>
                                        <Table.Td>Additional Services</Table.Td>
                                        <Table.Td className="text-right">Various rates</Table.Td>
                                        <Table.Td className="text-right font-semibold">
                                            KES {costBreakdown.additional_services_cost.toLocaleString()}
                                        </Table.Td>
                                    </Table.Tr>
                                )}
                                <Table.Tr>
                                    <Table.Td fw={500}>Subtotal</Table.Td>
                                    <Table.Td></Table.Td>
                                    <Table.Td className="text-right font-semibold">
                                        KES {costBreakdown.subtotal.toLocaleString()}
                                    </Table.Td>
                                </Table.Tr>
                                <Table.Tr>
                                    <Table.Td>VAT (16%)</Table.Td>
                                    <Table.Td></Table.Td>
                                    <Table.Td className="text-right font-semibold">
                                        KES {costBreakdown.vat_amount.toLocaleString()}
                                    </Table.Td>
                                </Table.Tr>
                                <Table.Tr className="bg-green-50">
                                    <Table.Td fw={700} >Total Amount</Table.Td>
                                    <Table.Td></Table.Td>
                                    <Table.Td className="text-right font-bold text-xl text-green-700">
                                        KES {costBreakdown.total_cost.toLocaleString()}
                                    </Table.Td>
                                </Table.Tr>
                            </Table.Tbody>
                        </Table>
                    </Paper>

                    <Alert icon={<Info size={16} />} color="green" variant="light">
                        <Text size="sm">
                            Your campaign total is <strong>KES {costBreakdown.total_cost.toLocaleString()}</strong>. 
                            Proceed to the next step to review and submit your campaign.
                        </Text>
                    </Alert>
                </Stack>
            ) : null}
        </Stack>
    ), [loadingCosts, costBreakdown]);

    const StepFinalReview = useMemo(() => (
        <Stack gap="md">
            <Title order={3} className="flex items-center gap-2">
                <Eye size={20} />
                Final Review & Submit
            </Title>

            <Alert icon={<CheckCircle size={16} />} color="blue" variant="light">
                <Text size="sm">
                    Please review all details before submitting your campaign. 
                    You'll receive a cost breakdown and payment instructions via email.
                </Text>
            </Alert>

            <Card withBorder>
                <Stack gap="sm">
                    <Text fw={600}>Campaign Overview</Text>
                    <Grid>
                        <Grid.Col span={6}>
                            <Text size="sm" c="dimmed">Name</Text>
                            <Text>{data.name}</Text>
                        </Grid.Col>
                        <Grid.Col span={6}>
                            <Text size="sm" c="dimmed">Duration</Text>
                            <Text>{data.start_date} to {data.end_date}</Text>
                        </Grid.Col>
                        <Grid.Col span={6}>
                            <Text size="sm" c="dimmed">Helmets</Text>
                            <Text>{data.helmet_count}</Text>
                        </Grid.Col>
                        <Grid.Col span={6}>
                            <Text size="sm" c="dimmed">Total Cost</Text>
                            <Text fw={700} c="green">
                                KES {costBreakdown?.total_cost.toLocaleString()}
                            </Text>
                        </Grid.Col>
                    </Grid>
                </Stack>
            </Card>

            <Checkbox
                label="I agree to the terms and conditions"
                description="By checking this box, I confirm that I have read and agree to all terms and conditions."
                checked={data.agree_to_terms}
                onChange={(event) => setData('agree_to_terms', event.currentTarget.checked)}
                error={errors.agree_to_terms}
                required
            />
        </Stack>
    ), [data.name, data.start_date, data.end_date, data.helmet_count, costBreakdown, data.agree_to_terms, errors.agree_to_terms]);

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
                            Create New Campaign
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Step {activeStep + 1} of 5 - Set up your helmet advertising campaign
                        </p>
                    </div>
                </div>
            }
        >
            <Head title="Create Campaign" />

            <div className="w-full max-w-9xl mx-auto">
                <Card withBorder shadow="sm" radius="md" p="lg">
                    <Stack gap="xl">
                        <Stepper 
                            active={activeStep} 
                            onStepClick={setActiveStep}
                            allowNextStepsSelect={false}
                            size="sm"
                        >
                            <Stepper.Step 
                                label="Basic Info" 
                                description="Campaign details"
                                icon={<FileText size={16} />}
                            />
                            <Stepper.Step 
                                label="Campaign Setup" 
                                description="Dates & coverage"
                                icon={<MapPin size={16} />}
                            />
                            <Stepper.Step 
                                label="Design" 
                                description="Visual requirements"
                                icon={<Palette size={16} />}
                            />
                            <Stepper.Step 
                                label="Cost Review" 
                                description="Pricing breakdown"
                                icon={<Calculator size={16} />}
                            />
                            <Stepper.Step 
                                label="Submit" 
                                description="Final review"
                                icon={<Flag size={16} />}
                            />
                        </Stepper>

                        <Progress value={(activeStep + 1) / 5 * 100} size="sm" />

                        <form onSubmit={handleSubmit}>
                            {activeStep === 0 && StepBasicInfo}
                            {activeStep === 1 && StepCampaignDetails}
                            {activeStep === 2 && StepDesignRequirements}
                            {activeStep === 3 && StepCostReview}
                            {activeStep === 4 && StepFinalReview}

                            <Group justify="space-between">
                                <Button 
                                    variant="light" 
                                    onClick={prevStep} 
                                    disabled={activeStep === 0}
                                >
                                    Previous
                                </Button>
                                <Button 
                                    type="submit"
                                    loading={processing || (activeStep === 2 && loadingCosts)}
                                    disabled={!isStepValid(activeStep)}
                                    rightSection={activeStep === 4 ? <Flag size={16} /> : <ArrowRight size={16} />}
                                >
                                    {activeStep === 4 ? 'Submit Campaign' : 'Continue'}
                                </Button>
                            </Group>
                        </form>
                    </Stack>
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}