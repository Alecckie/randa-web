import React, { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import {
    Alert,
    Drawer,
    Title,
    Text,
    Card,
} from '@mantine/core';
import {
    AlertCircle,
    Check,
} from 'lucide-react';
import RiderDetailsForm from '@/Components/riders/RiderDetailsForm';
import RiderSidebar from '@/Components/frontend/layouts/RiderSidebar';
import RiderHeader from '@/Components/frontend/layouts/RiderHeader';

// Types
interface County {
    id: number;
    name: string;
}

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

interface RiderData {
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
}

interface PageProps {
    user: {
        id: number;
        name: string;
        email: string;
        phone?: string;
        role: string;
    };
    rider?: {
        id?: number;
        national_id?: string;
        mpesa_number?: string;
        next_of_kin_name?: string;
        next_of_kin_phone?: string;
        status?: string;
        daily_rate?: number;
    };
    counties: County[];
}

export default function RiderProfile({ user, rider, counties }: PageProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const hasProfile = !!rider?.id;
    const isPending = rider?.status === 'pending';
    const isApproved = rider?.status === 'approved';

    const { data, setData, post, processing, errors, progress } = useForm<RiderData>({
        national_id: rider?.national_id || '',
        national_id_front_photo: null,
        national_id_back_photo: null,
        passport_photo: null,
        good_conduct_certificate: null,
        motorbike_license: null,
        motorbike_registration: null,
        mpesa_number: rider?.mpesa_number || '',
        next_of_kin_name: rider?.next_of_kin_name || '',
        next_of_kin_phone: rider?.next_of_kin_phone || '',
        signed_agreement: '',
        daily_rate: rider?.daily_rate || 70,
        location: {
            county_id: '',
            sub_county_id: '',
            ward_id: '',
            stage_name: '',
            latitude: '',
            longitude: '',
            effective_from: null,
            notes: '',
        },
    });

    const handleChange = (field: string, value: any) => {
        setData(field as any, value);
    };

    const handleLocationChange = (field: keyof LocationData, value: any) => {
        setData('location', { ...data.location, [field]: value });
    };

    const handleSubmit = () => {
        const formData = new FormData();

        Object.keys(data).forEach((key) => {
            if (key === 'location') {
                Object.keys(data.location).forEach((locKey) => {
                    const value = data.location[locKey as keyof LocationData];
                    if (value !== null && value !== '') {
                        formData.append(`location[${locKey}]`, value.toString());
                    }
                });
            } else if (data[key as keyof RiderData] instanceof File) {
                formData.append(key, data[key as keyof RiderData] as File);
            } else if (data[key as keyof RiderData] !== null && data[key as keyof RiderData] !== '') {
                formData.append(key, data[key as keyof RiderData] as string);
            }
        });

        post(route('rider.profile.store'), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                // Handle success
            },
        });
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-gray-900 flex">
            <Head title="Rider Profile" />

            {/* Desktop Sidebar */}
            <div className="hidden lg:block w-64 fixed inset-y-0 left-0 z-30">
                <RiderSidebar user={user} activeNav="profile" />
            </div>

            {/* Mobile Drawer */}
            <Drawer
                opened={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                size="280px"
                padding={0}
                withCloseButton={false}
            >
                <RiderSidebar user={user} activeNav="profile" />
            </Drawer>

            {/* Main Content */}
            <div className="flex-1 lg:ml-64">
                <RiderHeader onMenuClick={() => setSidebarOpen(true)} rider={rider} />

                <div className="p-4 sm:p-6 lg:p-8">
                    <div className="max-w-9xl mx-auto space-y-6">
                        {/* Page Title */}
                        <div>
                            <Title order={2} size="h2" className="text-gray-900 dark:text-white">
                                {hasProfile ? 'Profile Settings' : 'Complete Your Profile'}
                            </Title>
                            <Text size="sm" c="dimmed" mt="xs">
                                {hasProfile 
                                    ? 'Update your profile information and documents'
                                    : 'Please complete your profile to start working as a rider'
                                }
                            </Text>
                        </div>

                        {/* Status Messages */}
                        {!hasProfile && (
                            <Alert color="purple" variant="light" icon={<AlertCircle size={16} />}>
                                <Text size="sm">
                                    <strong>Profile Setup Required:</strong> Complete all steps to submit your rider application. Your profile will be reviewed by the admin team.
                                </Text>
                            </Alert>
                        )}

                        {isPending && (
                            <Alert color="yellow" variant="light" icon={<AlertCircle size={16} />}>
                                <Text size="sm">
                                    <strong>Application Under Review:</strong> Your rider profile is being reviewed. You'll be notified once it's approved.
                                </Text>
                            </Alert>
                        )}

                        {isApproved && (
                            <Alert color="green" variant="light" icon={<Check size={16} />}>
                                <Text size="sm">
                                    <strong>Profile Approved:</strong> Your rider profile is approved. You can now access all features and start working.
                                </Text>
                            </Alert>
                        )}

                        {/* Rider Details Form */}
                        <Card>
                            <RiderDetailsForm
                                data={data}
                                errors={errors}
                                counties={counties}
                                processing={processing}
                                progress={progress}
                                isUpdate={hasProfile}
                                onChange={handleChange}
                                onLocationChange={handleLocationChange}
                                onSubmit={handleSubmit}
                            />
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}