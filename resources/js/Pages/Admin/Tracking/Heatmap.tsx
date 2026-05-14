import { lazy, Suspense, useState } from 'react';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import type { HeatmapPeriod } from '@/Components/tracking/LiveHeatmap';

const LiveHeatmap = lazy(() => import('@/Components/tracking/LiveHeatmap'));

interface Campaign {
    value: string; // campaign ID as string
    label: string; // campaign name
}

interface Props {
    campaigns: Campaign[];
}

export default function AdminHeatmap({ campaigns }: Props) {
    const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
    const [period, setPeriod] = useState<HeatmapPeriod>('7days');

    return (
        <AuthenticatedLayout header="Rider Heatmap">
            <Head title="Heatmap" />

            <div className="space-y-6">
                {/* Controls */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Filter Heatmap
                    </h2>

                    <div className="flex flex-col sm:flex-row gap-4">
                        {/* Campaign selector — required */}
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Campaign <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={selectedCampaignId ?? ''}
                                onChange={(e) =>
                                    setSelectedCampaignId(e.target.value ? Number(e.target.value) : null)
                                }
                                className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#f79122] focus:border-transparent"
                            >
                                <option value="">— Select a campaign —</option>
                                {campaigns.map((c) => (
                                    <option key={c.value} value={c.value}>
                                        {c.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Period selector */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Period
                            </label>
                            <select
                                value={period}
                                onChange={(e) => setPeriod(e.target.value as HeatmapPeriod)}
                                className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#f79122] focus:border-transparent"
                            >
                                <option value="today">Today</option>
                                <option value="7days">Last 7 days</option>
                                <option value="30days">Last 30 days</option>
                            </select>
                        </div>
                    </div>

                    {!selectedCampaignId && (
                        <p className="mt-3 text-sm text-amber-600 dark:text-amber-400">
                            Select a campaign above to display the heatmap.
                        </p>
                    )}
                </div>

                {/* Heatmap */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {selectedCampaignId
                                ? campaigns.find((c) => c.value === String(selectedCampaignId))?.label
                                : 'No campaign selected'}
                        </h3>
                        {selectedCampaignId && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                                {period === 'today' ? 'Today' : period === '7days' ? 'Last 7 days' : 'Last 30 days'}
                            </span>
                        )}
                    </div>

                    <div className="p-4 sm:p-6">
                        {selectedCampaignId ? (
                            <Suspense
                                fallback={
                                    <div className="h-[500px] flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg">
                                        <span className="text-gray-500 dark:text-gray-400">Loading map…</span>
                                    </div>
                                }
                            >
                                <LiveHeatmap
                                    key={`${selectedCampaignId}-${period}`}
                                    campaignId={selectedCampaignId}
                                    period={period}
                                    height={500}
                                    apiEndpoint="/admin/tracking/heatmap"
                                />
                            </Suspense>
                        ) : (
                            <div className="h-[500px] flex items-center justify-center bg-gray-50 dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                                <div className="text-center">
                                    <div className="text-5xl mb-3">🗺️</div>
                                    <p className="text-gray-500 dark:text-gray-400 font-medium">
                                        Select a campaign to view the heatmap
                                    </p>
                                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                                        GPS density will be shown for riders in that campaign
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
