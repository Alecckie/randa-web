import { useState, useEffect, useRef } from 'react';
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
    Badge,
    Loader,
} from '@mantine/core';
import { InfoIcon, MapPinIcon, UploadIcon, UserIcon, CheckCircleIcon, Trash2Icon, XCircleIcon } from 'lucide-react';
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
    documents?: {
        national_id_front_photo?: string | null;
        national_id_back_photo?: string | null;
        passport_photo?: string | null;
        good_conduct_certificate?: string | null;
        motorbike_license?: string | null;
        motorbike_registration?: string | null;
    };
}

interface RiderDetailsFormProps {
    rider: RiderData | null;
    counties: County[];
    isUpdate?: boolean;
}

interface DocumentUploadStatus {
    national_id: boolean;
    national_id_front_photo: boolean;
    national_id_back_photo: boolean;
    passport_photo: boolean;
    good_conduct_certificate: boolean;
    motorbike_license: boolean;
    motorbike_registration: boolean;
}

interface DocumentFieldConfig {
    name: keyof Omit<DocumentUploadStatus, 'national_id'>;
    label: string;
    description: string;
    accept: string;
    maxSize: string;
    maxSizeBytes: number;
}

const DOCUMENT_FIELDS: DocumentFieldConfig[] = [
    {
        name: 'national_id_front_photo',
        label: 'National ID - Front Photo',
        description: 'Front side of National ID',
        accept: 'image/jpeg,image/png,image/jpg',
        maxSize: '5MB',
        maxSizeBytes: 5 * 1024 * 1024,
    },
    {
        name: 'national_id_back_photo',
        label: 'National ID - Back Photo',
        description: 'Back side of National ID',
        accept: 'image/jpeg,image/png,image/jpg',
        maxSize: '5MB',
        maxSizeBytes: 5 * 1024 * 1024,
    },
    {
        name: 'passport_photo',
        label: 'Passport Photo',
        description: 'Passport size photo',
        accept: 'image/jpeg,image/png,image/jpg',
        maxSize: '2MB',
        maxSizeBytes: 2 * 1024 * 1024,
    },
    {
        name: 'good_conduct_certificate',
        label: 'Good Conduct Certificate',
        description: 'Certificate of good conduct',
        accept: 'application/pdf,image/jpeg,image/png,image/jpg',
        maxSize: '10MB',
        maxSizeBytes: 10 * 1024 * 1024,
    },
    {
        name: 'motorbike_license',
        label: 'Motorbike License',
        description: 'Motorbike driving license',
        accept: 'application/pdf,image/jpeg,image/png,image/jpg',
        maxSize: '5MB',
        maxSizeBytes: 5 * 1024 * 1024,
    },
    {
        name: 'motorbike_registration',
        label: 'Motorbike Registration',
        description: 'Motorbike registration document',
        accept: 'application/pdf,image/jpeg,image/png,image/jpg',
        maxSize: '5MB',
        maxSizeBytes: 5 * 1024 * 1024,
    },
];

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

    // Document upload state
    const [nationalId, setNationalId] = useState(rider?.national_id || '');
    const [uploadStatus, setUploadStatus] = useState<DocumentUploadStatus>({
        national_id: !!rider?.national_id,
        national_id_front_photo: !!rider?.documents?.national_id_front_photo,
        national_id_back_photo: !!rider?.documents?.national_id_back_photo,
        passport_photo: !!rider?.documents?.passport_photo,
        good_conduct_certificate: !!rider?.documents?.good_conduct_certificate,
        motorbike_license: !!rider?.documents?.motorbike_license,
        motorbike_registration: !!rider?.documents?.motorbike_registration,
    });
    const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
    const [uploading, setUploading] = useState<Record<string, boolean>>({});
    const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});
    const [savingNationalId, setSavingNationalId] = useState(false);

    // File input refs to clear inputs after upload
    const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

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
                .catch((err) => {
                    console.error('Failed to load subcounties:', err);
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
                .catch((err) => {
                    console.error('Failed to load wards:', err);
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

    // Validate file before upload
    const validateFile = (file: File, fieldConfig: DocumentFieldConfig): string | null => {
        // Check file size
        if (file.size > fieldConfig.maxSizeBytes) {
            return `File size exceeds ${fieldConfig.maxSize}. Please compress or choose a smaller file.`;
        }

        // Check file type
        const acceptedTypes = fieldConfig.accept.split(',');
        const fileType = file.type;
        const isValidType = acceptedTypes.some(type => {
            if (type.includes('*')) {
                const baseType = type.split('/')[0];
                return fileType.startsWith(baseType);
            }
            return fileType === type;
        });

        if (!isValidType) {
            return `Invalid file type. Accepted types: ${fieldConfig.accept}`;
        }

        return null;
    };

    // Save National ID
    const saveNationalId = async () => {
        if (!nationalId || nationalId.length < 5) {
            setUploadErrors({ ...uploadErrors, national_id: 'Please enter a valid National ID' });
            return;
        }

        setSavingNationalId(true);
        setUploadErrors({ ...uploadErrors, national_id: '' });

        console.log('Saving National ID:', nationalId);

        try {
            const response = await axios.post(route('rider.profile.documents'), {
                national_id: nationalId,
            }, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                }
            });

            console.log('National ID save response:', response.data);
            
            setUploadStatus(prev => ({ ...prev, national_id: true }));
            
            // Show success message briefly
            setUploadErrors({ ...uploadErrors, national_id: '' });
        } catch (error: any) {
            console.error('Failed to save National ID:', error);
            const errorMessage = error.response?.data?.message ||
                error.response?.data?.errors?.national_id?.[0] ||
                'Failed to save National ID. Please try again.';
            
            setUploadErrors({
                ...uploadErrors,
                national_id: errorMessage,
            });
        } finally {
            setSavingNationalId(false);
        }
    };

    // Upload single document
    const uploadSingleDocument = async (fieldName: string, file: File) => {
        console.log('Starting upload for:', fieldName, file.name, 'Size:', file.size);

        // Find field config
        const fieldConfig = DOCUMENT_FIELDS.find(f => f.name === fieldName);
        if (!fieldConfig) {
            console.error('Field config not found for:', fieldName);
            return;
        }

        // Validate file
        const validationError = validateFile(file, fieldConfig);
        if (validationError) {
            setUploadErrors(prev => ({ ...prev, [fieldName]: validationError }));
            return;
        }

        setUploading(prev => ({ ...prev, [fieldName]: true }));
        setUploadProgress(prev => ({ ...prev, [fieldName]: 0 }));
        setUploadErrors(prev => ({ ...prev, [fieldName]: '' }));

        const formData = new FormData();
        formData.append('field_name', fieldName);
        formData.append('file', file);

        try {
            const response = await axios.post(route('rider.profile.upload-document'), formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round(
                        (progressEvent.loaded * 100) / (progressEvent.total || 1)
                    );
                    console.log(`Upload progress for ${fieldName}:`, percentCompleted);
                    setUploadProgress(prev => ({ ...prev, [fieldName]: percentCompleted }));
                },
            });

            console.log('Upload response:', response.data);

            // Update status from response
            if (response.data.success) {
                if (response.data.data?.uploaded_documents) {
                    setUploadStatus(response.data.data.uploaded_documents);
                } else {
                    // Fallback: manually update the specific field
                    setUploadStatus(prev => ({
                        ...prev,
                        [fieldName]: true
                    }));
                }

                // Check if all documents are uploaded
                if (response.data.data?.has_all_documents) {
                    setStepsCompleted(prev => ({ ...prev, documents: true }));
                }

                // Clear the file input
                if (fileInputRefs.current[fieldName]) {
                    fileInputRefs.current[fieldName]!.value = '';
                }
            }

            console.log('Upload completed successfully for:', fieldName);
        } catch (error: any) {
            console.error(`Failed to upload ${fieldName}:`, error);
            
            let errorMessage = 'Upload failed. Please try again.';
            
            if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.response?.data?.errors) {
                const errors = error.response.data.errors;
                if (Array.isArray(errors)) {
                    errorMessage = errors[0];
                } else if (typeof errors === 'object') {
                    errorMessage = Object.values(errors)[0] as string;
                }
            } else if (error.message) {
                errorMessage = error.message;
            }

            setUploadErrors(prev => ({
                ...prev,
                [fieldName]: errorMessage,
            }));
            setUploadProgress(prev => ({ ...prev, [fieldName]: 0 }));
        } finally {
            setUploading(prev => ({ ...prev, [fieldName]: false }));
        }
    };

    // Delete document
    const deleteDocument = async (fieldName: string) => {
        if (!confirm('Are you sure you want to delete this document?')) {
            return;
        }

        console.log('Deleting document:', fieldName);

        try {
            const response = await axios.post(route('rider.profile.delete-document'), {
                field_name: fieldName,
            }, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                }
            });

            console.log('Delete response:', response.data);

            if (response.data.success) {
                if (response.data.data?.uploaded_documents) {
                    setUploadStatus(response.data.data.uploaded_documents);
                } else {
                    // Fallback: manually update the specific field
                    setUploadStatus(prev => ({
                        ...prev,
                        [fieldName]: false
                    }));
                }

                // Update documents completion status
                setStepsCompleted(prev => ({ ...prev, documents: false }));
            }

            // Clear any upload errors for this field
            setUploadErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[fieldName];
                return newErrors;
            });
        } catch (error: any) {
            console.error('Delete failed:', error);
            const errorMessage = error.response?.data?.message || 'Failed to delete document';
            setUploadErrors({
                ...uploadErrors,
                [fieldName]: errorMessage,
            });
        }
    };

    // Handle file change with key-based reset
    const [fileInputKeys, setFileInputKeys] = useState<Record<string, number>>({});

    const handleFileChange = (fieldName: string) => (file: File | null) => {
        console.log('handleFileChange called:', { fieldName, file: file?.name });
        if (file) {
            uploadSingleDocument(fieldName, file);
            // Reset the file input by changing its key
            setFileInputKeys(prev => ({
                ...prev,
                [fieldName]: (prev[fieldName] || 0) + 1
            }));
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
                // Check if all documents are uploaded
                return uploadStatus.national_id &&
                    uploadStatus.national_id_front_photo &&
                    uploadStatus.national_id_back_photo &&
                    uploadStatus.passport_photo &&
                    uploadStatus.good_conduct_certificate &&
                    uploadStatus.motorbike_license &&
                    uploadStatus.motorbike_registration;
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
        // Just move to next step - documents are already uploaded individually
        if (isStepValid(1)) {
            setStepsCompleted(prev => ({ ...prev, documents: true }));
            nextStep();
        }
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

    const completedCount = Object.values(uploadStatus).filter(Boolean).length;
    const totalCount = Object.keys(uploadStatus).length;
    const progressPercentage = (completedCount / totalCount) * 100;

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
                                    Upload documents one at a time. Each file will be saved immediately.
                                </Text>
                            </div>

                            <Alert icon={<InfoIcon size={16} />} color="blue" variant="light">
                                <Text size="sm">
                                    <strong>Upload Tips:</strong>
                                    <br />• Upload one document at a time to avoid timeouts
                                    <br />• Each file is saved immediately after upload
                                    <br />• You can return later to upload remaining documents
                                    <br />• Compress large images before uploading
                                </Text>
                            </Alert>

                            {/* Progress */}
                            <div>
                                <Group justify="space-between" mb="xs">
                                    <Text size="sm" fw={500}>Upload Progress</Text>
                                    <Badge color={completedCount === totalCount ? 'green' : 'blue'}>
                                        {completedCount} / {totalCount}
                                    </Badge>
                                </Group>
                                <Progress value={progressPercentage} size="md" radius="xl" />
                            </div>

                            {/* National ID Number */}
                            <Card withBorder>
                                <Group justify="space-between" align="flex-start">
                                    <div style={{ flex: 1 }}>
                                        <TextInput
                                            label="National ID Number"
                                            placeholder="Enter national ID number"
                                            description="Enter your valid Kenyan National ID number"
                                            value={nationalId}
                                            onChange={(e) => setNationalId(e.currentTarget.value)}
                                            error={uploadErrors.national_id}
                                            disabled={uploadStatus.national_id}
                                            required
                                        />
                                    </div>
                                    <div>
                                        {uploadStatus.national_id ? (
                                            <CheckCircleIcon size={20} className="text-green-500 mt-8" />
                                        ) : (
                                            <Button
                                                onClick={saveNationalId}
                                                loading={savingNationalId}
                                                size="sm"
                                                className="mt-6"
                                            >
                                                Save
                                            </Button>
                                        )}
                                    </div>
                                </Group>
                            </Card>

                            {/* Document Upload Fields */}
                            <Grid>
                                {DOCUMENT_FIELDS.map((field) => (
                                    <Grid.Col key={field.name} span={{ base: 12, md: 6 }}>
                                        <Card withBorder>
                                            <Stack gap="sm">
                                                <Group justify="space-between">
                                                    <Text size="sm" fw={500}>{field.label}</Text>
                                                    {uploadStatus[field.name] ? (
                                                        <Badge color="green" size="sm">
                                                            <CheckCircleIcon size={12} className="inline mr-1" />
                                                            Uploaded
                                                        </Badge>
                                                    ) : (
                                                        <Badge color="gray" size="sm">Pending</Badge>
                                                    )}
                                                </Group>

                                                <Text size="xs" c="dimmed">{field.description}</Text>
                                                <Text size="xs" c="dimmed">Max size: {field.maxSize}</Text>

                                                {uploading[field.name] && (
                                                    <div>
                                                        <Group gap="xs" mb="xs">
                                                            <Loader size="xs" />
                                                            <Text size="xs">Uploading... {uploadProgress[field.name]}%</Text>
                                                        </Group>
                                                        <Progress value={uploadProgress[field.name]} size="sm" />
                                                    </div>
                                                )}

                                                {uploadErrors[field.name] && (
                                                    <Alert color="red" variant="light" p="xs">
                                                        <Text size="xs">{uploadErrors[field.name]}</Text>
                                                    </Alert>
                                                )}

                                                {!uploading[field.name] && (
                                                    <>
                                                        {uploadStatus[field.name] ? (
                                                            <Group>
                                                                <Button
                                                                    variant="light"
                                                                    color="red"
                                                                    size="sm"
                                                                    leftSection={<Trash2Icon size={14} />}
                                                                    onClick={() => deleteDocument(field.name)}
                                                                >
                                                                    Replace
                                                                </Button>
                                                            </Group>
                                                        ) : (
                                                            <FileInput
                                                                key={fileInputKeys[field.name] || 0}
                                                                placeholder="Choose file"
                                                                accept={field.accept}
                                                                leftSection={<UploadIcon size={14} />}
                                                                onChange={handleFileChange(field.name)}
                                                                size="sm"
                                                            />
                                                        )}
                                                    </>
                                                )}
                                            </Stack>
                                        </Card>
                                    </Grid.Col>
                                ))}
                            </Grid>

                            {/* Completion Status */}
                            {completedCount === totalCount && (
                                <Alert color="green" variant="light">
                                    <Group gap="xs">
                                        <CheckCircleIcon size={16} />
                                        <Text size="sm" fw={500}>
                                            All documents uploaded successfully! You can now proceed to the next step.
                                        </Text>
                                    </Group>
                                </Alert>
                            )}
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
                                disabled={currentStep === 1 ? false : currentForm.processing}
                            >
                                Previous
                            </Button>
                        )}
                    </div>

                    <div>
                        <Button
                            onClick={handleCurrentStepSubmit}
                            loading={currentStep === 1 ? false : currentForm.processing}
                            disabled={!isStepValid(currentStep) || (currentStep !== 1 && currentForm.processing)}
                        >
                            {currentStep === steps.length - 1 ? 'Complete Profile' : 'Save & Continue'}
                        </Button>
                    </div>
                </Group>
            </Card>

            {/* Upload Progress (for location, contact, agreement forms) */}
            {currentStep !== 1 && currentForm.progress && (
                <Card>
                    <div>
                        <Text size="sm" mb="xs">Uploading...</Text>
                        <Progress value={currentForm.progress.percentage ?? 0} size="sm" />
                    </div>
                </Card>
            )}

            {/* Error Summary (for location, contact, agreement forms) */}
            {currentStep !== 1 && Object.keys(currentForm.errors).length > 0 && (
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