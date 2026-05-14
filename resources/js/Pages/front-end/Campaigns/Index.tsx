import { usePage, Link } from '@inertiajs/react';
import { Button } from '@mantine/core';
import { PlusIcon } from 'lucide-react';
import CampaignList from '@/Components/campaigns/CampaignList';
import type { PageProps } from '@/types';
import type { CampaignsIndexProps } from '@/types/campaign';
import AdvertiserLayout from '@/Layouts/AdvertiserLayout';

export default function Index({
    campaigns,
    stats,
    filters,
    advertisers
}: CampaignsIndexProps) {
    const { auth } = usePage<PageProps>().props;
    const user = auth?.user;
    const role = user?.role || 'user';

    return (
        <AdvertiserLayout title="Campaigns" activeNav="campaigns">
            <div className="w-full max-w-[1600px] mx-auto space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            Campaigns Management
                        </h1>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Manage campaign applications and track their status
                        </p>
                    </div>
                    <Button
                        component={Link}
                        href={route('my-campaigns.create')}
                        leftSection={<PlusIcon size={18} />}
                        size="md"
                        radius="md"
                    >
                        New Campaign
                    </Button>
                </div>

                <CampaignList
                    campaigns={campaigns}
                    stats={stats}
                    filters={filters}
                    advertisers={advertisers}
                    userRole={role}
                />
            </div>
        </AdvertiserLayout>
    );
}