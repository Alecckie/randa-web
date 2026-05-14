import { Link } from '@inertiajs/react';
import { Button, rem } from '@mantine/core';
import { ArrowLeft } from 'lucide-react';
import CampaignForm from '@/Components/campaigns/CampaignForm';
import { Advertiser } from '@/types/advertiser';
import AdvertiserLayout from '@/Layouts/AdvertiserLayout';

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
    return (
        <AdvertiserLayout title="Create Campaign" activeNav="campaigns">
            <div className="pb-12 space-y-6">
                <div>
                    <Button
                        variant="subtle"
                        leftSection={<ArrowLeft size={18} />}
                        component={Link}
                        href={route('campaigns.index')}
                        size="sm"
                        style={{ borderRadius: rem(10) }}
                    >
                        Back
                    </Button>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                        Create New Campaign
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Set up your helmet advertising campaign in just a few steps
                    </p>
                </div>

                <CampaignForm
                    advertiser={advertiser}
                    advertisers={advertisers}
                    coverageareas={coverageareas}
                />
            </div>
        </AdvertiserLayout>
    );
}