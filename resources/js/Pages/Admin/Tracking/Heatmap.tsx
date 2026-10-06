import { lazy, Suspense, useState } from 'react';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import type { HeatmapMode, HeatmapPeriod } from '@/Components/tracking/LiveHeatmap';

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
    // Defaults to 'today' so the map is live (auto-refreshing) the moment a
    // campaign is picked, rather than requiring the admin to switch the
    // period manually — LiveHeatmap only polls/streams for 'today'.
    const [period, setPeriod] = useState<HeatmapPeriod>('today');
    const [customDate, setCustomDate] = useState<string>('');
    const [mode, setMode] = useState<HeatmapMode>('heat');

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
                                <option value="custom">Pick a date</option>
                            </select>
                        </div>

                        {/* Custom date picker — only for a single-day view */}
                        {period === 'custom' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Date
                                </label>
                                <input
                                    type="date"
                                    value={customDate}
                                    max={new Date().toISOString().split('T')[0]}
                                    onChange={(e) => setCustomDate(e.target.value)}
                                    className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#f79122] focus:border-transparent"
                                />
                            </div>
                        )}
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
                        <div className="flex items-center gap-3">
                            <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
                                <button
                                    type="button"
                                    onClick={() => setMode('heat')}
                                    className={`px-3 py-1.5 text-xs font-medium ${
                                        mode === 'heat'
                                            ? 'bg-[#f79122] text-white'
                                            : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                    }`}
                                >
                                    Heatmap
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMode('markers')}
                                    className={`px-3 py-1.5 text-xs font-medium ${
                                        mode === 'markers'
                                            ? 'bg-[#f79122] text-white'
                                            : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                    }`}
                                >
                                    Maps
                                </button>
                            </div>
                            {selectedCampaignId && (
                                <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 capitalize">
                                    {period === 'today' && (
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                                        </span>
                                    )}
                                    {period === 'today'
                                        ? 'Live — Today'
                                        : period === '7days'
                                        ? 'Last 7 days'
                                        : period === '30days'
                                        ? 'Last 30 days'
                                        : customDate || 'Pick a date'}
                                </span>
                            )}
                        </div>
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
                                    key={`${selectedCampaignId}-${period}-${customDate}-${mode}`}
                                    campaignId={selectedCampaignId}
                                    period={period}
                                    customDate={customDate || null}
                                    height={500}
                                    apiEndpoint="/admin/tracking/heatmap"
                                    mode={mode}
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
