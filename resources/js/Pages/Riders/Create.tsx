import { useState, useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link } from '@inertiajs/react';
import {
    Button,
    TextInput,
    Select,
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
} from '@mantine/core';
import type { RiderCreateProps, RiderFormData } from '@/types/rider';
import { ArrowLeftIcon, InfoIcon, UploadIcon, UserIcon, MapPinIcon } from 'lucide-react';
import axios from 'axios';

interface LocationData {
    county_id: number | '';
    sub_county_id: number | '';
    ward_id: number | '';
    stage_name: string;
    effective_from: Date | null;
    notes: string;
}

interface ExtendedRiderFormData extends RiderFormData {
    location: LocationData;
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

interface ExtendedRiderCreateProps extends RiderCreateProps {
    counties: County[];
    subcounties: SubCounty[];
    wards: Ward[];
}

export default function RiderCreate({ counties }: ExtendedRiderCreateProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const { data, setData, post, processing, errors, progress } = useForm<ExtendedRiderFormData>({
        user_id: undefined,
        firstname: '',
        lastname: '',
        email: '',
        phone: '',
        national_id: '',
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
        daily_rate: 70,
        location: {
            county_id: '',
            sub_county_id: '',
            ward_id: '',
            stage_name: '',
            effective_from: new Date(),
            notes: ''
        }
    });

    const steps = [
        { label: 'Personal Info', description: 'Basic rider information' },
        { label: 'Location Details', description: 'Rider operational location' },
        { label: 'Documents', description: 'Required documents upload' },
        { label: 'Contact & Payment', description: 'Contact details and M-Pesa' },
        { label: 'Agreement', description: 'Terms and conditions' },
    ];

    const [subcounties, setSubcounties] = useState<SubCounty[]>([]);
    const [wards, setWards] = useState<Ward[]>([]);
    const [loadingSubcounties, setLoadingSubcounties] = useState(false);
    const [loadingWards, setLoadingWards] = useState(false);

    useEffect(() => {
        if (data.location.county_id) {
            setLoadingSubcounties(true);
            axios
                .get(`/locations/counties/${data.location.county_id}/subcounties`)
                .then((res) => {
                    setSubcounties(res.data);
                    setWards([]); // reset wards
                    setData('location', {
                        ...data.location,
                        sub_county_id: '',
                        ward_id: '',
                    });
                })
                .finally(() => setLoadingSubcounties(false));
        } else {
            setSubcounties([]);
            setWards([]);
        }
    }, [data.location.county_id]);

    // fetch wards when subcounty changes
    useEffect(() => {
        if (data.location.sub_county_id) {
            setLoadingWards(true);
            axios
                .get(`/locations/subcounties/${data.location.sub_county_id}/wards`)
                .then((res) => {
                    setWards(res.data);
                    setData('location', {
                        ...data.location,
                        ward_id: '',
                    });
                })
                .finally(() => setLoadingWards(false));
        } else {
            setWards([]);
        }
    }, [data.location.sub_county_id]);

    const handleLocationChange = (field: keyof LocationData, value: any) => {
        setData('location', {
            ...data.location,
            [field]: value,
        });
    };


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('riders.store'), {
            onSuccess: () => {
                // Form will redirect on success
            }
        });
    };

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

    const isStepValid = (step: number) => {
        switch (step) {
            case 0:
                return data.firstname &&
                    data.lastname &&
                    data.email &&
                    data.phone &&
                    data.national_id;
            case 1:
                return data.location.county_id &&
                    data.location.sub_county_id &&
                    data.location.ward_id &&
                    data.location.stage_name &&
                    data.location.effective_from;
            case 2:
                return data.national_id_front_photo &&
                    data.national_id_back_photo &&
                    data.passport_photo &&
                    data.good_conduct_certificate &&
                    data.motorbike_license &&
                    data.motorbike_registration;
            case 3:
                return data.mpesa_number && data.next_of_kin_name && data.next_of_kin_phone;
            case 4:
                return data.signed_agreement.length >= 10;
            default:
                return false;
        }
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 0:
                return (
                    <Card>
                        <Stack>
                            <div>
                                <Text size="lg" fw={600} mb="sm">Personal Information</Text>
                                <Text size="sm" c="dimmed">
                                    Please provide the basic information for the rider application.
                                </Text>
                            </div>

                            <Grid>
                                <Grid.Col span={{ base: 12, md: 6 }}>
                                    <TextInput
                                        label="First Name"
                                        placeholder="Enter first name"
                                        value={data.firstname}
                                        onChange={(e) => setData('firstname', e.currentTarget.value)}
                                        error={errors.firstname}
                                        required
                                    />
                                </Grid.Col>

                                <Grid.Col span={{ base: 12, md: 6 }}>
                                    <TextInput
                                        label="Last Name"
                                        placeholder="Enter last name"
                                        value={data.lastname}
                                        onChange={(e) => setData('lastname', e.currentTarget.value)}
                                        error={errors.lastname}
                                        required
                                    />
                                </Grid.Col>

                                <Grid.Col span={{ base: 12, md: 6 }}>
                                    <TextInput
                                        label="Email Address"
                                        placeholder="example@email.com"
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
                                        description="Enter phone number in format 254XXXXXXXX"
                                        value={data.phone}
                                        onChange={(e) => setData('phone', e.currentTarget.value)}
                                        error={errors.phone}
                                        required
                                    />
                                </Grid.Col>

                                <Grid.Col span={{ base: 12, md: 12 }}>
                                    <TextInput
                                        label="National ID Number"
                                        placeholder="Enter national ID number"
                                        description="Enter the valid Kenyan National ID number (numbers only)"
                                        value={data.national_id}
                                        onChange={(e) => setData('national_id', e.currentTarget.value)}
                                        error={errors.national_id}
                                        required
                                    />
                                </Grid.Col>

                                {/* <Grid.Col span={{ base: 12, md: 6 }}>
                                    <NumberInput
                                        label="Daily Rate (KSh)"
                                        placeholder="70.00"
                                        description="Daily earning rate for the rider (default: KSh 70.00)"
                                        value={data.daily_rate}
                                        onChange={(value) => setData('daily_rate', Number(value) || 70)}
                                        error={errors.daily_rate}
                                        min={0}
                                        max={10000}
                                        decimalScale={2}
                                    />
                                </Grid.Col> */}
                            </Grid>
                        </Stack>
                    </Card>
                );

            case 1:
                return (
                    <Card>
                        <Stack>
                            <div>
                                <Text size="lg" fw={600} mb="sm">Location Details</Text>
                                <Text size="sm" c="dimmed">
                                    Specify the operational location where the rider will be based.
                                </Text>
                            </div>

                            <Alert icon={<MapPinIcon size={16} />} color="blue" variant="light">
                                <Text size="sm">
                                    <strong>Location Information:</strong>
                                    <br />• Select county, sub-county, and ward where the rider will operate
                                    <br />• Provide specific stage area name for precise location
                                </Text>
                            </Alert>

                            <Grid>
                                <Grid.Col span={{ base: 12, md: 6 }}>
                                    <Select
                                        label="County"
                                        placeholder="Select county"
                                        data={counties.map((c) => ({ value: c.id.toString(), label: c.name }))}
                                        value={data.location.county_id ? data.location.county_id.toString() : ''}
                                        onChange={(value) => handleLocationChange('county_id', value ? parseInt(value) : '')}
                                        error={errors['location.county_id']}
                                        searchable
                                        required
                                    />
                                </Grid.Col>

                                <Grid.Col span={{ base: 12, md: 6 }}>
                                    <Select
                                        label="Sub County"
                                        placeholder={loadingSubcounties ? 'Loading...' : 'Select sub county'}
                                        data={subcounties.map((s) => ({ value: s.id.toString(), label: s.name }))}
                                        value={data.location.sub_county_id ? data.location.sub_county_id.toString() : ''}
                                        onChange={(value) => handleLocationChange('sub_county_id', value ? parseInt(value) : '')}
                                        error={errors['location.sub_county_id']}
                                        disabled={!data.location.county_id || loadingSubcounties}
                                        searchable
                                        required
                                    />
                                </Grid.Col>

                                <Grid.Col span={{ base: 12, md: 6 }}>
                                    <Select
                                        label="Ward"
                                        placeholder={loadingWards ? 'Loading...' : 'Select ward'}
                                        data={wards.map((w) => ({ value: w.id.toString(), label: w.name }))}
                                        value={data.location.ward_id ? data.location.ward_id.toString() : ''}
                                        onChange={(value) => handleLocationChange('ward_id', value ? parseInt(value) : '')}
                                        error={errors['location.ward_id']}
                                        disabled={!data.location.sub_county_id || loadingWards}
                                        searchable
                                        required
                                    />
                                </Grid.Col>

                                <Grid.Col span={{ base: 12, md: 6 }}>
                                    <TextInput
                                        label="Stage/Area Name"
                                        placeholder="e.g., Kimathi Street, City Center"
                                        description="Specific stage or area name within the ward"
                                        value={data.location.stage_name}
                                        onChange={(e) => handleLocationChange('stage_name', e.currentTarget.value)}
                                        error={errors['location.stage_name']}
                                        required
                                    />
                                </Grid.Col>

                                {/* <Grid.Col span={{ base: 12, md: 6 }}>
                                    <NumberInput
                                        label="Latitude (Optional)"
                                        placeholder="e.g., -1.2864"
                                        description="GPS latitude coordinate"
                                        value={data.location.latitude || ''}
                                        onChange={(value) => handleLocationChange('latitude', value || '')}
                                        error={errors['location.latitude']}
                                        decimalScale={8}
                                        min={-90}
                                        max={90}
                                    />
                                </Grid.Col>

                                <Grid.Col span={{ base: 12, md: 6 }}>
                                    <NumberInput
                                        label="Longitude (Optional)"
                                        placeholder="e.g., 36.8172"
                                        description="GPS longitude coordinate"
                                        value={data.location.longitude || ''}
                                        onChange={(value) => handleLocationChange('longitude', value || '')}
                                        error={errors['location.longitude']}
                                        decimalScale={8}
                                        min={-180}
                                        max={180}
                                    />
                                </Grid.Col> */}

                                {/* <Grid.Col span={{ base: 12, md: 6 }}>
                                    <DateInput
                                        label="Effective From"
                                        placeholder="Select start date"
                                        description="Date from which this location assignment becomes effective"
                                        value={data.location.effective_from}
                                        onChange={(value) => handleLocationChange('effective_from', value)}
                                        error={errors['location.effective_from']}
                                        required
                                    />
                                </Grid.Col> */}

                                <Grid.Col span={12}>
                                    <Textarea
                                        label="Notes (Optional)"
                                        placeholder="Any additional notes about the location assignment"
                                        description="Optional notes about the location or special instructions"
                                        value={data.location.notes}
                                        onChange={(e) => handleLocationChange('notes', e.currentTarget.value)}
                                        error={errors['location.notes']}
                                        minRows={3}
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
                                <Text size="lg" fw={600} mb="sm">Required Documents</Text>
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
                                    <FileInput
                                        label="National ID - Front Photo"
                                        placeholder="Upload front side of National ID"
                                        description="Maximum size: 5MB (JPEG, PNG, JPG)"
                                        accept="image/jpeg,image/png,image/jpg"
                                        leftSection={<UploadIcon size={14} />}
                                        onChange={(file) => setData('national_id_front_photo', file)}
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
                                        leftSection={<UploadIcon size={14} />}
                                        onChange={(file) => setData('national_id_back_photo', file)}
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
                                        leftSection={<UploadIcon size={14} />}
                                        onChange={(file) => setData('passport_photo', file)}
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
                                        leftSection={<UploadIcon size={14} />}
                                        onChange={(file) => setData('good_conduct_certificate', file)}
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
                                        leftSection={<UploadIcon size={14} />}
                                        onChange={(file) => setData('motorbike_license', file)}
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
                                        leftSection={<UploadIcon size={14} />}
                                        onChange={(file) => setData('motorbike_registration', file)}
                                        error={errors.motorbike_registration}
                                        required
                                    />
                                </Grid.Col>
                            </Grid>
                        </Stack>
                    </Card>
                );

            case 3:
                return (
                    <Card>
                        <Stack>
                            <div>
                                <Text size="lg" fw={600} mb="sm">Contact & Payment Information</Text>
                                <Text size="sm" c="dimmed">
                                    Provide contact details and M-Pesa information for payments.
                                </Text>
                            </div>

                            <TextInput
                                label="M-Pesa Number"
                                placeholder="254712345678"
                                description="Enter M-Pesa number in format 254XXXXXXXX (will receive payments here)"
                                value={data.mpesa_number}
                                onChange={(e) => setData('mpesa_number', e.currentTarget.value)}
                                error={errors.mpesa_number}
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
                                            onChange={(e) => setData('next_of_kin_name', e.currentTarget.value)}
                                            error={errors.next_of_kin_name}
                                            required
                                        />
                                    </Grid.Col>

                                    <Grid.Col span={{ base: 12, md: 6 }}>
                                        <TextInput
                                            label="Next of Kin Phone"
                                            placeholder="254712345678"
                                            description="Phone number in format 254XXXXXXXX"
                                            value={data.next_of_kin_phone}
                                            onChange={(e) => setData('next_of_kin_phone', e.currentTarget.value)}
                                            error={errors.next_of_kin_phone}
                                            required
                                        />
                                    </Grid.Col>
                                </Grid>
                            </div>
                        </Stack>
                    </Card>
                );

            case 4:
                return (
                    <Card>
                        <Stack>
                            <div>
                                <Text size="lg" fw={600} mb="sm">Terms & Agreement</Text>
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
                                onChange={(e) => setData('signed_agreement', e.currentTarget.value)}
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

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center space-x-4">
                    <Button
                        variant="subtle"
                        leftSection={<ArrowLeftIcon size={16} />}
                        component={Link}
                        href={route('riders.index')}
                    >
                        Back to Riders
                    </Button>
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                            New Rider Application
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Complete all steps to submit a rider application
                        </p>
                    </div>
                </div>
            }
        >
            <Head title="New Rider Application" />

            <div className="w-full max-w-[90%] mx-auto space-y-6">
                {/* Progress */}
                <Card>
                    <Stepper
                        active={currentStep}
                        onStepClick={setCurrentStep}
                        allowNextStepsSelect={false}
                        size="sm"
                    >
                        {steps.map((step, index) => (
                            <Stepper.Step
                                key={index}
                                label={step.label}
                                description={step.description}
                                completedIcon={<UserIcon size={16} />}
                            />
                        ))}
                    </Stepper>

                    <div className="mt-4">
                        <Progress
                            value={(currentStep + 1) / steps.length * 100}
                            size="sm"
                            radius="xl"
                        />
                    </div>
                </Card>

                {/* Form Content */}
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
                                >
                                    Next Step
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleSubmit}
                                    loading={processing}
                                    disabled={!isStepValid(currentStep) || processing}
                                >
                                    Submit Application
                                </Button>
                            )}
                        </div>
                    </Group>
                </Card>

                {/* Upload Progress */}
                {progress && (
                    <Card>
                        <div>
                            <Text size="sm" mb="xs">Uploading files...</Text>
                            <Progress value={progress.percentage ?? 0} size="sm" />
                        </div>
                    </Card>
                )}

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
            </div>
        </AuthenticatedLayout>
    );
}