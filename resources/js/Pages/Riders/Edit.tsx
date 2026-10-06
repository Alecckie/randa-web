import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link } from '@inertiajs/react';
import {
    Button,
    TextInput,
    FileInput,
    NumberInput,
    Card,
    Group,
    Text,
    Stack,
    Grid,
    Alert,
    Anchor,
} from '@mantine/core';
import { ArrowLeftIcon, UploadIcon, FileTextIcon } from 'lucide-react';

interface RiderEditProps {
    rider: {
        id: number;
        rider_number?: string;
        national_id: string;
        mpesa_number: string;
        next_of_kin_name: string;
        next_of_kin_phone: string;
        daily_rate: string | number;
        user: {
            first_name: string;
            last_name: string;
            email: string;
            phone: string;
        };
        documents: {
            national_id_front_photo: string | null;
            national_id_back_photo: string | null;
            passport_photo: string | null;
            good_conduct_certificate: string | null;
            motorbike_license: string | null;
            motorbike_registration: string | null;
        };
    };
}

interface RiderEditFormData {
    _method: 'put';
    firstname: string;
    lastname: string;
    email: string;
    phone: string;
    national_id: string;
    mpesa_number: string;
    next_of_kin_name: string;
    next_of_kin_phone: string;
    daily_rate: number;
    national_id_front_photo: File | null;
    national_id_back_photo: File | null;
    passport_photo: File | null;
    good_conduct_certificate: File | null;
    motorbike_license: File | null;
    motorbike_registration: File | null;
    [key: string]: any;
}

function DocumentField({
    label,
    accept,
    description,
    currentUrl,
    onChange,
    error,
}: {
    label: string;
    accept: string;
    description: string;
    currentUrl: string | null;
    onChange: (file: File | null) => void;
    error?: string;
}) {
    return (
        <Grid.Col span={{ base: 12, md: 6 }}>
            <FileInput
                label={label}
                placeholder="Choose a new file to replace it"
                description={description}
                accept={accept}
                leftSection={<UploadIcon size={14} />}
                onChange={onChange}
                error={error}
            />
            {currentUrl && (
                <Anchor href={currentUrl} target="_blank" size="xs" mt={4} className="inline-flex items-center gap-1">
                    <FileTextIcon size={12} /> View current file
                </Anchor>
            )}
        </Grid.Col>
    );
}

