import React, { useState } from 'react';
import { Head, usePage, Link } from '@inertiajs/react';
import { Drawer, Button } from '@mantine/core';
import { PlusIcon } from 'lucide-react';
import Sidebar from '@/Components/frontend/layouts/Sidebar';
import Header from '@/Components/frontend/layouts/Header';
import CampaignList from '@/Components/campaigns/CampaignList';
import type { PageProps } from '@/types';
import type { CampaignsIndexProps } from '@/types/campaign';

export default function Index({ 
    campaigns, 
    stats, 
    filters, 
    advertisers 
}: CampaignsIndexProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeNav, setActiveNav] = useState('campaigns');
    const { auth } = usePage<PageProps>().props;
    
    const user = auth?.user;
    const role = user?.role;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-gray-900 flex">
            <Head title="Campaigns" />

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
                    advertiser={user}
                    showCreateMenu={true}
                />

                {/* Page Content */}
                <div className="p-4 sm:p-6 lg:p-8 w-full">
                    {/* Page Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div>
                            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                                Campaigns Management
                            </h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                Manage campaign applications and track their status
                            </p>
                        </div>
                        <Button
                            component={Link}
                            href={route('my-campaigns.create')}
                            leftSection={<PlusIcon size={16} />}
                            size="md"
                            className="shrink-0"
                        >
                            New Campaign
                        </Button>
                    </div>

                    {/* Campaign List Component */}
                    <CampaignList
                        campaigns={campaigns}
                        stats={stats}
                        filters={filters}
                        advertisers={advertisers}
                        userRole={role}
                    />
                </div>
            </div>
        </div>
    );
}