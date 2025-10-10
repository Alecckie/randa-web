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
import { InfoIcon, MapPinIcon, UploadIcon, UserIcon } from 'lucide-react';
import axios from 'axios';

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

interface RiderDetailsFormProps {
    data: {
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
        location: LocationData;
    };
    errors: Record<string, string>;
    counties: County[];
    processing: boolean;
    progress?: { percentage?: number } | null;
    isUpdate?: boolean; 
    onChange: (field: string, value: any) => void;
    onLocationChange: (field: keyof LocationData, value: any) => void;
    onSubmit: () => void;
    onCancel?: () => void; 
}

export default function RiderDetailsForm({
    data,
    errors,
    counties,
    processing,
    progress,
    isUpdate = false,
    onChange,
    onLocationChange,
    onSubmit,
    onCancel
}: RiderDetailsFormProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [subcounties, setSubcounties] = useState<SubCounty[]>([]);
    const [wards, setWards] = useState<Ward[]>([]);
    const [loadingSubcounties, setLoadingSubcounties] = useState(false);
    const [loadingWards, setLoadingWards] = useState(false);

    const steps = [
        { label: 'Location Details', description: 'Rider operational location' },
        { label: 'Documents', description: 'Required documents upload' },
        { label: 'Contact & Payment', description: 'Contact details and M-Pesa' },
        { label: 'Agreement', description: 'Terms and conditions' },
    ];

    useEffect(() => {
        if (data.location.county_id) {
            setLoadingSubcounties(true);
            axios
                .get(`/locations/counties/${data.location.county_id}/subcounties`)
                .then((res) => {
                    setSubcounties(res.data);
                    setWards([]);
                })
                .finally(() => setLoadingSubcounties(false));
        } else {
            setSubcounties([]);
            setWards([]);
        }
    }, [data.location.county_id]);

    useEffect(() => {
        if (data.location.sub_county_id) {
            setLoadingWards(true);
            axios
                .get(`/locations/subcounties/${data.location.sub_county_id}/wards`)
                .then((res) => {
                    setWards(res.data);
                })
                .finally(() => setLoadingWards(false));
        } else {
            setWards([]);
        }
    }, [data.location.sub_county_id]);

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
                return data.location.county_id &&
                    data.location.sub_county_id &&
                    data.location.ward_id &&
                    data.location.stage_name
                    // data.location.effective_from;
            case 1:
                return data.national_id &&
                    data.national_id_front_photo &&
                    data.national_id_back_photo &&
                    data.passport_photo &&
                    data.good_conduct_certificate &&
                    data.motorbike_license &&
                    data.motorbike_registration;
            case 2:
                return data.mpesa_number && data.next_of_kin_name && data.next_of_kin_phone;
            case 3:
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
                                        onChange={(value) => onLocationChange('county_id', value ? parseInt(value) : '')}
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
                                        onChange={(value) => onLocationChange('sub_county_id', value ? parseInt(value) : '')}
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
                                        onChange={(value) => onLocationChange('ward_id', value ? parseInt(value) : '')}
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
                                        onChange={(e) => onLocationChange('stage_name', e.currentTarget.value)}
                                        error={errors['location.stage_name']}
                                        required
                                    />
                                </Grid.Col>

                                <Grid.Col span={{ base: 12, md: 6 }}>
                                    <NumberInput
                                        label="Latitude (Optional)"
                                        placeholder="e.g., -1.2864"
                                        description="GPS latitude coordinate"
                                        value={data.location.latitude || ''}
                                        onChange={(value) => onLocationChange('latitude', value || '')}
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
                                        onChange={(value) => onLocationChange('longitude', value || '')}
                                        error={errors['location.longitude']}
                                        decimalScale={8}
                                        min={-180}
                                        max={180}
                                    />
                                </Grid.Col>

                                <Grid.Col span={12}>
                                    <Textarea
                                        label="Notes (Optional)"
                                        placeholder="Any additional notes about the location assignment"
                                        description="Optional notes about the location or special instructions"
                                        value={data.location.notes}
                                        onChange={(e) => onLocationChange('notes', e.currentTarget.value)}
                                        error={errors['location.notes']}
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
                                    <TextInput
                                        label="National ID Number"
                                        placeholder="Enter national ID number"
                                        description="Enter the valid Kenyan National ID number (numbers only)"
                                        value={data.national_id}
                                        onChange={(e) => onChange('national_id', e.currentTarget.value)}
                                        error={errors.national_id}
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
                                        onChange={(file) => onChange('national_id_front_photo', file)}
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
                                        onChange={(file) => onChange('national_id_back_photo', file)}
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
                                        onChange={(file) => onChange('passport_photo', file)}
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
                                        onChange={(file) => onChange('good_conduct_certificate', file)}
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
                                        onChange={(file) => onChange('motorbike_license', file)}
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
                                        onChange={(file) => onChange('motorbike_registration', file)}
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
                                    Provide contact details and M-Pesa information for payments.
                                </Text>
                            </div>

                            <TextInput
                                label="M-Pesa Number"
                                placeholder="254712345678"
                                description="Enter M-Pesa number in format 254XXXXXXXX (will receive payments here)"
                                value={data.mpesa_number}
                                onChange={(e) => onChange('mpesa_number', e.currentTarget.value)}
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
                                            onChange={(e) => onChange('next_of_kin_name', e.currentTarget.value)}
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
                                            onChange={(e) => onChange('next_of_kin_phone', e.currentTarget.value)}
                                            error={errors.next_of_kin_phone}
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
                                onChange={(e) => onChange('signed_agreement', e.currentTarget.value)}
                                error={errors.signed_agreement}
                                minRows={4}
                                required
                            />

                            {data.signed_agreement && (
                                <Alert color="green" variant="light">
                                    <Text size="sm">
                                        Agreement acknowledged. Ready to submit {isUpdate ? 'updates' : 'application'}.
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
        <div className="space-y-6">
            {/* Progress Stepper */}
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
                    <div>
                        {onCancel && (
                            <Button
                                variant="light"
                                color="gray"
                                onClick={onCancel}
                                disabled={processing}
                            >
                                Cancel
                            </Button>
                        )}
                        {currentStep > 0 && (
                            <Button
                                variant="light"
                                onClick={prevStep}
                                disabled={processing}
                                ml={onCancel ? 'sm' : 0}
                            >
                                Previous
                            </Button>
                        )}
                    </div>

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
                                onClick={onSubmit}
                                loading={processing}
                                disabled={!isStepValid(currentStep) || processing}
                            >
                                {isUpdate ? 'Update Profile' : 'Submit Application'}
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
    );
}