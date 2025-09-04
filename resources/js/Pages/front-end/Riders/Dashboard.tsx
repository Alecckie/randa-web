import React, { useState } from 'react';
import { Head, useForm, Link } from '@inertiajs/react';
import {
    Button,
    TextInput,
    FileInput,
    Textarea,
    Card,
    Group,
    Text,
    Stack,
    Grid,
    NumberInput,
    Alert,
    Progress,
    Stepper,
    Paper,
    Badge,
    Avatar,
    Container,
    Title,
} from '@mantine/core';
import {
    User,
    FileText,
    Phone,
    CreditCard,
    Upload,
    Check,
    AlertCircle,
    Home,
    Settings,
    LogOut,
    Bike
} from 'lucide-react';

interface User {
    id: number;
    name: string;
    email: string;
    phone?: string;
    role: string;
}

interface Rider {
    id?: number;
    national_id?: string;
    status?: 'pending' | 'approved' | 'rejected';
    daily_rate?: number;
    wallet_balance?: number;
}

interface RiderProfileProps {
    user: User;
    rider?: Rider;
}

interface FormData {
    national_id: string;
    national_id_front_photo: File | null;
    national_id_back_photo: File | null;
    passport_photo: File | null;
    good_conduct_certificate: File | null;
    motorbike_license: File | null;
    motorbike_registration: File | null;
    mpesa_number: string;
    next_of_kin_name: string;
    next_of_kin_phone: string;
    signed_agreement: string;
    daily_rate: number;
}

interface StepData {
    label: string;
    description: string;
}

