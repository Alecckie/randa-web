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
    const role = user?.role || 'user';

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 dark:from-gray-900 dark:via-gray-900 dark:to-slate-900 flex">
            <Head title="Campaigns" />

            {/* Desktop Sidebar - Fixed with shadow */}
            <div className="hidden lg:block w-64 fixed inset-y-0 left-0 z-30 shadow-xl">
                <Sidebar user={user} activeNav={activeNav} onNavClick={setActiveNav} />
            </div>

            {/* Mobile Drawer */}
            <Drawer
                opened={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                size="280px"
                padding={0}
                withCloseButton={false}
                className="lg:hidden"
            >
                <Sidebar user={user} activeNav={activeNav} onNavClick={setActiveNav} />
            </Drawer>

            {/* Main Content */}
            <div className="flex-1 lg:ml-64 min-h-screen">
                {/* Header - Sticky with backdrop blur */}
                <div className="sticky top-0 z-20 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 shadow-sm">
                    <Header 
                        onMenuClick={() => setSidebarOpen(true)} 
                        user={user}
                        showCreateMenu={true}
                    />
                </div>

                {/* Page Content - Improved spacing and max-width */}
                <div className="p-4 sm:p-6 lg:p-8 w-full max-w-[1600px] mx-auto">
                    {/* Page Header - Enhanced design */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
                        <div className="space-y-1">
                            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                                Campaigns Management
                            </h1>
                            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                                Manage campaign applications and track their status
                            </p>
                        </div>
                        <Button
                            component={Link}
                            href={route('my-campaigns.create')}
                            leftSection={<PlusIcon size={18} />}
                            size="md"
                            className="shrink-0 shadow-md hover:shadow-lg transition-shadow"
                            radius="md"
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