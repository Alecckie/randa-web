import { useState, useEffect } from 'react';
import {
    Alert,
    Button,
    Card,
    FileInput,
    Grid,
    Group,
    NumberInput,
    Paper,
    Progress,
    Select,
    Stack,
    Stepper,
    Text,
    Textarea,
    TextInput,
} from '@mantine/core';
import { InfoIcon, MapPinIcon, UploadIcon, UserIcon, CheckCircleIcon } from 'lucide-react';
import axios from 'axios';
import { useForm } from '@inertiajs/react';

interface LocationData {
    county_id: number | '';
    sub_county_id: number | '';
    ward_id: number | '';
    stage_name: string;
    latitude: number | '';
    longitude: number | '';
    effective_from: Date | null;
    notes: string;
}

interface County {
    id: number;
    name: string;
}

interface SubCounty {
    id: number;
    name: string;
    county_id: number;
}

interface Ward {
    id: number;
    name: string;
    sub_county_id: number;
}

interface RiderData {
    id?: number;
    national_id: string;
    mpesa_number: string;
    next_of_kin_name: string;
    next_of_kin_phone: string;
    signed_agreement: string;
    daily_rate: number;
    has_location?: boolean;
    has_documents?: boolean;
    has_contact_info?: boolean;
    has_agreement?: boolean;
}

interface RiderDetailsFormProps {
    rider: RiderData | null;
    counties: County[];
    isUpdate?: boolean;
}

