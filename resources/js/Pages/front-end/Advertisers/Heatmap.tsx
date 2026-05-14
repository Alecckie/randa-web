import { lazy, Suspense, useState } from 'react';
import type { HeatmapPeriod } from '@/Components/tracking/LiveHeatmap';
import AdvertiserLayout from '@/Layouts/AdvertiserLayout';

const LiveHeatmap = lazy(() => import('@/Components/tracking/LiveHeatmap'));

interface Campaign { value: string; label: string }

interface Props {
    user: { id: number; name: string; email: string; phone: string; role: string };
    advertiser?: { id?: number; company_name?: string; status?: string };
    campaigns: Campaign[];
}

export default function AdvertiserHeatmap({ campaigns }: Props) {
    const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
    const [period, setPeriod] = useState<HeatmapPeriod>('today');

    const allCampaignIds = campaigns.map((c) => Number(c.value));
    const liveIds = selectedCampaignId ? [selectedCampaignId] : allCampaignIds;

    const periodLabel = period === 'today' ? 'Today' : period === '7days' ? 'Last 7 days' : 'Last 30 days';

    return (
        <AdvertiserLayout title="Heatmap" activeNav="heatmap">
            <div className="space-y-5">
                {/* Page header */}
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Rider Heatmap</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        GPS density of your campaign riders across Nairobi
                    </p>
                </div>

                {/* Filters */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                                Campaign
                            </label>
                            <select
                                value={selectedCampaignId ?? ''}
                                onChange={(e) => setSelectedCampaignId(e.target.value ? Number(e.target.value) : null)}
                                className="w-full text-sm border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#f79122] focus:border-transparent outline-none"
                            >
                                <option value="">All campaigns</option>
                                {campaigns.map((c) => (
                                    <option key={c.value} value={c.value}>{c.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="sm:w-44">
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                                Period
                            </label>
                            <select
                                value={period}
                                onChange={(e) => setPeriod(e.target.value as HeatmapPeriod)}
                                className="w-full text-sm border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#f79122] focus:border-transparent outline-none"
                            >
                                <option value="today">Today</option>
                                <option value="7days">Last 7 days</option>
                                <option value="30days">Last 30 days</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Map card */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                                {selectedCampaignId
                                    ? campaigns.find((c) => c.value === String(selectedCampaignId))?.label
                                    : 'All Campaigns'}
                            </h3>
                            <p className="text-xs text-gray-500 mt-0.5">{periodLabel}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-xs text-gray-500">Live</span>
                        </div>
                    </div>
                    <div className="p-4">
                        <Suspense fallback={
                            <div className="h-[520px] flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
                                <span className="text-sm text-gray-400">Loading map…</span>
                            </div>
                        }>
                            <LiveHeatmap
                                key={`${selectedCampaignId ?? 'all'}-${period}`}
                                campaignId={selectedCampaignId}
                                campaignIds={liveIds}
                                period={period}
                                height={520}
                                apiEndpoint="/advertiser/tracking/heatmap"
                            />
                        </Suspense>
                    </div>
                </div>
            </div>
        </AdvertiserLayout>
    );
}
