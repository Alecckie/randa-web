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
    Notification,
    Badge,
    ThemeIcon,

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
    Building,
    Calendar,
    Target,
    CreditCard,
    AlertCircle,
    Smartphone,
    XCircle,
    Clock
} from 'lucide-react';
import type { User } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { Advertiser } from '@/types/advertiser';
import { PaymentStatus } from '@/types/campaign';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

declare global {
    interface Window {
        Pusher: typeof Pusher;
        Echo: Echo<'reverb'>;
    }
}

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


    const [phoneNumber, setPhoneNumber] = useState('');
    const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle');
    const [paymentError, setPaymentError] = useState('');
    const [paymentReference, setPaymentReference] = useState('');
    const [showPaymentNotification, setShowPaymentNotification] = useState(false);






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
            const baseCost = formData.helmet_count! * duration * 1;
            const designCost = formData.need_design ? 3000 : 0;
            const subtotal = baseCost + designCost;
            const vatAmount = subtotal * 0.16;
            const totalCost = subtotal + vatAmount;

            setCostBreakdown({
                helmet_count: formData.helmet_count!,
                duration_days: duration,
                daily_rate: 1,
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


    const initiatePayment = useCallback(async () => {
        if (!phoneNumber || !costBreakdown) return;

        setPaymentStatus('initiating');
        setPaymentError('');
        setShowPaymentNotification(false);

        try {
            // Use WEB route for Inertia apps (session authentication)
            const response = await fetch(route('payments.mpesa.initiate.stk-push'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
                },
                credentials: 'include',
                body: JSON.stringify({
                    phone_number: phoneNumber,
                    amount: costBreakdown.total_cost,
                    campaign_id: null, // Will be set after campaign creation
                    campaign_data: {
                        name: formData.name,
                        helmet_count: formData.helmet_count,
                        duration: duration
                    },
                    description: `Payment for ${formData.name}`
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setPaymentReference(data.reference);
                setPaymentStatus('pending');

                // Echo will automatically update status when callback is received
            } else {
                throw new Error(data.message || 'Payment initiation failed');
            }
        } catch (error) {
            setPaymentStatus('failed');
            setPaymentError(error instanceof Error ? error.message : 'Failed to initiate payment');
            setShowPaymentNotification(true);
        }
    }, [phoneNumber, costBreakdown, formData, duration]);

 useEffect(() => {
    console.log('🎯 Echo Effect Running', {
        hasAdvertiser: !!advertiser?.id,
        advertiserId: advertiser?.id,
        paymentStatus,
        paymentReference
    });

    if (!advertiser?.id) {
        console.warn('⚠️ No advertiser ID');
        return;
    }

    // ✅ REMOVED: Don't check payment status here - always initialize Echo
    // This way Echo is ready BEFORE payment is initiated

    // Get Reverb configuration
    const reverbAppKey = import.meta.env.VITE_REVERB_APP_KEY;
    const reverbHost = import.meta.env.VITE_REVERB_HOST || 'localhost';
    const reverbPort = import.meta.env.VITE_REVERB_PORT || 8080;
    const reverbScheme = import.meta.env.VITE_REVERB_SCHEME || 'http';

    if (!reverbAppKey) {
        console.error('❌ VITE_REVERB_APP_KEY is not defined');
        return;
    }

    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    
    if (!csrfToken) {
        console.error('❌ CSRF token not found');
        return;
    }

    console.log('✅ Initializing Echo with:', {
        advertiserId: advertiser.id,
        hasCSRF: !!csrfToken,
        reverbHost,
        reverbPort,
        scheme: reverbScheme
    });

    // Initialize Echo if not already initialized
    if (!window.Echo) {
        window.Pusher = Pusher;
        
        try {
            window.Echo = new Echo({
                broadcaster: 'reverb',
                key: reverbAppKey,
                wsHost: reverbHost,
                wsPort: reverbScheme === 'https' ? 443 : reverbPort,
                wssPort: reverbScheme === 'https' ? 443 : reverbPort,
                forceTLS: reverbScheme === 'https',
                enabledTransports: ['ws', 'wss'],
                disableStats: true,
                authEndpoint: '/broadcasting/auth',
                auth: {
                    headers: {
                        'X-CSRF-TOKEN': csrfToken,
                        'Accept': 'application/json',
                    },
                },
            });

            console.log('✅ Echo initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize Echo:', error);
            return;
        }
    }

    const channelName = `payment.${advertiser.id}`;
    console.log(`🔌 Subscribing to channel: ${channelName}`);
    
    const channel = window.Echo.private(channelName);
    
    // Log subscription success
    channel.subscribed(() => {
        console.log(`✅ Successfully subscribed to ${channelName}`);
    });
    
    // Listen for the event
    channel.listen('.payment.status.updated', (event: any) => {
        console.log('💰 Payment status update received:', event);
        console.log('📋 Comparing references:', {
            received: event.reference,
            expected: paymentReference,
            match: event.reference === paymentReference
        });
        
        // ✅ Check if we have a payment reference before comparing
        if (!paymentReference) {
            console.warn('⚠️ No payment reference yet - storing event for later');
            // Event came but payment not initiated yet (shouldn't happen)
            return;
        }
        
        if (event.reference === paymentReference) {
            console.log('✅ Reference matched! Processing payment status:', event.status);
            
            if (event.status === 'success') {
                console.log('🎉 Setting payment to SUCCESS');
                setPaymentStatus('success');
                setShowPaymentNotification(true);
                setPaymentError('');
            } else if (event.status === 'failed') {
                console.log('❌ Setting payment to FAILED');
                setPaymentStatus('failed');
                setPaymentError(event.message || 'Payment failed');
                setShowPaymentNotification(true);
            }
        } else {
            console.warn('⚠️ Reference mismatch - ignoring event', {
                received: event.reference,
                expected: paymentReference
            });
        }
    });
    
    // Log errors
    channel.error((error: any) => {
        console.error('❌ Echo channel error:', error);
    });

    // Cleanup
    return () => {
        console.log(`🔌 Unsubscribing from ${channelName}`);
        channel.stopListening('.payment.status.updated');
        window.Echo.leave(channelName);
    };
}, [advertiser?.id, paymentReference]);

    useEffect(() => {
        if (activeStep === 4 && formData.helmet_count && duration && !costBreakdown && !loadingCosts) {
            calculateCosts();
        }
    }, [activeStep, formData.helmet_count, duration, costBreakdown, loadingCosts, calculateCosts]);

    const nextStep = useCallback(() => {
        if (activeStep === 3) {
            calculateCosts();
        }
        setActiveStep(current => Math.min(current + 1, 6));
    }, [activeStep, calculateCosts]);

    const prevStep = useCallback(() => {
        setActiveStep(current => Math.max(current - 1, 0));
    }, []);

    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();

        if (activeStep === 6 && paymentStatus === 'success') {
            setSubmitting(true);

            const submissionData = {
                ...formData,
                coverage_area_ids: formData.coverage_areas.map(id => parseInt(id)),
                advertiser_id: formData.advertiser_id ? parseInt(formData.advertiser_id.toString()) : null,
                payment_reference: paymentReference,
                payment_status: 'paid'
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
    }, [activeStep, formData, nextStep, paymentStatus, paymentReference]);

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
            case 6:
                return paymentStatus === 'success';
            default:
                return true;
        }
    }, [activeStep, formData, costBreakdown, paymentStatus]);

    const handleCreateCoverageArea = useCallback(() => {
        router.post(route('coverage-areas.store'), newCoverageArea, {
            onSuccess: () => {
                closeCoverageModal();
                setNewCoverageArea({ name: '', county_id: null, description: '' });
                router.reload({ only: ['coverageareas'] });
            }
        });
    }, [newCoverageArea, closeCoverageModal]);

    // Step components with improved design
    const StepBasicInfo = useMemo(() => (
        <Stack gap="lg">
            <div className="flex items-center gap-3 mb-2">
                <ThemeIcon size="xl" radius="xl" variant="gradient" gradient={{ from: 'blue', to: 'cyan', deg: 45 }}>
                    <FileText size={24} />
                </ThemeIcon>
                <div>
                    <Title order={3} className="text-gray-800 dark:text-gray-100">Basic Campaign Information</Title>
                    <Text size="sm" c="dimmed">Tell us about your campaign</Text>
                </div>
            </div>

            <Grid gutter="lg">
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
                            leftSection={<Building size={18} />}
                            radius="md"
                            styles={{
                                input: { borderWidth: 2, '&:focus': { borderColor: 'var(--mantine-color-blue-6)' } }
                            }}
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
                        radius="md"
                        leftSection={<Target size={18} />}
                        styles={{
                            input: { borderWidth: 2, '&:focus': { borderColor: 'var(--mantine-color-blue-6)' } }
                        }}
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
                        radius="md"
                        leftSection={<Building size={18} />}
                        styles={{
                            input: { borderWidth: 2, '&:focus': { borderColor: 'var(--mantine-color-blue-6)' } }
                        }}
                    />
                </Grid.Col>

                <Grid.Col span={12}>
                    <Textarea
                        label="Campaign Description"
                        placeholder="Describe your campaign objectives and key messages..."
                        value={formData.description}
                        onChange={(e) => updateFormData({ description: e.currentTarget.value })}
                        error={errors.description}
                        minRows={4}
                        size="md"
                        radius="md"
                        styles={{
                            input: { borderWidth: 2, '&:focus': { borderColor: 'var(--mantine-color-blue-6)' } }
                        }}
                    />
                </Grid.Col>
            </Grid>
        </Stack>
    ), [advertiserOptions, formData, errors, updateFormData, isAdmin]);

    const StepCampaignDetails = useMemo(() => (
        <Stack gap="lg">
            <div className="flex items-center gap-3 mb-2">
                <ThemeIcon size="xl" radius="xl" variant="gradient" gradient={{ from: 'green', to: 'teal', deg: 45 }}>
                    <MapPin size={24} />
                </ThemeIcon>
                <div>
                    <Title order={3} className="text-gray-800 dark:text-gray-100">Campaign Details & Coverage</Title>
                    <Text size="sm" c="dimmed">Set duration and target areas</Text>
                </div>
            </div>

            <Card withBorder radius="lg" p="lg" className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-gray-800 dark:to-gray-800 border-blue-100 dark:border-gray-700">
                <Grid gutter="lg">
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                        <TextInput
                            type="date"
                            label="Start Date"
                            value={formData.start_date}
                            onChange={(e) => updateFormData({ start_date: e.currentTarget.value })}
                            error={errors.start_date}
                            required
                            size="md"
                            radius="md"
                            leftSection={<Calendar size={18} />}
                            styles={{
                                input: { borderWidth: 2, '&:focus': { borderColor: 'var(--mantine-color-blue-6)' } }
                            }}
                        />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                        <TextInput
                            type="date"
                            label="End Date"
                            value={formData.end_date}
                            onChange={(e) => updateFormData({ end_date: e.currentTarget.value })}
                            error={errors.end_date}
                            required
                            size="md"
                            radius="md"
                            leftSection={<Calendar size={18} />}
                            styles={{
                                input: { borderWidth: 2, '&:focus': { borderColor: 'var(--mantine-color-blue-6)' } }
                            }}
                        />
                    </Grid.Col>

                    {duration > 0 && (
                        <Grid.Col span={12}>
                            <Paper p="md" radius="md" className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                                <Group justify="space-between" align="center">
                                    <Text size="sm" fw={500}>Campaign Duration</Text>
                                    <Badge size="xl" variant="white" color="blue" radius="md">
                                        {duration} {duration === 1 ? 'day' : 'days'}
                                    </Badge>
                                </Group>
                            </Paper>
                        </Grid.Col>
                    )}
                </Grid>
            </Card>

            <Grid gutter="lg">
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
                                radius="md"
                                leftSection={<MapPin size={18} />}
                                styles={{
                                    input: { borderWidth: 2, '&:focus': { borderColor: 'var(--mantine-color-blue-6)' } }
                                }}
                            />
                        </Box>
                        <Button
                            variant="light"
                            leftSection={<Plus size={18} />}
                            onClick={openCoverageModal}
                            size="md"
                            radius="md"
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
                        radius="md"
                        leftSection={<Users size={18} />}
                        styles={{
                            input: { borderWidth: 2, '&:focus': { borderColor: 'var(--mantine-color-blue-6)' } }
                        }}
                    />
                </Grid.Col>
            </Grid>

            <Divider
                label={
                    <Group gap="xs">
                        <Users size={18} className="text-gray-500" />
                        <Text size="sm" fw={500}>Rider Demographics (Optional)</Text>
                    </Group>
                }
                labelPosition="center"
            />

            <Grid gutter="lg">
                <Grid.Col span={{ base: 12, md: 4 }}>
                    <MultiSelect
                        label="Preferred Age Groups"
                        data={ageGroupOptions}
                        value={formData.rider_demographics.age_groups}
                        onChange={(values) => updateFormData({
                            rider_demographics: { ...formData.rider_demographics, age_groups: values }
                        })}
                        size="md"
                        radius="md"
                        styles={{
                            input: { borderWidth: 2 }
                        }}
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
                        radius="md"
                        styles={{
                            input: { borderWidth: 2 }
                        }}
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
                        radius="md"
                        styles={{
                            input: { borderWidth: 2 }
                        }}
                    />
                </Grid.Col>
            </Grid>
        </Stack>
    ), [formData, errors, duration, coverageAreaOptions, updateFormData, openCoverageModal]);

    const StepDesignRequirements = useMemo(() => (
        <Stack gap="lg">
            <div className="flex items-center gap-3 mb-2">
                <ThemeIcon size="xl" radius="xl" variant="gradient" gradient={{ from: 'purple', to: 'pink', deg: 45 }}>
                    <Palette size={24} />
                </ThemeIcon>
                <div>
                    <Title order={3} className="text-gray-800 dark:text-gray-100">Design Requirements</Title>
                    <Text size="sm" c="dimmed">Upload your design or request our services</Text>
                </div>
            </div>

            <Card withBorder p="xl" radius="lg" className="border-2 hover:border-purple-200 dark:hover:border-purple-800 transition-colors">
                <Checkbox
                    label={
                        <Group gap="xs">
                            <Text fw={500}>I need design services</Text>
                            <Badge color="purple" variant="light" size="sm">+ KES 3,000</Badge>
                        </Group>
                    }
                    description="Our professional designers will create stunning helmet graphics for your brand"
                    checked={formData.need_design}
                    onChange={(e) => updateFormData({ need_design: e.currentTarget.checked })}
                    size="md"
                />
            </Card>

            {formData.need_design ? (
                <Textarea
                    label="Design Requirements"
                    placeholder="Describe your design preferences, brand colors, logos, messages, style preferences, etc..."
                    value={formData.design_requirements}
                    onChange={(e) => updateFormData({ design_requirements: e.currentTarget.value })}
                    error={errors.design_requirements}
                    minRows={5}
                    required
                    size="md"
                    radius="md"
                    styles={{
                        input: { borderWidth: 2, '&:focus': { borderColor: 'var(--mantine-color-purple-6)' } }
                    }}
                />
            ) : (
                <FileInput
                    label="Upload Design File"
                    placeholder="Click to upload your design file"
                    description="Supported formats: JPG, PNG, PDF, AI, PSD (Max 10MB)"
                    accept=".jpg,.jpeg,.png,.pdf,.ai,.psd"
                    value={formData.design_file}
                    onChange={(file) => updateFormData({ design_file: file })}
                    error={errors.design_file}
                    leftSection={<Upload size={18} />}
                    size="md"
                    radius="md"
                    styles={{
                        input: { borderWidth: 2, '&:focus': { borderColor: 'var(--mantine-color-purple-6)' } }
                    }}
                />
            )}

            <Alert icon={<Info size={18} />} color="blue" variant="light" radius="md">
                <Text size="sm" fw={500}>
                    {formData.need_design
                        ? "Our design team will create professional graphics based on your requirements and send proofs for approval."
                        : "Please upload your design in high resolution. We'll review it and contact you if any adjustments are needed."
                    }
                </Text>
            </Alert>
        </Stack>
    ), [formData, errors, updateFormData]);

    const StepAgreement = useMemo(() => (
        <Stack gap="lg">
            <div className="flex items-center gap-3 mb-2">
                <ThemeIcon size="xl" radius="xl" variant="gradient" gradient={{ from: 'orange', to: 'red', deg: 45 }}>
                    <FileText size={24} />
                </ThemeIcon>
                <div>
                    <Title order={3} className="text-gray-800 dark:text-gray-100">Additional Details</Title>
                    <Text size="sm" c="dimmed">VAT and special instructions</Text>
                </div>
            </div>

            <Card withBorder p="xl" radius="lg" className="border-2">
                <Checkbox
                    label={
                        <Group gap="xs">
                            <Text fw={500}>I require a VAT receipt</Text>
                            <Badge color="orange" variant="light" size="sm">16% VAT</Badge>
                        </Group>
                    }
                    description="VAT-registered businesses can request official VAT receipts for tax purposes"
                    checked={formData.require_vat_receipt}
                    onChange={(e) => updateFormData({ require_vat_receipt: e.currentTarget.checked })}
                    size="md"
                />
            </Card>

            <Textarea
                label="Special Instructions"
                placeholder="Any special requirements, preferences, or instructions for your campaign..."
                value={formData.special_instructions}
                onChange={(e) => updateFormData({ special_instructions: e.currentTarget.value })}
                minRows={4}
                size="md"
                radius="md"
                styles={{
                    input: { borderWidth: 2 }
                }}
            />
        </Stack>
    ), [formData, updateFormData]);

    const StepCostReview = useMemo(() => (
        <Stack gap="lg">
            <Group justify="space-between" align="center">
                <div className="flex items-center gap-3">
                    <ThemeIcon size="xl" radius="xl" variant="gradient" gradient={{ from: 'emerald', to: 'green', deg: 45 }}>
                        <Calculator size={24} />
                    </ThemeIcon>
                    <div>
                        <Title order={3} className="text-gray-800 dark:text-gray-100">Cost Breakdown</Title>
                        <Text size="sm" c="dimmed">Review your campaign pricing</Text>
                    </div>
                </div>
                <Button
                    variant="light"
                    size="sm"
                    onClick={calculateCosts}
                    disabled={!formData.helmet_count || !duration || loadingCosts}
                    leftSection={<Calculator size={16} />}
                    radius="md"
                >
                    Recalculate
                </Button>
            </Group>

            {loadingCosts ? (
                <Paper p="xl" radius="lg" className="text-center bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800">
                    <Loader size="xl" type="dots" />
                    <Text mt="md" c="dimmed" fw={500}>Calculating your campaign costs...</Text>
                </Paper>
            ) : costBreakdown ? (
                <Stack gap="lg">
                    <Grid gutter="lg">
                        <Grid.Col span={{ base: 12, sm: 6 }}>
                            <Card withBorder p="lg" radius="lg" className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-gray-800 dark:to-gray-800 border-blue-200 dark:border-gray-700">
                                <Stack gap="xs">
                                    <Text size="sm" c="dimmed" tt="uppercase" fw={600}>Helmets</Text>
                                    <Text fw={700} size="2rem" className="text-blue-600 dark:text-blue-400">
                                        {costBreakdown.helmet_count.toLocaleString()}
                                    </Text>
                                </Stack>
                            </Card>
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, sm: 6 }}>
                            <Card withBorder p="lg" radius="lg" className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-800 border-purple-200 dark:border-gray-700">
                                <Stack gap="xs">
                                    <Text size="sm" c="dimmed" tt="uppercase" fw={600}>Duration</Text>
                                    <Text fw={700} size="2rem" className="text-purple-600 dark:text-purple-400">
                                        {costBreakdown.duration_days} days
                                    </Text>
                                </Stack>
                            </Card>
                        </Grid.Col>
                    </Grid>

                    <Card withBorder radius="lg" p="lg" className="border-2">
                        <Stack gap="md">
                            <Table horizontalSpacing="lg" verticalSpacing="md">
                                <Table.Tbody>
                                    <Table.Tr>
                                        <Table.Td>
                                            <Text fw={500} size="md">Base Campaign Cost</Text>
                                            <Text size="xs" c="dimmed" mt={4}>
                                                {costBreakdown.helmet_count} helmets × {costBreakdown.duration_days} days × KES {costBreakdown.daily_rate}
                                            </Text>
                                        </Table.Td>
                                        <Table.Td className="text-right">
                                            <Text fw={600} size="lg">
                                                KES {costBreakdown.base_cost.toLocaleString()}
                                            </Text>
                                        </Table.Td>
                                    </Table.Tr>

                                    {costBreakdown.design_cost > 0 && (
                                        <Table.Tr>
                                            <Table.Td>
                                                <Text fw={500} size="md">Design Services</Text>
                                                <Text size="xs" c="dimmed" mt={4}>Professional graphic design</Text>
                                            </Table.Td>
                                            <Table.Td className="text-right">
                                                <Text fw={600} size="lg">
                                                    KES {costBreakdown.design_cost.toLocaleString()}
                                                </Text>
                                            </Table.Td>
                                        </Table.Tr>
                                    )}

                                    <Table.Tr className="border-t-2">
                                        <Table.Td>
                                            <Text fw={600} size="md">Subtotal</Text>
                                        </Table.Td>
                                        <Table.Td className="text-right">
                                            <Text fw={600} size="lg">
                                                KES {costBreakdown.subtotal.toLocaleString()}
                                            </Text>
                                        </Table.Td>
                                    </Table.Tr>

                                    <Table.Tr>
                                        <Table.Td>
                                            <Text fw={500} size="md">VAT (16%)</Text>
                                        </Table.Td>
                                        <Table.Td className="text-right">
                                            <Text fw={600} size="lg">
                                                KES {costBreakdown.vat_amount.toLocaleString()}
                                            </Text>
                                        </Table.Td>
                                    </Table.Tr>

                                    <Table.Tr className="bg-gradient-to-r from-emerald-50 via-green-50 to-teal-50 dark:from-emerald-900/20 dark:via-green-900/20 dark:to-teal-900/20">
                                        <Table.Td>
                                            <Text fw={700} size="xl" className="text-emerald-700 dark:text-emerald-400">
                                                Total Amount
                                            </Text>
                                        </Table.Td>
                                        <Table.Td className="text-right">
                                            <Text fw={700} size="2rem" className="text-emerald-700 dark:text-emerald-400">
                                                KES {costBreakdown.total_cost.toLocaleString()}
                                            </Text>
                                        </Table.Td>
                                    </Table.Tr>
                                </Table.Tbody>
                            </Table>
                        </Stack>
                    </Card>

                    <Alert icon={<CheckCircle size={18} />} color="green" variant="light" radius="md">
                        <Text size="sm" fw={500}>
                            Your campaign total is <Text component="span" fw={700} c="green.7">KES {costBreakdown.total_cost.toLocaleString()}</Text>.
                            Proceed to review and submit your campaign.
                        </Text>
                    </Alert>
                </Stack>
            ) : (
                <Paper p="xl" radius="lg" className="text-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800">
                    <div className="flex justify-center mb-4">
                        <ThemeIcon size={64} radius="xl" variant="light" color="gray">
                            <Calculator size={32} />
                        </ThemeIcon>
                    </div>
                    <Text c="dimmed" size="lg" mb="md" fw={600}>No cost breakdown available</Text>
                    <Text c="dimmed" size="sm" mb="xl">
                        Please ensure you have filled in the helmet count and campaign dates in previous steps.
                    </Text>
                    <Button
                        onClick={calculateCosts}
                        disabled={!formData.helmet_count || !duration}
                        leftSection={<Calculator size={18} />}
                        gradient={{ from: 'blue', to: 'purple', deg: 45 }}
                        variant="gradient"
                        size="lg"
                        radius="md"
                    >
                        Calculate Costs
                    </Button>
                </Paper>
            )}
        </Stack>
    ), [loadingCosts, costBreakdown, formData.helmet_count, duration, calculateCosts]);




    const StepFinalReview = useMemo(() => (
        <Stack gap="lg">
            <div className="flex items-center gap-3 mb-2">
                <ThemeIcon size="xl" radius="xl" variant="gradient" gradient={{ from: 'indigo', to: 'violet', deg: 45 }}>
                    <Eye size={24} />
                </ThemeIcon>
                <div>
                    <Title order={3} className="text-gray-800 dark:text-gray-100">Final Review</Title>
                    <Text size="sm" c="dimmed">Review and submit your campaign</Text>
                </div>
            </div>

            <Alert icon={<Info size={18} />} color="blue" variant="light" radius="md">
                <Text size="sm" fw={500}>
                    Please review all details carefully before submitting your campaign.
                </Text>
            </Alert>

            <Card withBorder p="xl" radius="lg" className="border-2 border-blue-100 dark:border-gray-700">
                <Stack gap="lg">
                    <div>
                        <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb="xs">Campaign Name</Text>
                        <Text fw={600} size="lg" className="text-gray-800 dark:text-gray-100">{formData.name}</Text>
                    </div>

                    <Divider />

                    <Grid>
                        <Grid.Col span={{ base: 12, sm: 6 }}>
                            <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb="xs">Duration</Text>
                            <Group gap="xs">
                                <Calendar size={16} className="text-gray-500" />
                                <Text fw={500}>{formData.start_date} to {formData.end_date}</Text>
                            </Group>
                            <Badge color="blue" variant="light" size="sm" mt="xs">
                                {duration} days
                            </Badge>
                        </Grid.Col>

                        <Grid.Col span={{ base: 12, sm: 6 }}>
                            <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb="xs">Helmets</Text>
                            <Group gap="xs">
                                <Users size={16} className="text-gray-500" />
                                <Text fw={500} size="lg">{formData.helmet_count}</Text>
                            </Group>
                        </Grid.Col>

                        <Grid.Col span={12}>
                            <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb="xs">Coverage Areas</Text>
                            <Group gap="xs">
                                {formData.coverage_areas.map(areaId => {
                                    const area = coverageareas?.find(a => a.id.toString() === areaId);
                                    return area ? (
                                        <Badge key={areaId} color="green" variant="light" size="md">
                                            {area.name}
                                        </Badge>
                                    ) : null;
                                })}
                            </Group>
                        </Grid.Col>
                    </Grid>

                    <Divider />

                    <div>
                        <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb="xs">Total Cost</Text>
                        <Paper p="md" radius="md" className="bg-gradient-to-r from-emerald-500 to-green-600 text-white">
                            <Group justify="space-between" align="center">
                                <Text fw={600}>Campaign Total</Text>
                                <Text fw={700} size="2rem">
                                    KES {costBreakdown?.total_cost.toLocaleString()}
                                </Text>
                            </Group>
                        </Paper>
                    </div>
                </Stack>
            </Card>

            <Card withBorder p="lg" radius="lg" className="border-2">
                <Checkbox
                    label={<Text fw={500}>I agree to the terms and conditions</Text>}
                    description="By submitting this campaign, you agree to our service terms and pricing"
                    checked={formData.agree_to_terms}
                    onChange={(e) => updateFormData({ agree_to_terms: e.currentTarget.checked })}
                    size="md"
                    required
                />
            </Card>
        </Stack>
    ), [formData, costBreakdown, duration, coverageareas, updateFormData]);

    const StepPayment = useMemo(() => (
        <Stack gap="lg">
            <div className="flex items-center gap-3 mb-2">
                <ThemeIcon size="xl" radius="xl" variant="gradient" gradient={{ from: 'green', to: 'teal', deg: 45 }}>
                    <CreditCard size={24} />
                </ThemeIcon>
                <div>
                    <Title order={3} className="text-gray-800 dark:text-gray-100">M-Pesa Payment</Title>
                    <Text size="sm" c="dimmed">Complete your payment to submit campaign</Text>
                </div>
            </div>

            {/* Payment Success Notification */}
            {showPaymentNotification && paymentStatus === 'success' && (
                <Notification
                    icon={<CheckCircle size={20} />}
                    color="green"
                    title="Payment Successful!"
                    onClose={() => setShowPaymentNotification(false)}
                    radius="md"
                    withCloseButton
                >
                    Your payment of KES {costBreakdown?.total_cost.toLocaleString()} has been received successfully.
                    Reference: {paymentReference}
                </Notification>
            )}

            {/* Payment Failed Notification */}
            {showPaymentNotification && paymentStatus === 'failed' && (
                <Notification
                    icon={<XCircle size={20} />}
                    color="red"
                    title="Payment Failed"
                    onClose={() => setShowPaymentNotification(false)}
                    radius="md"
                    withCloseButton
                >
                    {paymentError || 'Your payment could not be processed. Please try again.'}
                </Notification>
            )}

            {/* Payment Amount Summary */}
            <Card withBorder p="xl" radius="lg" className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-800 border-2 border-green-200 dark:border-gray-700">
                <Stack gap="md">
                    <Group justify="space-between" align="center">
                        <div>
                            <Text size="sm" c="dimmed" fw={600}>Total Amount Due</Text>
                            <Text fw={700} size="2.5rem" className="text-green-600 dark:text-green-400">
                                KES {costBreakdown?.total_cost.toLocaleString()}
                            </Text>
                        </div>
                        <ThemeIcon size={80} radius="xl" variant="light" color="green">
                            <Smartphone size={40} />
                        </ThemeIcon>
                    </Group>
                    <Divider />
                    <Grid>
                        <Grid.Col span={6}>
                            <Text size="xs" c="dimmed">Campaign Duration</Text>
                            <Text fw={600}>{costBreakdown?.duration_days} days</Text>
                        </Grid.Col>
                        <Grid.Col span={6}>
                            <Text size="xs" c="dimmed">Helmets</Text>
                            <Text fw={600}>{costBreakdown?.helmet_count}</Text>
                        </Grid.Col>
                    </Grid>
                </Stack>
            </Card>

            {/* Payment Form - Idle State */}
            {paymentStatus === 'idle' && (
                <Card withBorder p="xl" radius="lg">
                    <Stack gap="lg">
                        <Alert icon={<Info size={18} />} color="blue" variant="light" radius="md">
                            <Text size="sm" fw={500}>
                                Enter your M-Pesa registered phone number to receive a payment prompt on your phone.
                            </Text>
                        </Alert>

                        <TextInput
                            label="M-Pesa Phone Number"
                            placeholder="e.g., 254712345678"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.currentTarget.value)}
                            size="lg"
                            radius="md"
                            leftSection={<Smartphone size={20} />}
                            description="Format: 254XXXXXXXXX"
                            styles={{
                                input: { borderWidth: 2, fontSize: '1.1rem', '&:focus': { borderColor: 'var(--mantine-color-green-6)' } }
                            }}
                        />

                        <Button
                            onClick={initiatePayment}
                            disabled={!phoneNumber || phoneNumber.length < 12}
                            size="xl"
                            radius="md"
                            leftSection={<CreditCard size={22} />}
                            gradient={{ from: 'green', to: 'teal', deg: 45 }}
                            variant="gradient"
                            fullWidth
                        >
                            Pay KES {costBreakdown?.total_cost.toLocaleString()} via M-Pesa
                        </Button>
                    </Stack>
                </Card>
            )}

            {/* Initiating Payment State */}
            {paymentStatus === 'initiating' && (
                <Card withBorder p="xl" radius="lg" className="text-center">
                    <Stack gap="md" align="center">
                        <Loader size="xl" type="dots" color="green" />
                        <Text fw={600} size="lg" className="text-gray-800 dark:text-gray-100">
                            Initiating Payment...
                        </Text>
                        <Text size="sm" c="dimmed">Please wait while we process your request</Text>
                    </Stack>
                </Card>
            )}

            {/* Pending Payment State */}
            {paymentStatus === 'pending' && (
                <Card withBorder p="xl" radius="lg" className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-gray-800 dark:to-gray-800 border-2 border-yellow-300 dark:border-gray-700">
                    <Stack gap="md" align="center">
                        <ThemeIcon size={80} radius="xl" color="yellow" variant="light">
                            <Clock size={40} />
                        </ThemeIcon>
                        <Text fw={700} size="xl" className="text-yellow-700 dark:text-yellow-400">
                            Payment Prompt Sent!
                        </Text>
                        <Text size="md" ta="center" c="dimmed">
                            Please check your phone <Text component="span" fw={700}>{phoneNumber}</Text> for the M-Pesa payment prompt.
                        </Text>
                        <Text size="sm" ta="center" c="dimmed">
                            Reference: <Text component="span" fw={600}>{paymentReference}</Text>
                        </Text>
                        <Alert icon={<Info size={18} />} color="yellow" variant="light" radius="md" style={{ width: '100%' }}>
                            <Text size="sm">
                                Enter your M-Pesa PIN to complete the payment.
                                You will be notified automatically once payment is confirmed.
                            </Text>
                        </Alert>
                        <Loader size="md" type="dots" color="yellow" />
                        <Text size="xs" c="dimmed">Waiting for payment confirmation...</Text>
                    </Stack>
                </Card>
            )}

            {/* Payment Success State */}
            {paymentStatus === 'success' && (
                <Card withBorder p="xl" radius="lg" className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-800 border-2 border-green-300 dark:border-gray-700">
                    <Stack gap="md" align="center">
                        <ThemeIcon size={100} radius="xl" color="green" variant="light">
                            <CheckCircle size={50} />
                        </ThemeIcon>
                        <Text fw={700} size="2rem" className="text-green-600 dark:text-green-400">
                            Payment Successful!
                        </Text>
                        <Text size="lg" ta="center" c="dimmed">
                            KES {costBreakdown?.total_cost.toLocaleString()} received successfully
                        </Text>
                        <Paper p="md" radius="md" className="bg-white dark:bg-gray-900" style={{ width: '100%' }}>
                            <Group justify="space-between">
                                <Text size="sm" c="dimmed">Transaction Reference</Text>
                                <Badge size="lg" color="green" variant="light">{paymentReference}</Badge>
                            </Group>
                        </Paper>
                        <Alert icon={<CheckCircle size={18} />} color="green" variant="light" radius="md" style={{ width: '100%' }}>
                            <Text size="sm" fw={500}>
                                Your payment has been confirmed. Click "Submit Campaign" to finalize your campaign creation.
                            </Text>
                        </Alert>
                    </Stack>
                </Card>
            )}

            {/* Payment Failed State */}
            {paymentStatus === 'failed' && (
                <Card withBorder p="xl" radius="lg" className="bg-gradient-to-br from-red-50 to-pink-50 dark:from-gray-800 dark:to-gray-800 border-2 border-red-300 dark:border-gray-700">
                    <Stack gap="md" align="center">
                        <ThemeIcon size={80} radius="xl" color="red" variant="light">
                            <AlertCircle size={40} />
                        </ThemeIcon>
                        <Text fw={700} size="xl" className="text-red-600 dark:text-red-400">
                            Payment Failed
                        </Text>
                        <Text size="md" ta="center" c="dimmed">
                            {paymentError || 'We could not process your payment. Please try again.'}
                        </Text>
                        <Button
                            onClick={() => {
                                setPaymentStatus('idle');
                                setPaymentError('');
                                setShowPaymentNotification(false);
                            }}
                            color="red"
                            variant="light"
                            size="lg"
                            radius="md"
                            leftSection={<CreditCard size={20} />}
                        >
                            Try Again
                        </Button>
                    </Stack>
                </Card>
            )}
        </Stack>
    ), [paymentStatus, phoneNumber, costBreakdown, paymentError, paymentReference, showPaymentNotification, initiatePayment]);



    return (
        <>
            <div className="w-full">
                <Card
                    withBorder
                    shadow="xl"
                    radius="xl"
                    p={{ base: "lg", sm: "xl" }}
                    className="w-full border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                >
                    <Stack gap="xl">
                        {/* Stepper */}
                        <div className="overflow-x-auto">
                            <Stepper
                                active={activeStep}
                                onStepClick={setActiveStep}
                                allowNextStepsSelect={false}
                                size="sm"
                                radius="md"
                                completedIcon={<CheckCircle size={18} />}
                                styles={{
                                    step: {
                                        padding: '0.75rem'
                                    },
                                    stepIcon: {
                                        borderWidth: 2
                                    }
                                }}
                            >
                                <Stepper.Step
                                    label={<Text size="sm" fw={500}>Basic Info</Text>}
                                    description={<Text size="xs" c="dimmed">Campaign details</Text>}
                                    icon={<FileText size={18} />}
                                />
                                <Stepper.Step
                                    label={<Text size="sm" fw={500}>Setup</Text>}
                                    description={<Text size="xs" c="dimmed">Dates & coverage</Text>}
                                    icon={<MapPin size={18} />}
                                />
                                <Stepper.Step
                                    label={<Text size="sm" fw={500}>Design</Text>}
                                    description={<Text size="xs" c="dimmed">Visual requirements</Text>}
                                    icon={<Palette size={18} />}
                                />
                                <Stepper.Step
                                    label={<Text size="sm" fw={500}>Details</Text>}
                                    description={<Text size="xs" c="dimmed">VAT & instructions</Text>}
                                    icon={<FileText size={18} />}
                                />
                                <Stepper.Step
                                    label={<Text size="sm" fw={500}>Costs</Text>}
                                    description={<Text size="xs" c="dimmed">Pricing breakdown</Text>}
                                    icon={<Calculator size={18} />}
                                />
                                <Stepper.Step
                                    label={<Text size="sm" fw={500}>Review</Text>}
                                    description={<Text size="xs" c="dimmed">Final review</Text>}
                                    icon={<Flag size={18} />}
                                />
                                <Stepper.Step
                                    label={<Text size="sm" fw={500}>Payment</Text>}
                                    description={<Text size="xs" c="dimmed">Make Payment and Submit</Text>}
                                    icon={<CreditCard size={18} />}
                                />

                            </Stepper>
                        </div>

                        {/* Progress Bar */}
                        <div>
                            <Progress
                                value={(activeStep + 1) / 7 * 100}
                                size="lg"
                                radius="xl"
                                className="w-full"
                                styles={{
                                    root: { backgroundColor: 'var(--mantine-color-gray-2)' }
                                }}
                            />
                            <Text size="xs" c="dimmed" ta="center" mt="xs">
                                Step {activeStep + 1} of 7
                            </Text>
                        </div>

                        {/* Form Content */}
                        <form onSubmit={handleSubmit}>
                            <div className="min-h-[400px]">
                                {activeStep === 0 && StepBasicInfo}
                                {activeStep === 1 && StepCampaignDetails}
                                {activeStep === 2 && StepDesignRequirements}
                                {activeStep === 3 && StepAgreement}
                                {activeStep === 4 && StepCostReview}
                                {activeStep === 5 && StepFinalReview}
                                {activeStep === 6 && StepPayment}


                            </div>

                            {/* Navigation Buttons */}
                            <Group justify="space-between" pt="xl" mt="xl" className="border-t-2 border-gray-100 dark:border-gray-700">
                                <Button
                                    variant="light"
                                    onClick={prevStep}
                                    disabled={activeStep === 0}
                                    size="lg"
                                    radius="md"
                                    leftSection={<ArrowLeft size={18} />}
                                    color="gray"
                                >
                                    Previous
                                </Button>
                                <Button
                                    type="submit"
                                    loading={submitting || (activeStep === 4 && loadingCosts)}
                                    disabled={!isStepValid}
                                    rightSection={activeStep === 6 ? <Flag size={18} /> : <ArrowRight size={18} />}
                                    size="lg"
                                    radius="md"
                                    gradient={{ from: 'blue', to: 'purple', deg: 45 }}
                                    variant="gradient"
                                >
                                    {activeStep === 6 ? 'Submit Campaign' : 'Continue'}
                                </Button>
                            </Group>
                        </form>
                    </Stack>
                </Card>
            </div>

            {/* Coverage Area Modal */}
            <Modal
                opened={coverageAreaModalOpened}
                onClose={closeCoverageModal}
                title={
                    <Group gap="sm">
                        <ThemeIcon size="md" radius="md" variant="light" color="blue">
                            <Plus size={18} />
                        </ThemeIcon>
                        <Text fw={600}>Add New Coverage Area</Text>
                    </Group>
                }
                size="md"
                radius="lg"
                centered
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
                        radius="md"
                        leftSection={<MapPin size={18} />}
                        styles={{
                            input: { borderWidth: 2 }
                        }}
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
                        radius="md"
                        styles={{
                            input: { borderWidth: 2 }
                        }}
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
                        radius="md"
                        styles={{
                            input: { borderWidth: 2 }
                        }}
                    />

                    <Group justify="flex-end" mt="md">
                        <Button
                            variant="light"
                            onClick={closeCoverageModal}
                            radius="md"
                            size="md"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreateCoverageArea}
                            disabled={!newCoverageArea.name}
                            gradient={{ from: 'blue', to: 'purple', deg: 45 }}
                            variant="gradient"
                            radius="md"
                            size="md"
                            leftSection={<Plus size={18} />}
                        >
                            Add Coverage Area
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </>
    );
}