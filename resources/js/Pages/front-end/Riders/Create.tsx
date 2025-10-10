import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import { Button, Container, Drawer, rem, Alert } from '@mantine/core';
import { ArrowLeft, InfoIcon } from 'lucide-react';
import Sidebar from '@/Components/frontend/layouts/Sidebar';
import Header from '@/Components/frontend/layouts/Header';
import RiderDetailsForm from '@/Components/riders/RiderDetailsForm';
import { usePage, useForm } from '@inertiajs/react';
import type { PageProps } from '@/types';

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

interface ExtendedRiderFormData {
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

interface County {
    id: number;
    name: string;
}

interface Rider {
    id: number;
    firstname: string;
    lastname: string;
    email: string;
    phone: string;
    national_id?: string;
    mpesa_number?: string;
    next_of_kin_name?: string;
    next_of_kin_phone?: string;
    daily_rate: number;
    profile_completed: boolean;
}

interface Advertiser {
    id?: number;
    company_name?: string;
    business_registration?: string;
    address?: string;
    status?: string;
}

interface RiderCompleteProfileProps {
    rider: Rider;
    counties: County[];
}

export default function Create({ 
    rider, 
    counties, 
}: RiderCompleteProfileProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeNav, setActiveNav] = useState('profile');
    const { auth } = usePage<PageProps>().props;
    const user = auth?.user;

    const { data, setData, post, processing, errors, progress } = useForm<ExtendedRiderFormData>({
        national_id: rider.national_id || '',
        national_id_front_photo: null,
        national_id_back_photo: null,
        passport_photo: null,
        good_conduct_certificate: null,
        motorbike_license: null,
        motorbike_registration: null,
        mpesa_number: rider.mpesa_number || '',
        next_of_kin_name: rider.next_of_kin_name || '',
        next_of_kin_phone: rider.next_of_kin_phone || '',
        signed_agreement: '',
        daily_rate: rider.daily_rate || 70,
        location: {
            county_id: '',
            sub_county_id: '',
            ward_id: '',
            stage_name: '',
            latitude: '',
            longitude: '',
            effective_from: new Date(),
            notes: ''
        }
    });

    const handleChange = (field: string, value: any) => {
        setData(field as keyof ExtendedRiderFormData, value);
    };

    const handleLocationChange = (field: keyof LocationData, value: any) => {
        setData('location', {
            ...data.location,
            [field]: value,
        });
    };

    const handleSubmit = () => {
        post(route('riders.complete-profile'), {
            onSuccess: () => {
                // Redirect handled by backend
            }
        });
    };

    const handleCancel = () => {
        window.location.href = route('riders.dashboard');
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-gray-900 flex">
            <Head title="Complete Your Profile" />

            {/* Desktop Sidebar */}
            <div className="hidden lg:block w-64 fixed inset-y-0 left-0 z-30">
                <Sidebar user={user} activeNav={activeNav} onNavClick={setActiveNav} />
            </div>

            {/* Mobile Drawer */}
            <Drawer
                opened={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                size="280px"
                padding={0}
                withCloseButton={false}
            >
                <Sidebar user={user} activeNav={activeNav} onNavClick={setActiveNav} />
            </Drawer>

            {/* Main Content */}
            <div className="flex-1 lg:ml-64">
                {/* Header */}
                <Header 
                    onMenuClick={() => setSidebarOpen(true)} 
                    advertiser={rider}
                    showCreateMenu={false}
                />

                {/* Page Content */}
                <div className="p-4 sm:p-6 lg:p-8">
                    <Container size="xl">
                        {/* Page Header */}
                        <div className="mb-6">
                            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                                Complete Your Rider Profile
                            </h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                Welcome {rider.firstname}! Please complete your profile to start receiving assignments.
                            </p>
                        </div>

                        {/* Info Alert */}
                        <Alert icon={<InfoIcon size={16} />} color="blue" variant="light" className="mb-6">
                            <strong>Why complete your profile?</strong>
                            <br />
                            Completing your profile with all required documents and information allows you to:
                            <ul className="list-disc list-inside mt-2 text-sm">
                                <li>Receive helmet assignments and start earning</li>
                                <li>Get verified and approved by administrators</li>
                                <li>Access payment options and track earnings</li>
                                <li>Participate in campaigns in your area</li>
                            </ul>
                        </Alert>

                        {/* Profile Completion Form */}
                        <RiderDetailsForm
                            data={data}
                            errors={errors}
                            counties={counties}
                            processing={processing}
                            progress={progress}
                            isUpdate={true}
                            onChange={handleChange}
                            onLocationChange={handleLocationChange}
                            onSubmit={handleSubmit}
                            onCancel={handleCancel}
                        />
                    </Container>
                </div>
            </div>
        </div>
    );
}