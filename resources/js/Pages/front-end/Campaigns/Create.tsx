import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import { Button, Container, Drawer, rem } from '@mantine/core';
import { ArrowLeft } from 'lucide-react';
import Sidebar from '@/Components/frontend/layouts/Sidebar';
import Header from '@/Components/frontend/layouts/Header';
import CampaignForm from '@/Components/campaigns/CampaignForm';
import type { PageProps, User } from '@/types';
import {usePage} from '@inertiajs/react';
import { Advertiser } from '@/types/advertiser';


// interface Advertiser {
//     id: number;
//     company_name?: string;
//     business_registration?: string;
//     address?: string;
//     status?: string;
// }

interface CoverageArea {
    id: number;
    name: string;
    area_code?: string;
    county?: string;
    sub_county?: string;
    ward?: string;
}

// interface AdvertiserData {
//     id: number;
//     company_name: string;
// }

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
        <div className="min-h-screen bg-slate-50 dark:bg-gray-900 flex">
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
                <div className="p-4 sm:p-6 lg:p-8">
                    <Container size="xl">
                        {/* Page Header */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 mb-6">
                            <Button
                                variant="subtle"
                                leftSection={<ArrowLeft size={16} />}
                                component={Link}
                                href={route('campaigns.index')}
                                size="md"
                                style={{ borderRadius: rem(8) }}
                            >
                                Back to Campaigns
                            </Button>
                            <div className="flex-1">
                                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                                    Create New Campaign
                                </h2>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    Set up your helmet advertising campaign
                                </p>
                            </div>
                        </div>

                        {/* Campaign Form Component */}
                        <CampaignForm
                            advertiser={advertiser}
                            advertisers={advertisers} 
                            coverageareas={coverageareas} 
                        />
                    </Container>
                </div>
            </div>
        </div>
    );
}