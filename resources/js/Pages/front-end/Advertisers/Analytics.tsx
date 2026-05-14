import { useState } from 'react';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import AdvertiserLayout from '@/Layouts/AdvertiserLayout';
import CampaignAnalyticsPanel, { type CampaignAnalyticsData } from '@/Components/analytics/CampaignAnalyticsPanel';
import { BarChart3 } from 'lucide-react';

interface Campaign {
    id: number;
    name: string;
    status: string;
    start_date: string | null;
    end_date: string | null;
    helmet_count: number;
}

interface Props {
    campaigns: Campaign[];
}

export default function AdvertiserAnalytics({ campaigns }: Props) {
    const [selectedId, setSelectedId]     = useState<number | null>(null);
    const [analytics, setAnalytics]       = useState<CampaignAnalyticsData | null>(null);
    const [loading, setLoading]           = useState(false);
    const [error, setError]               = useState<string | null>(null);

    const handleSelect = async (id: number | null) => {
        setSelectedId(id);
        setAnalytics(null);
        setError(null);

        if (!id) return;

        setLoading(true);
        try {
            const { data } = await axios.get(`/advertiser/analytics/${id}`);
            setAnalytics(data.data);
        } catch {
            setError('Failed to load analytics. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AdvertiserLayout title="Analytics" activeNav="analytics">
            <Head title="Campaign Analytics" />

            <div className="space-y-6">
                {/* Page title */}
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Campaign Analytics</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Select a campaign to view detailed performance metrics.
                    </p>
                </div>

                {/* Campaign selector */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Campaign <span className="text-red-500">*</span>
                    </label>
                    {campaigns.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            No active or completed campaigns found.
                        </p>
                    ) : (
                        <select
                            value={selectedId ?? ''}
                            onChange={(e) => handleSelect(e.target.value ? Number(e.target.value) : null)}
                            className="w-full sm:w-96 text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#f79122] focus:border-transparent"
                        >
                            <option value="">— Select a campaign —</option>
                            {campaigns.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name} ({c.status})
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                {/* Loading */}
                {loading && (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin w-8 h-8 border-4 border-[#f79122] border-t-transparent rounded-full" />
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-sm text-red-600 dark:text-red-400">
                        {error}
                    </div>
                )}

                {/* Analytics panel */}
                {analytics && !loading && <CampaignAnalyticsPanel data={analytics} />}

                {/* Empty prompt */}
                {!selectedId && !loading && (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <BarChart3 size={48} className="text-gray-200 dark:text-gray-700 mb-4" />
                        <p className="text-gray-400 dark:text-gray-500 font-medium">Select a campaign above to view analytics</p>
                    </div>
                )}
            </div>
        </AdvertiserLayout>
    );
}