export default function RiderEdit({ rider }: RiderEditProps) {
    const { data, setData, post, processing, errors } = useForm<RiderEditFormData>({
        _method: 'put',
        firstname: rider.user.first_name ?? '',
        lastname: rider.user.last_name ?? '',
        email: rider.user.email ?? '',
        phone: rider.user.phone ?? '',
        national_id: rider.national_id ?? '',
        mpesa_number: rider.mpesa_number ?? '',
        next_of_kin_name: rider.next_of_kin_name ?? '',
        next_of_kin_phone: rider.next_of_kin_phone ?? '',
        daily_rate: Number(rider.daily_rate) || 0,
        national_id_front_photo: null,
        national_id_back_photo: null,
        passport_photo: null,
        good_conduct_certificate: null,
        motorbike_license: null,
        motorbike_registration: null,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('riders.update', rider.id), {
            forceFormData: true,
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center space-x-4">
                    <Button
                        variant="subtle"
                        leftSection={<ArrowLeftIcon size={16} />}
                        component={Link}
                        href={route('riders.show', rider.id)}
                    >
                        Back to Rider
                    </Button>
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                            Edit Rider
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {rider.rider_number && <span className="font-semibold">{rider.rider_number}</span>}
                        </p>
                    </div>
                </div>
            }
        >
            <Head title="Edit Rider" />

            <form onSubmit={handleSubmit} className="w-full max-w-4xl mx-auto space-y-6">
                <Card>
                    <Stack>
                        <Text size="lg" fw={600}>Personal Information</Text>

                        <Grid>
                            <Grid.Col span={{ base: 12, md: 6 }}>
                                <TextInput
                                    label="First Name"
                                    value={data.firstname}
                                    onChange={(e) => setData('firstname', e.currentTarget.value)}
                                    error={errors.firstname}
                                    required
                                />
                            </Grid.Col>
                            <Grid.Col span={{ base: 12, md: 6 }}>
                                <TextInput
                                    label="Last Name"
                                    value={data.lastname}
                                    onChange={(e) => setData('lastname', e.currentTarget.value)}
                                    error={errors.lastname}
                                    required
                                />
                            </Grid.Col>
                            <Grid.Col span={{ base: 12, md: 6 }}>
                                <TextInput
                                    label="Email Address"
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
                                    description="Format: 254XXXXXXXXX"
                                    value={data.phone}
                                    onChange={(e) => setData('phone', e.currentTarget.value)}
                                    error={errors.phone}
                                    required
                                />
                            </Grid.Col>
                            <Grid.Col span={12}>
                                <TextInput
                                    label="National ID Number"
                                    value={data.national_id}
                                    onChange={(e) => setData('national_id', e.currentTarget.value)}
                                    error={errors.national_id}
                                    required
                                />
                            </Grid.Col>
                        </Grid>
                    </Stack>
                </Card>

                <Card>
                    <Stack>
                        <Text size="lg" fw={600}>Contact & Payment</Text>

                        <Grid>
                            <Grid.Col span={{ base: 12, md: 6 }}>
                                <TextInput
                                    label="M-Pesa Number"
                                    description="Format: 254XXXXXXXXX — receives payouts"
                                    value={data.mpesa_number}
                                    onChange={(e) => setData('mpesa_number', e.currentTarget.value)}
                                    error={errors.mpesa_number}
                                    required
                                />
                            </Grid.Col>
                            <Grid.Col span={{ base: 12, md: 6 }}>
                                <NumberInput
                                    label="Daily Rate (KSh)"
                                    value={data.daily_rate}
                                    onChange={(value) => setData('daily_rate', Number(value) || 0)}
                                    error={errors.daily_rate}
                                    min={0}
                                    max={10000}
                                    decimalScale={2}
                                />
                            </Grid.Col>
                            <Grid.Col span={{ base: 12, md: 6 }}>
                                <TextInput
                                    label="Next of Kin Name"
                                    value={data.next_of_kin_name}
                                    onChange={(e) => setData('next_of_kin_name', e.currentTarget.value)}
                                    error={errors.next_of_kin_name}
                                    required
                                />
                            </Grid.Col>
                            <Grid.Col span={{ base: 12, md: 6 }}>
                                <TextInput
                                    label="Next of Kin Phone"
                                    description="Format: 254XXXXXXXXX"
                                    value={data.next_of_kin_phone}
                                    onChange={(e) => setData('next_of_kin_phone', e.currentTarget.value)}
                                    error={errors.next_of_kin_phone}
                                    required
                                />
                            </Grid.Col>
                        </Grid>
                    </Stack>
                </Card>

                <Card>
                    <Stack>
                        <div>
                            <Text size="lg" fw={600}>Documents</Text>
                            <Text size="sm" c="dimmed">
                                Only choose a file for the documents you want to replace — the rest stay unchanged.
                            </Text>
                        </div>

                        <Grid>
                            <DocumentField
                                label="National ID - Front Photo"
                                accept="image/jpeg,image/png,image/jpg"
                                description="Max 5MB (JPEG, PNG, JPG)"
                                currentUrl={rider.documents.national_id_front_photo}
                                onChange={(file) => setData('national_id_front_photo', file)}
                                error={errors.national_id_front_photo}
                            />
                            <DocumentField
                                label="National ID - Back Photo"
                                accept="image/jpeg,image/png,image/jpg"
                                description="Max 5MB (JPEG, PNG, JPG)"
                                currentUrl={rider.documents.national_id_back_photo}
                                onChange={(file) => setData('national_id_back_photo', file)}
                                error={errors.national_id_back_photo}
                            />
                            <DocumentField
                                label="Passport Photo"
                                accept="image/jpeg,image/png,image/jpg"
                                description="Max 2MB (JPEG, PNG, JPG)"
                                currentUrl={rider.documents.passport_photo}
                                onChange={(file) => setData('passport_photo', file)}
                                error={errors.passport_photo}
                            />
                            <DocumentField
                                label="Good Conduct Certificate"
                                accept="application/pdf,image/jpeg,image/png,image/jpg"
                                description="Max 10MB (PDF, JPEG, PNG, JPG)"
                                currentUrl={rider.documents.good_conduct_certificate}
                                onChange={(file) => setData('good_conduct_certificate', file)}
                                error={errors.good_conduct_certificate}
                            />
                            <DocumentField
                                label="Motorbike License"
                                accept="application/pdf,image/jpeg,image/png,image/jpg"
                                description="Max 5MB (PDF, JPEG, PNG, JPG)"
                                currentUrl={rider.documents.motorbike_license}
                                onChange={(file) => setData('motorbike_license', file)}
                                error={errors.motorbike_license}
                            />
                            <DocumentField
                                label="Motorbike Registration"
                                accept="application/pdf,image/jpeg,image/png,image/jpg"
                                description="Max 5MB (PDF, JPEG, PNG, JPG)"
                                currentUrl={rider.documents.motorbike_registration}
                                onChange={(file) => setData('motorbike_registration', file)}
                                error={errors.motorbike_registration}
                            />
                        </Grid>
                    </Stack>
                </Card>

                {Object.keys(errors).length > 0 && (
                    <Alert color="red" variant="light">
                        <Text size="sm" fw={500} mb="xs">Please fix the following errors:</Text>
                        <ul className="list-disc list-inside text-sm space-y-1">
                            {Object.entries(errors).map(([field, error]) => (
                                <li key={field}>{error as string}</li>
                            ))}
                        </ul>
                    </Alert>
                )}

                <Card>
                    <Group justify="flex-end">
                        <Button variant="light" component={Link} href={route('riders.show', rider.id)}>
                            Cancel
                        </Button>
                        <Button type="submit" loading={processing}>
                            Save Changes
                        </Button>
                    </Group>
                </Card>
            </form>
        </AuthenticatedLayout>
    );
}
