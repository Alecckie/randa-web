import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import { Button, Container, Drawer, rem } from '@mantine/core';
import { ArrowLeft } from 'lucide-react';
import Sidebar from '@/Components/frontend/layouts/Sidebar';
import Header from '@/Components/frontend/layouts/Header';
import CampaignForm from '@/Components/campaigns/CampaignForm';
import type { PageProps, User } from '@/types';
import { usePage } from '@inertiajs/react';
import { Advertiser } from '@/types/advertiser';

interface CoverageArea {
    id: number;
    name: string;
    area_code?: string;
    county?: string;
    sub_county?: string;
    ward?: string;
}

interface CreateCampaignProps {
    advertiser: Advertiser;
    advertisers: Advertiser[];
    coverageareas: CoverageArea[];
}

export default function CreateCampaign({ 
    advertiser, 
    advertisers, 
    coverageareas 
}: CreateCampaignProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeNav, setActiveNav] = useState('campaigns');
    const { auth } = usePage<PageProps>().props;
    const user = auth?.user;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex">
            <Head title="Create Campaign" />

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
                    user={advertiser}
                    showCreateMenu={false}
                />

                {/* Page Content */}
                <div className="p-4 sm:p-6 lg:p-8 pb-12">
                    {/* Page Header with improved styling */}
                    <div className="mb-8">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-2">
                            <Button
                                variant="subtle"
                                leftSection={<ArrowLeft size={18} />}
                                component={Link}
                                href={route('campaigns.index')}
                                size="md"
                                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
                                style={{ borderRadius: rem(10) }}
                            >
                                Back
                            </Button>
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                Create New Campaign
                            </h1>
                            <p className="text-base text-gray-600 dark:text-gray-400">
                                Set up your helmet advertising campaign in just a few steps
                            </p>
                        </div>
                    </div>

                    <div className="w-full">
                        <CampaignForm
                            advertiser={advertiser}
                            advertisers={advertisers} 
                            coverageareas={coverageareas} 
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}