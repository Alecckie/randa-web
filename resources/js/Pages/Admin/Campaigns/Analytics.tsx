import { useState } from 'react';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import CampaignAnalyticsPanel, { type CampaignAnalyticsData } from '@/Components/analytics/CampaignAnalyticsPanel';
import { Badge } from '@mantine/core';
import { BarChart3 } from 'lucide-react';

interface Campaign {
    id: number;
    name: string;
    advertiser: string;
    status: string;
    start_date: string | null;
    end_date: string | null;
    helmet_count: number;
}

interface Props {
    campaigns: Campaign[];
}

function statusColor(s: string) {
    const map: Record<string, string> = {
        active: 'green', paused: 'yellow', completed: 'gray',
        draft: 'blue', submitted: 'orange',
    };
    return map[s] ?? 'gray';
}

export default function AdminCampaignAnalytics({ campaigns }: Props) {
    const [selectedId, setSelectedId]   = useState<number | null>(null);
    const [analytics, setAnalytics]     = useState<CampaignAnalyticsData | null>(null);
    const [loading, setLoading]         = useState(false);
    const [error, setError]             = useState<string | null>(null);

    const selectedCampaign = campaigns.find((c) => c.id === selectedId);

    const handleSelect = async (id: number | null) => {
        setSelectedId(id);
        setAnalytics(null);
        setError(null);

        if (!id) return;

        setLoading(true);
        try {
            const { data } = await axios.get(`/admin/campaigns/${id}/analytics`);
            setAnalytics(data.data);
        } catch {
            setError('Failed to load analytics. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthenticatedLayout header="Campaign Analytics">
            <Head title="Campaign Analytics" />

            <div className="space-y-6">
                {/* Campaign selector card */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Select Campaign</h2>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Campaign
                            </label>
                            <select
                                value={selectedId ?? ''}
                                onChange={(e) => handleSelect(e.target.value ? Number(e.target.value) : null)}
                                className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#f79122] focus:border-transparent"
                            >
                                <option value="">— Select a campaign —</option>
                                {campaigns.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name} — {c.advertiser}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {selectedCampaign && (
                            <div className="flex items-end gap-3 flex-wrap">
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                    <span className="font-medium text-gray-700 dark:text-gray-300">Advertiser: </span>
                                    {selectedCampaign.advertiser}
                                </div>
                                <Badge color={statusColor(selectedCampaign.status)} variant="light" tt="capitalize">
                                    {selectedCampaign.status.replace('_', ' ')}
                                </Badge>
                            </div>
                        )}
                    </div>
                </div>

                {/* Campaign quick-select chips */}
                {campaigns.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {campaigns.filter(c => c.status === 'active').map((c) => (
                            <button
                                key={c.id}
                                onClick={() => handleSelect(c.id)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                                    selectedId === c.id
                                        ? 'bg-[#f79122] border-[#f79122] text-white'
                                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-[#f79122] hover:text-[#f79122]'
                                }`}
                            >
                                {c.name}
                            </button>
                        ))}
                    </div>
                )}

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

                {/* Empty state */}
                {!selectedId && !loading && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center py-20 text-center">
                        <BarChart3 size={48} className="text-gray-200 dark:text-gray-600 mb-4" />
                        <p className="text-gray-400 dark:text-gray-500 font-medium">
                            Select a campaign to view analytics
                        </p>
                        <p className="text-sm text-gray-400 dark:text-gray-600 mt-1">
                            {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''} available
                        </p>
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