export default function RiderDashboard({ user, rider }: RiderProfileProps) {
    const [currentStep, setCurrentStep] = useState<number>(0);

    const { data, setData, post, processing, errors } = useForm<FormData>({
        national_id: rider?.national_id || '',
        national_id_front_photo: null,
        national_id_back_photo: null,
        passport_photo: null,
        good_conduct_certificate: null,
        motorbike_license: null,
        motorbike_registration: null,
        mpesa_number: '',
        next_of_kin_name: '',
        next_of_kin_phone: '',
        signed_agreement: '',
        daily_rate: rider?.daily_rate || 70,
    });

    const hasProfile = !!rider?.id;
    const isApproved = rider?.status === 'approved';
    const isPending = rider?.status === 'pending';
    const isRejected = rider?.status === 'rejected';

    const steps: StepData[] = [
        { label: 'Personal Info', description: 'National ID and basic details' },
        { label: 'Documents', description: 'Required document uploads' },
        { label: 'Contact & Payment', description: 'M-Pesa and emergency contact' },
        { label: 'Agreement', description: 'Terms and conditions' },
    ];

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const endpoint = hasProfile && rider?.id
            ? route('rider.profile.update', rider.id)
            : route('rider.profile.store');

        post(endpoint, {
            onSuccess: () => {
                // Handle success
                console.log('Profile submitted successfully');
            }
        });
    };

    const nextStep = (): void => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        }
    };

    const prevStep = (): void => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const isStepValid = (step: number): boolean => {
        switch (step) {
            case 0:
                return data.national_id.length >= 7;
            case 1:
                return !!(data.national_id_front_photo &&
                    data.national_id_back_photo &&
                    data.passport_photo &&
                    data.good_conduct_certificate &&
                    data.motorbike_license &&
                    data.motorbike_registration);
            case 2:
                return !!(data.mpesa_number && data.next_of_kin_name && data.next_of_kin_phone);
            case 3:
                return data.signed_agreement.length >= 10;
            default:
                return false;
        }
    };

    const handleFileChange = (field: keyof FormData) => (file: File | null) => {
        setData(field, file as any);
    };

    const handleNumberChange = (field: keyof FormData) => (value: string | number) => {
        setData(field, Number(value) || 70 as any);
    };

    const handleTextChange = (field: keyof FormData) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setData(field, event.currentTarget.value as any);
    };

    const renderStepContent = (): React.ReactNode => {
        switch (currentStep) {
            case 0:
                return (
                    <Card>
                        <Stack>
                            <div>
                                <Text size="lg" fw={600} mb="sm">Personal Information</Text>
                                <Text size="sm" c="dimmed">
                                    Please provide your National ID details for verification.
                                </Text>
                            </div>

                            <Grid>
                                <Grid.Col span={{ base: 12, md: 6 }}>
                                    <TextInput
                                        label="National ID Number"
                                        placeholder="Enter national ID number"
                                        description="Enter your valid Kenyan National ID number"
                                        value={data.national_id}
                                        onChange={handleTextChange('national_id')}
                                        error={errors.national_id}
                                        required
                                        leftSection={<FileText size={16} />}
                                    />
                                </Grid.Col>

                                <Grid.Col span={{ base: 12, md: 6 }}>
                                    <NumberInput
                                        label="Daily Rate (KSh)"
                                        placeholder="70.00"
                                        description="Your daily earning rate (default: KSh 70.00)"
                                        value={data.daily_rate}
                                        onChange={handleNumberChange('daily_rate')}
                                        error={errors.daily_rate}
                                        min={0}
                                        max={10000}
                                        decimalScale={2}
                                        leftSection={<CreditCard size={16} />}
                                        disabled
                                    />
                                </Grid.Col>
                            </Grid>
                        </Stack>
                    </Card>
                );

            case 1:
                return (
                    <Card>
                        <Stack>
                            <div>
                                <Text size="lg" fw={600} mb="sm">Required Documents</Text>
                                <Text size="sm" c="dimmed">
                                    Please upload all required documents. All files should be clear and readable.
                                </Text>
                            </div>

                            <Alert icon={<AlertCircle size={16} />} color="blue" variant="light">
                                <Text size="sm">
                                    <strong>File Requirements:</strong>
                                    <br />• Images: JPEG, PNG, JPG format
                                    <br />• Certificates: PDF, JPEG, PNG, JPG format
                                    <br />• Maximum file sizes vary per document type
                                </Text>
                            </Alert>

                            <Grid>
                                <Grid.Col span={{ base: 12, md: 6 }}>
                                    <FileInput
                                        label="National ID - Front Photo"
                                        placeholder="Upload front side of National ID"
                                        description="Maximum size: 5MB (JPEG, PNG, JPG)"
                                        accept="image/jpeg,image/png,image/jpg"
                                        leftSection={<Upload size={14} />}
                                        onChange={handleFileChange('national_id_front_photo')}
                                        error={errors.national_id_front_photo}
                                        required
                                    />
                                </Grid.Col>

                                <Grid.Col span={{ base: 12, md: 6 }}>
                                    <FileInput
                                        label="National ID - Back Photo"
                                        placeholder="Upload back side of National ID"
                                        description="Maximum size: 5MB (JPEG, PNG, JPG)"
                                        accept="image/jpeg,image/png,image/jpg"
                                        leftSection={<Upload size={14} />}
                                        onChange={handleFileChange('national_id_back_photo')}
                                        error={errors.national_id_back_photo}
                                        required
                                    />
                                </Grid.Col>

                                <Grid.Col span={{ base: 12, md: 6 }}>
                                    <FileInput
                                        label="Passport Photo"
                                        placeholder="Upload passport size photo"
                                        description="Maximum size: 2MB (JPEG, PNG, JPG)"
                                        accept="image/jpeg,image/png,image/jpg"
                                        leftSection={<Upload size={14} />}
                                        onChange={handleFileChange('passport_photo')}
                                        error={errors.passport_photo}
                                        required
                                    />
                                </Grid.Col>

                                <Grid.Col span={{ base: 12, md: 6 }}>
                                    <FileInput
                                        label="Good Conduct Certificate"
                                        placeholder="Upload certificate of good conduct"
                                        description="Maximum size: 10MB (PDF, JPEG, PNG, JPG)"
                                        accept="application/pdf,image/jpeg,image/png,image/jpg"
                                        leftSection={<Upload size={14} />}
                                        onChange={handleFileChange('good_conduct_certificate')}
                                        error={errors.good_conduct_certificate}
                                        required
                                    />
                                </Grid.Col>

                                <Grid.Col span={{ base: 12, md: 6 }}>
                                    <FileInput
                                        label="Motorbike License"
                                        placeholder="Upload motorbike driving license"
                                        description="Maximum size: 5MB (PDF, JPEG, PNG, JPG)"
                                        accept="application/pdf,image/jpeg,image/png,image/jpg"
                                        leftSection={<Upload size={14} />}
                                        onChange={handleFileChange('motorbike_license')}
                                        error={errors.motorbike_license}
                                        required
                                    />
                                </Grid.Col>

                                <Grid.Col span={{ base: 12, md: 6 }}>
                                    <FileInput
                                        label="Motorbike Registration"
                                        placeholder="Upload motorbike registration document"
                                        description="Maximum size: 5MB (PDF, JPEG, PNG, JPG)"
                                        accept="application/pdf,image/jpeg,image/png,image/jpg"
                                        leftSection={<Upload size={14} />}
                                        onChange={handleFileChange('motorbike_registration')}
                                        error={errors.motorbike_registration}
                                        required
                                    />
                                </Grid.Col>
                            </Grid>
                        </Stack>
                    </Card>
                );

            case 2:
                return (
                    <Card>
                        <Stack>
                            <div>
                                <Text size="lg" fw={600} mb="sm">Contact & Payment Information</Text>
                                <Text size="sm" c="dimmed">
                                    Provide M-Pesa information and emergency contact details.
                                </Text>
                            </div>

                            <TextInput
                                label="M-Pesa Number"
                                placeholder="254712345678"
                                description="Enter M-Pesa number in format 254XXXXXXXX (for receiving payments)"
                                value={data.mpesa_number}
                                onChange={handleTextChange('mpesa_number')}
                                error={errors.mpesa_number}
                                leftSection={<Phone size={16} />}
                                required
                            />

                            <div>
                                <Text size="md" fw={500} mb="sm">Next of Kin Information</Text>
                                <Text size="sm" c="dimmed" mb="md">
                                    Emergency contact person details
                                </Text>

                                <Grid>
                                    <Grid.Col span={{ base: 12, md: 6 }}>
                                        <TextInput
                                            label="Next of Kin Name"
                                            placeholder="Enter full name"
                                            description="Full name of emergency contact"
                                            value={data.next_of_kin_name}
                                            onChange={handleTextChange('next_of_kin_name')}
                                            error={errors.next_of_kin_name}
                                            leftSection={<User size={16} />}
                                            required
                                        />
                                    </Grid.Col>

                                    <Grid.Col span={{ base: 12, md: 6 }}>
                                        <TextInput
                                            label="Next of Kin Phone"
                                            placeholder="254712345678"
                                            description="Phone number in format 254XXXXXXXX"
                                            value={data.next_of_kin_phone}
                                            onChange={handleTextChange('next_of_kin_phone')}
                                            error={errors.next_of_kin_phone}
                                            leftSection={<Phone size={16} />}
                                            required
                                        />
                                    </Grid.Col>
                                </Grid>
                            </div>
                        </Stack>
                    </Card>
                );

            case 3:
                return (
                    <Card>
                        <Stack>
                            <div>
                                <Text size="lg" fw={600} mb="sm">Terms & Agreement</Text>
                                <Text size="sm" c="dimmed">
                                    Please read and acknowledge the rider agreement terms.
                                </Text>
                            </div>

                            <Paper p="md" withBorder className="bg-slate-50">
                                <Text size="sm" fw={500} mb="sm">Rider Agreement Summary:</Text>
                                <Text size="xs" c="dimmed">
                                    • Agree to work according to assigned schedules and routes<br />
                                    • Maintain helmet and equipment in good condition<br />
                                    • Follow traffic rules and safety guidelines at all times<br />
                                    • Report any incidents or issues immediately<br />
                                    • Daily rate of KSh {data.daily_rate} will be paid as agreed<br />
                                    • Payments will be processed to the registered M-Pesa number<br />
                                    • Agreement can be terminated by either party with proper notice
                                </Text>
                            </Paper>

                            <Textarea
                                label="Digital Signature & Agreement"
                                placeholder="Type 'I agree to the terms and conditions stated above' and add your full name"
                                description="By typing your agreement here, you acknowledge that you have read, understood, and agree to all terms and conditions."
                                value={data.signed_agreement}
                                onChange={handleTextChange('signed_agreement')}
                                error={errors.signed_agreement}
                                minRows={4}
                                required
                            />

                            {data.signed_agreement && (
                                <Alert color="green" variant="light">
                                    <Text size="sm">
                                        Agreement acknowledged. Ready to submit application.
                                    </Text>
                                </Alert>
                            )}
                        </Stack>
                    </Card>
                );

            default:
                return null;
        }
    };

    const handleStepClick = (step: number): void => {
        setCurrentStep(step);
    };

    const getStatusBadgeColor = (status?: string): string => {
        switch (status) {
            case 'approved': return 'green';
            case 'pending': return 'yellow';
            case 'rejected': return 'red';
            default: return 'gray';
        }
    };

    const getStatusIcon = (status?: string): React.ReactNode => {
        switch (status) {
            case 'approved': return <Check size={12} />;
            case 'pending': return <AlertCircle size={12} />;
            case 'rejected': return <AlertCircle size={12} />;
            default: return <AlertCircle size={12} />;
        }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <Head title="Rider Dashboard - Complete Profile" />

            {/* Header */}
            <div className="bg-white border-b border-slate-200">
                <Container size="xl">
                    <div className="flex items-center justify-between py-4">
                        <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                                <span className="text-lg font-bold text-white">R</span>
                            </div>
                            <div>
                                <Title order={2} size="h3" className="text-slate-900">Randa Rider</Title>
                                <Text size="sm" c="dimmed">Complete your rider profile</Text>
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
                                href="/logout"
                                method="post"
                                as="button"
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
                                <Avatar size="lg" color="blue">
                                    <User size={24} />
                                </Avatar>
                                <div>
                                    <Text size="lg" fw={600}>{user.name}</Text>
                                    <Text size="sm" c="dimmed">{user.email}</Text>
                                    <Text size="sm" c="dimmed">{user.phone || 'No phone number'}</Text>
                                </div>
                            </div>
                            <div className="text-right">
                                <Badge
                                    color={getStatusBadgeColor(rider?.status)}
                                    variant="light"
                                    leftSection={getStatusIcon(rider?.status)}
                                >
                                    {hasProfile && rider?.status
                                        ? rider?.status?.charAt(0)?.toUpperCase() + rider?.status?.slice(1)
                                        : 'Not Completed'
                                    }
                                </Badge>
                                {rider?.wallet_balance !== undefined && (
                                    <Text size="sm" c="dimmed" mt="xs">
                                        Balance: KSh {rider.wallet_balance}
                                    </Text>
                                )}
                            </div>
                        </div>
                    </Card>

                    {/* Status Messages */}
                    {!hasProfile && (
                        <Alert color="blue" variant="light" icon={<AlertCircle size={16} />}>
                            <Text size="sm">
                                <strong>Complete Your Profile:</strong> Please fill out all required information to start earning as a rider.
                            </Text>
                        </Alert>
                    )}

                    {isPending && (
                        <Alert color="yellow" variant="light" icon={<AlertCircle size={16} />}>
                            <Text size="sm">
                                <strong>Application Under Review:</strong> Your profile is being reviewed by our team. You'll be notified once it's approved.
                            </Text>
                        </Alert>
                    )}

                    {isApproved && (
                        <Alert color="green" variant="light" icon={<Check size={16} />}>
                            <Text size="sm">
                                <strong>Profile Approved:</strong> Congratulations! Your rider profile has been approved and you can start earning.
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

                    {(!hasProfile || isRejected) && (
                        <>
                            {/* Progress Stepper */}
                            <Card>
                                <Stepper
                                    active={currentStep}
                                    onStepClick={handleStepClick}
                                    allowNextStepsSelect={false}
                                    size="sm"
                                >
                                    {steps.map((step, index) => (
                                        <Stepper.Step
                                            key={index}
                                            label={step.label}
                                            description={step.description}
                                            completedIcon={<Check size={16} />}
                                        />
                                    ))}
                                </Stepper>

                                <div className="mt-4">
                                    <Progress
                                        value={(currentStep + 1) / steps.length * 100}
                                        size="sm"
                                        radius="xl"
                                        color="blue"
                                    />
                                </div>
                            </Card>

                            {/* Form Content */}
                            <form onSubmit={handleSubmit}>
                                {renderStepContent()}

                                {/* Navigation Buttons */}
                                <Card>
                                    <Group justify="space-between">
                                        <Button
                                            variant="light"
                                            onClick={prevStep}
                                            disabled={currentStep === 0}
                                        >
                                            Previous
                                        </Button>

                                        <div>
                                            {currentStep < steps.length - 1 ? (
                                                <Button
                                                    onClick={nextStep}
                                                    disabled={!isStepValid(currentStep)}
                                                    color="blue"
                                                >
                                                    Next Step
                                                </Button>
                                            ) : (
                                                <Button
                                                    type="submit"
                                                    loading={processing}
                                                    disabled={!isStepValid(currentStep) || processing}
                                                    color="blue"
                                                    leftSection={<Check size={16} />}
                                                >
                                                    {hasProfile ? 'Update Profile' : 'Submit Application'}
                                                </Button>
                                            )}
                                        </div>
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
                            </form>
                        </>
                    )}

                    {/* Approved Rider Dashboard Content */}
                    {isApproved && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <Card>
                                <div className="flex items-center space-x-3">
                                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                        <CreditCard size={24} className="text-green-600" />
                                    </div>
                                    <div>
                                        <Text size="sm" c="dimmed">Daily Rate</Text>
                                        <Text size="lg" fw={600}>KSh {rider?.daily_rate}</Text>
                                    </div>
                                </div>
                            </Card>

                            <Card>
                                <div className="flex items-center space-x-3">
                                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                        <Bike size={24} className="text-blue-600" />
                                    </div>
                                    <div>
                                        <Text size="sm" c="dimmed">Wallet Balance</Text>
                                        <Text size="lg" fw={600}>KSh {rider?.wallet_balance}</Text>
                                    </div>
                                </div>
                            </Card>

                            <Card>
                                <div className="flex items-center space-x-3">
                                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                        <Check size={24} className="text-purple-600" />
                                    </div>
                                    <div>
                                        <Text size="sm" c="dimmed">Status</Text>
                                        <Text size="lg" fw={600} c="green">Active</Text>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    )}
                </div>
            </Container>
        </div>
    );
}