export default function RiderDetailsForm({
    rider,
    counties,
    isUpdate = false,
}: RiderDetailsFormProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [subcounties, setSubcounties] = useState<SubCounty[]>([]);
    const [wards, setWards] = useState<Ward[]>([]);
    const [loadingSubcounties, setLoadingSubcounties] = useState(false);
    const [loadingWards, setLoadingWards] = useState(false);
    
    // Step completion tracking
    type StepKey = 'location' | 'documents' | 'contact' | 'agreement';
    
    const [stepsCompleted, setStepsCompleted] = useState<Record<StepKey, boolean>>({
        location: rider?.has_location || false,
        documents: rider?.has_documents || false,
        contact: rider?.has_contact_info || false,
        agreement: rider?.has_agreement || false,
    });

    // Separate forms for each step
    const locationForm = useForm({
        location: {
            county_id: '' as number | '',
            sub_county_id: '' as number | '',
            ward_id: '' as number | '',
            stage_name: '',
            latitude: '' as number | '',
            longitude: '' as number | '',
            notes: '',
        }
    });

    const documentsForm = useForm({
        national_id: rider?.national_id || '',
        national_id_front_photo: null as File | null,
        national_id_back_photo: null as File | null,
        passport_photo: null as File | null,
        good_conduct_certificate: null as File | null,
        motorbike_license: null as File | null,
        motorbike_registration: null as File | null,
    });

    const contactForm = useForm({
        mpesa_number: rider?.mpesa_number || '',
        next_of_kin_name: rider?.next_of_kin_name || '',
        next_of_kin_phone: rider?.next_of_kin_phone || '',
    });

    const agreementForm = useForm({
        signed_agreement: rider?.signed_agreement || '',
    });

    const steps = [
        { label: 'Location Details', description: 'Rider operational location', completed: stepsCompleted.location },
        { label: 'Documents', description: 'Required documents upload', completed: stepsCompleted.documents },
        { label: 'Contact & Payment', description: 'Contact details and M-Pesa', completed: stepsCompleted.contact },
        { label: 'Agreement', description: 'Terms and conditions', completed: stepsCompleted.agreement },
    ];

    // Load subcounties when county changes
    useEffect(() => {
        if (locationForm.data.location.county_id) {
            setLoadingSubcounties(true);
            axios
                .get(`/locations/counties/${locationForm.data.location.county_id}/subcounties`)
                .then((res) => {
                    setSubcounties(res.data);
                    setWards([]);
                })
                .finally(() => setLoadingSubcounties(false));
        } else {
            setSubcounties([]);
            setWards([]);
        }
    }, [locationForm.data.location.county_id]);

    // Load wards when subcounty changes
    useEffect(() => {
        if (locationForm.data.location.sub_county_id) {
            setLoadingWards(true);
            axios
                .get(`/locations/subcounties/${locationForm.data.location.sub_county_id}/wards`)
                .then((res) => {
                    setWards(res.data);
                })
                .finally(() => setLoadingWards(false));
        } else {
            setWards([]);
        }
    }, [locationForm.data.location.sub_county_id]);

    const nextStep = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        }
    };

    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    // Step validation
    const isStepValid = (step: number) => {
        switch (step) {
            case 0:
                return locationForm.data.location.county_id &&
                    locationForm.data.location.sub_county_id &&
                    locationForm.data.location.ward_id &&
                    locationForm.data.location.stage_name;
            case 1:
                return documentsForm.data.national_id &&
                    (stepsCompleted.documents || (
                        documentsForm.data.national_id_front_photo &&
                        documentsForm.data.national_id_back_photo &&
                        documentsForm.data.passport_photo &&
                        documentsForm.data.good_conduct_certificate &&
                        documentsForm.data.motorbike_license &&
                        documentsForm.data.motorbike_registration
                    ));
            case 2:
                return contactForm.data.mpesa_number &&
                    contactForm.data.next_of_kin_name &&
                    contactForm.data.next_of_kin_phone;
            case 3:
                return agreementForm.data.signed_agreement.length >= 10;
            default:
                return false;
        }
    };

    // Step submission handlers
    const handleLocationSubmit = () => {
        locationForm.post(route('rider.profile.location'), {
            preserveScroll: true,
            onSuccess: () => {
                setStepsCompleted(prev => ({ ...prev, location: true }));
                nextStep();
            },
        });
    };

    const handleDocumentsSubmit = () => {
        documentsForm.post(route('rider.profile.documents'), {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => {
                setStepsCompleted(prev => ({ ...prev, documents: true }));
                nextStep();
            },
        });
    };

    const handleContactSubmit = () => {
        contactForm.post(route('rider.profile.contact'), {
            preserveScroll: true,
            onSuccess: () => {
                setStepsCompleted(prev => ({ ...prev, contact: true }));
                nextStep();
            },
        });
    };

    const handleAgreementSubmit = () => {
        agreementForm.post(route('rider.profile.agreement'), {
            preserveScroll: true,
            onSuccess: () => {
                setStepsCompleted(prev => ({ ...prev, agreement: true }));
                // Profile complete - could redirect or show success message
            },
        });
    };

    const getCurrentForm = () => {
        switch (currentStep) {
            case 0: return locationForm;
            case 1: return documentsForm;
            case 2: return contactForm;
            case 3: return agreementForm;
            default: return locationForm;
        }
    };

    const handleCurrentStepSubmit = () => {
        switch (currentStep) {
            case 0: return handleLocationSubmit();
            case 1: return handleDocumentsSubmit();
            case 2: return handleContactSubmit();
            case 3: return handleAgreementSubmit();
        }
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 0:
                return (
                    <Card>
                        <Stack>
                            <div>
                                <Group justify="space-between" align="center">
                                    <Text size="lg" fw={600} mb="sm">Location Details</Text>
                                    {stepsCompleted.location && (
                                        <Group gap="xs">
                                            <CheckCircleIcon size={16} className="text-green-500" />
                                            <Text size="sm" c="green">Completed</Text>
                                        </Group>
                                    )}
                                </Group>
                                <Text size="sm" c="dimmed">
                                    Specify the operational location where you will be based.
                                </Text>
                            </div>

                            <Alert icon={<MapPinIcon size={16} />} color="blue" variant="light">
                                <Text size="sm">
                                    <strong>Location Information:</strong>
                                    <br />• Select county, sub-county, and ward where you will operate
                                    <br />• Provide specific stage area name for precise location
                                </Text>
                            </Alert>

                            <Grid>
                                <Grid.Col span={{ base: 12, md: 6 }}>
                                    <Select
                                        label="County"
                                        placeholder="Select county"
                                        data={counties.map((c) => ({ value: c.id.toString(), label: c.name }))}
                                        value={locationForm.data.location.county_id ? locationForm.data.location.county_id.toString() : ''}
                                        onChange={(value) => locationForm.setData('location', {
                                            ...locationForm.data.location,
                                            county_id: value ? parseInt(value) : '',
                                            sub_county_id: '',
                                            ward_id: '',
                                        })}
                                        error={locationForm.errors['location.county_id']}
                                        searchable
                                        required
                                    />
                                </Grid.Col>

                                <Grid.Col span={{ base: 12, md: 6 }}>
                                    <Select
                                        label="Sub County"
                                        placeholder={loadingSubcounties ? 'Loading...' : 'Select sub county'}
                                        data={subcounties.map((s) => ({ value: s.id.toString(), label: s.name }))}
                                        value={locationForm.data.location.sub_county_id ? locationForm.data.location.sub_county_id.toString() : ''}
                                        onChange={(value) => locationForm.setData('location', {
                                            ...locationForm.data.location,
                                            sub_county_id: value ? parseInt(value) : '',
                                            ward_id: '',
                                        })}
                                        error={locationForm.errors['location.sub_county_id']}
                                        disabled={!locationForm.data.location.county_id || loadingSubcounties}
                                        searchable
                                        required
                                    />
                                </Grid.Col>

                                <Grid.Col span={{ base: 12, md: 6 }}>
                                    <Select
                                        label="Ward"
                                        placeholder={loadingWards ? 'Loading...' : 'Select ward'}
                                        data={wards.map((w) => ({ value: w.id.toString(), label: w.name }))}
                                        value={locationForm.data.location.ward_id ? locationForm.data.location.ward_id.toString() : ''}
                                        onChange={(value) => locationForm.setData('location', {
                                            ...locationForm.data.location,
                                            ward_id: value ? parseInt(value) : ''
                                        })}
                                        error={locationForm.errors['location.ward_id']}
                                        disabled={!locationForm.data.location.sub_county_id || loadingWards}
                                        searchable
                                        required
                                    />
                                </Grid.Col>

                                <Grid.Col span={{ base: 12, md: 6 }}>
                                    <TextInput
                                        label="Stage/Area Name"
                                        placeholder="e.g., Kimathi Street, City Center"
                                        description="Specific stage or area name within the ward"
                                        value={locationForm.data.location.stage_name}
                                        onChange={(e) => locationForm.setData('location', {
                                            ...locationForm.data.location,
                                            stage_name: e.currentTarget.value
                                        })}
                                        error={locationForm.errors['location.stage_name']}
                                        required
                                    />
                                </Grid.Col>

                                <Grid.Col span={12}>
                                    <Textarea
                                        label="Notes (Optional)"
                                        placeholder="Any additional notes about the location assignment"
                                        description="Optional notes about the location or special instructions"
                                        value={locationForm.data.location.notes}
                                        onChange={(e) => locationForm.setData('location', {
                                            ...locationForm.data.location,
                                            notes: e.currentTarget.value
                                        })}
                                        error={locationForm.errors['location.notes']}
                                        minRows={3}
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
                                <Group justify="space-between" align="center">
                                    <Text size="lg" fw={600} mb="sm">Required Documents</Text>
                                    {stepsCompleted.documents && (
                                        <Group gap="xs">
                                            <CheckCircleIcon size={16} className="text-green-500" />
                                            <Text size="sm" c="green">Completed</Text>
                                        </Group>
                                    )}
                                </Group>
                                <Text size="sm" c="dimmed">
                                    Please upload all required documents. All files should be clear and readable.
                                </Text>
                            </div>

                            <Alert icon={<InfoIcon size={16} />} color="blue" variant="light">
                                <Text size="sm">
                                    <strong>File Requirements:</strong>
                                    <br />• Images: JPEG, PNG, JPG format
                                    <br />• Certificates: PDF, JPEG, PNG, JPG format
                                    <br />• Maximum file sizes vary per document type
                                </Text>
                            </Alert>

                            <Grid>
                                <Grid.Col span={{ base: 12, md: 6 }}>
                                    <TextInput
                                        label="National ID Number"
                                        placeholder="Enter national ID number"
                                        description="Enter the valid Kenyan National ID number"
                                        value={documentsForm.data.national_id}
                                        onChange={(e) => documentsForm.setData('national_id', e.currentTarget.value)}
                                        error={documentsForm.errors.national_id}
                                        required
                                    />
                                </Grid.Col>

                                <Grid.Col span={{ base: 12, md: 6 }}>
                                    <FileInput
                                        label="National ID - Front Photo"
                                        placeholder="Upload front side of National ID"
                                        description="Maximum size: 5MB (JPEG, PNG, JPG)"
                                        accept="image/jpeg,image/png,image/jpg"
                                        leftSection={<UploadIcon size={14} />}
                                        onChange={(file) => documentsForm.setData('national_id_front_photo', file)}
                                        error={documentsForm.errors.national_id_front_photo}
                                        required={!stepsCompleted.documents}
                                    />
                                </Grid.Col>

                                <Grid.Col span={{ base: 12, md: 6 }}>
                                    <FileInput
                                        label="National ID - Back Photo"
                                        placeholder="Upload back side of National ID"
                                        description="Maximum size: 5MB (JPEG, PNG, JPG)"
                                        accept="image/jpeg,image/png,image/jpg"
                                        leftSection={<UploadIcon size={14} />}
                                        onChange={(file) => documentsForm.setData('national_id_back_photo', file)}
                                        error={documentsForm.errors.national_id_back_photo}
                                        required={!stepsCompleted.documents}
                                    />
                                </Grid.Col>

                                <Grid.Col span={{ base: 12, md: 6 }}>
                                    <FileInput
                                        label="Passport Photo"
                                        placeholder="Upload passport size photo"
                                        description="Maximum size: 2MB (JPEG, PNG, JPG)"
                                        accept="image/jpeg,image/png,image/jpg"
                                        leftSection={<UploadIcon size={14} />}
                                        onChange={(file) => documentsForm.setData('passport_photo', file)}
                                        error={documentsForm.errors.passport_photo}
                                        required={!stepsCompleted.documents}
                                    />
                                </Grid.Col>

                                <Grid.Col span={{ base: 12, md: 6 }}>
                                    <FileInput
                                        label="Good Conduct Certificate"
                                        placeholder="Upload certificate of good conduct"
                                        description="Maximum size: 10MB (PDF, JPEG, PNG, JPG)"
                                        accept="application/pdf,image/jpeg,image/png,image/jpg"
                                        leftSection={<UploadIcon size={14} />}
                                        onChange={(file) => documentsForm.setData('good_conduct_certificate', file)}
                                        error={documentsForm.errors.good_conduct_certificate}
                                        required={!stepsCompleted.documents}
                                    />
                                </Grid.Col>

                                <Grid.Col span={{ base: 12, md: 6 }}>
                                    <FileInput
                                        label="Motorbike License"
                                        placeholder="Upload motorbike driving license"
                                        description="Maximum size: 5MB (PDF, JPEG, PNG, JPG)"
                                        accept="application/pdf,image/jpeg,image/png,image/jpg"
                                        leftSection={<UploadIcon size={14} />}
                                        onChange={(file) => documentsForm.setData('motorbike_license', file)}
                                        error={documentsForm.errors.motorbike_license}
                                        required={!stepsCompleted.documents}
                                    />
                                </Grid.Col>

                                <Grid.Col span={{ base: 12, md: 6 }}>
                                    <FileInput
                                        label="Motorbike Registration"
                                        placeholder="Upload motorbike registration document"
                                        description="Maximum size: 5MB (PDF, JPEG, PNG, JPG)"
                                        accept="application/pdf,image/jpeg,image/png,image/jpg"
                                        leftSection={<UploadIcon size={14} />}
                                        onChange={(file) => documentsForm.setData('motorbike_registration', file)}
                                        error={documentsForm.errors.motorbike_registration}
                                        required={!stepsCompleted.documents}
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
                                <Group justify="space-between" align="center">
                                    <Text size="lg" fw={600} mb="sm">Contact & Payment Information</Text>
                                    {stepsCompleted.contact && (
                                        <Group gap="xs">
                                            <CheckCircleIcon size={16} className="text-green-500" />
                                            <Text size="sm" c="green">Completed</Text>
                                        </Group>
                                    )}
                                </Group>
                                <Text size="sm" c="dimmed">
                                    Provide contact details and M-Pesa information for payments.
                                </Text>
                            </div>

                            <TextInput
                                label="M-Pesa Number"
                                placeholder="254712345678"
                                description="Enter M-Pesa number in format 254XXXXXXXX (will receive payments here)"
                                value={contactForm.data.mpesa_number}
                                onChange={(e) => contactForm.setData('mpesa_number', e.currentTarget.value)}
                                error={contactForm.errors.mpesa_number}
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
                                            value={contactForm.data.next_of_kin_name}
                                            onChange={(e) => contactForm.setData('next_of_kin_name', e.currentTarget.value)}
                                            error={contactForm.errors.next_of_kin_name}
                                            required
                                        />
                                    </Grid.Col>

                                    <Grid.Col span={{ base: 12, md: 6 }}>
                                        <TextInput
                                            label="Next of Kin Phone"
                                            placeholder="254712345678"
                                            description="Phone number in format 254XXXXXXXX"
                                            value={contactForm.data.next_of_kin_phone}
                                            onChange={(e) => contactForm.setData('next_of_kin_phone', e.currentTarget.value)}
                                            error={contactForm.errors.next_of_kin_phone}
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
                                <Group justify="space-between" align="center">
                                    <Text size="lg" fw={600} mb="sm">Terms & Agreement</Text>
                                    {stepsCompleted.agreement && (
                                        <Group gap="xs">
                                            <CheckCircleIcon size={16} className="text-green-500" />
                                            <Text size="sm" c="green">Completed</Text>
                                        </Group>
                                    )}
                                </Group>
                                <Text size="sm" c="dimmed">
                                    Please read and acknowledge the rider agreement terms.
                                </Text>
                            </div>

                            <Paper p="md" withBorder className="bg-gray-50 dark:bg-gray-700">
                                <Text size="sm" fw={500} mb="sm">Rider Agreement Summary:</Text>
                                <Text size="xs" c="dimmed">
                                    • Agree to work according to assigned schedules and routes<br />
                                    • Maintain helmet and equipment in good condition<br />
                                    • Follow traffic rules and safety guidelines at all times<br />
                                    • Report any incidents or issues immediately<br />
                                    • Daily rate of KSh {rider?.daily_rate || 70} will be paid as agreed<br />
                                    • Payments will be processed to the registered M-Pesa number<br />
                                    • Agreement can be terminated by either party with proper notice
                                </Text>
                            </Paper>

                            <Textarea
                                label="Digital Signature & Agreement"
                                placeholder="Type 'I agree to the terms and conditions stated above' and add your full name"
                                description="By typing your agreement here, you acknowledge that you have read, understood, and agree to all terms and conditions."
                                value={agreementForm.data.signed_agreement}
                                onChange={(e) => agreementForm.setData('signed_agreement', e.currentTarget.value)}
                                error={agreementForm.errors.signed_agreement}
                                minRows={4}
                                required
                            />

                            {agreementForm.data.signed_agreement && (
                                <Alert color="green" variant="light">
                                    <Text size="sm">
                                        Agreement acknowledged. Ready to submit your profile for review.
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

    const currentForm = getCurrentForm();

    return (
        <div className="space-y-6">
            {/* Progress Stepper */}
            <Card>
                <Stepper
                    active={currentStep}
                    onStepClick={(step) => {
                        // Allow clicking on completed steps or current step
                        const stepKeys: StepKey[] = ['location', 'documents', 'contact', 'agreement'];
                        if (step <= currentStep || stepsCompleted[stepKeys[step]]) {
                            setCurrentStep(step);
                        }
                    }}
                    allowNextStepsSelect={false}
                    size="sm"
                >
                    {steps.map((step, index) => (
                        <Stepper.Step
                            key={index}
                            label={step.label}
                            description={step.description}
                            completedIcon={<CheckCircleIcon size={16} />}
                            color={step.completed ? 'green' : undefined}
                        />
                    ))}
                </Stepper>

                <div className="mt-4">
                    <Progress
                        value={(Object.values(stepsCompleted).filter(Boolean).length / steps.length) * 100}
                        size="sm"
                        radius="xl"
                        color={Object.values(stepsCompleted).every(Boolean) ? 'green' : 'blue'}
                    />
                    <Text size="xs" c="dimmed" mt="xs" ta="center">
                        {Object.values(stepsCompleted).filter(Boolean).length} of {steps.length} steps completed
                    </Text>
                </div>
            </Card>

            {/* Form Content */}
            {renderStepContent()}

            {/* Navigation Buttons */}
            <Card>
                <Group justify="space-between">
                    <div>
                        {currentStep > 0 && (
                            <Button
                                variant="light"
                                onClick={prevStep}
                                disabled={currentForm.processing}
                            >
                                Previous
                            </Button>
                        )}
                    </div>

                    <div>
                        <Button
                            onClick={handleCurrentStepSubmit}
                            loading={currentForm.processing}
                            disabled={!isStepValid(currentStep) || currentForm.processing}
                        >
                            {currentStep === steps.length - 1 ? 'Complete Profile' : 'Save & Continue'}
                        </Button>
                    </div>
                </Group>
            </Card>

            {/* Upload Progress */}
            {currentForm.progress && (
                <Card>
                    <div>
                        <Text size="sm" mb="xs">Uploading files...</Text>
                        <Progress value={currentForm.progress.percentage ?? 0} size="sm" />
                    </div>
                </Card>
            )}

            {/* Error Summary */}
            {Object.keys(currentForm.errors).length > 0 && (
                <Alert color="red" variant="light">
                    <Text size="sm" fw={500} mb="xs">Please fix the following errors:</Text>
                    <ul className="list-disc list-inside text-sm space-y-1">
                        {Object.entries(currentForm.errors).map(([field, error]) => (
                            <li key={field}>{error}</li>
                        ))}
                    </ul>
                </Alert>
            )}
        </div>
    );
}