import { Badge, RingProgress, Text } from '@mantine/core';
import {
    Users, CheckCircle, Eye, MapPin, TrendingUp,
    Clock, Calendar, QrCode, Banknote, Activity,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface CampaignAnalyticsData {
    campaign: {
        id: number;
        name: string;
        status: string;
        start_date: string | null;
        end_date: string | null;
        total_days: number;
        current_day: number;
        days_remaining: number;
        helmet_count: number;
    };
    summary: {
        assigned_riders: number;
        total_checkins: number;
        qualified_days: number;
        possible_rider_days: number;
        utilization_rate: number;
        total_active_hours: number;
        total_distance_km: number;
        estimated_impressions: number;
        impressions_per_km: number;
        total_qr_scans: number;
        total_earnings_paid: number;
    };
    today: {
        riders_checked_in: number;
        riders_active: number;
        riders_completed: number;
    };
    daily_breakdown: {
        date: string;
        riders_checked_in: number;
        riders_completed: number;
        distance_km: number;
        active_hours: number;
        impressions: number;
    }[];
    rider_performance: {
        rider_id: number;
        name: string;
        qualified_days: number;
        total_active_hours: number;
        total_distance_km: number;
        total_earnings: number;
    }[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
    return n.toString();
}

function statusColor(s: string) {
    const map: Record<string, string> = {
        active: 'green', paused: 'yellow', completed: 'gray',
        draft: 'blue', pending_payment: 'orange', paid: 'teal',
    };
    return map[s] ?? 'gray';
}

function fmtDate(d: string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function MetricCard({
    icon, label, value, sub, color = 'orange',
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    sub?: string;
    color?: string;
}) {
    const bg: Record<string, string> = {
        orange: 'bg-orange-50 dark:bg-orange-900/20 text-[#f79122]',
        blue:   'bg-blue-50 dark:bg-blue-900/20 text-blue-600',
        green:  'bg-green-50 dark:bg-green-900/20 text-green-600',
        purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600',
        teal:   'bg-teal-50 dark:bg-teal-900/20 text-teal-600',
    };
    return (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
            <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${bg[color] ?? bg.orange}`}>
                    {icon}
                </div>
                <div className="min-w-0">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">{label}</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{value}</p>
                    {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
                </div>
            </div>
        </div>
    );
}

function SectionHeader({ title }: { title: string }) {
    return (
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">
            {title}
        </h4>
    );
}

// ── Main Panel ─────────────────────────────────────────────────────────────────

export default function CampaignAnalyticsPanel({ data }: { data: CampaignAnalyticsData }) {
    const { campaign, summary, today, daily_breakdown, rider_performance } = data;

    const progressPct = campaign.total_days > 0
        ? Math.round((campaign.current_day / campaign.total_days) * 100)
        : 0;

    const maxDayRiders = daily_breakdown.length > 0
        ? Math.max(...daily_breakdown.map((d) => d.riders_checked_in), 1)
        : 1;

    const maxDayImpressions = daily_breakdown.length > 0
        ? Math.max(...daily_breakdown.map((d) => d.impressions), 1)
        : 1;

    return (
        <div className="space-y-6">
            {/* ── Campaign Header ── */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{campaign.name}</h3>
                            <Badge color={statusColor(campaign.status)} variant="light" size="sm" tt="capitalize">
                                {campaign.status.replace('_', ' ')}
                            </Badge>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {fmtDate(campaign.start_date)} → {fmtDate(campaign.end_date)}
                            {campaign.total_days > 0 && ` · ${campaign.total_days} days total`}
                        </p>
                    </div>
                    {campaign.total_days > 0 && (
                        <div className="text-right">
                            <span className="text-2xl font-bold text-[#f79122]">{campaign.current_day}</span>
                            <span className="text-sm text-gray-400 ml-1">/ {campaign.total_days}</span>
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                                {campaign.days_remaining > 0
                                    ? `${campaign.days_remaining} day${campaign.days_remaining !== 1 ? 's' : ''} remaining`
                                    : 'Campaign ended'}
                            </p>
                        </div>
                    )}
                </div>
                {/* Progress bar */}
                {campaign.total_days > 0 && (
                    <div>
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span>Campaign progress</span>
                            <span>{progressPct}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-[#f79122] to-[#e07a1a] rounded-full transition-all"
                                style={{ width: `${progressPct}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* ── Key Metrics ── */}
            <div>
                <SectionHeader title="Campaign Overview" />
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    <MetricCard
                        icon={<Users size={16} />}
                        label="Riders"
                        value={`${summary.assigned_riders}`}
                        sub={`of ${campaign.helmet_count} slots`}
                        color="blue"
                    />
                    <MetricCard
                        icon={<CheckCircle size={16} />}
                        label="Qualified Days"
                        value={`${summary.qualified_days}`}
                        sub={`${summary.utilization_rate}% utilisation`}
                        color="green"
                    />
                    <MetricCard
                        icon={<Eye size={16} />}
                        label="Est. Impressions"
                        value={fmt(summary.estimated_impressions)}
                        sub={`${summary.impressions_per_km}/km estimate`}
                        color="orange"
                    />
                    <MetricCard
                        icon={<MapPin size={16} />}
                        label="Distance"
                        value={`${summary.total_distance_km.toLocaleString()} km`}
                        sub={`${summary.total_active_hours.toLocaleString()} hrs active`}
                        color="purple"
                    />
                    <MetricCard
                        icon={<QrCode size={16} />}
                        label="QR Scans"
                        value={summary.total_qr_scans.toLocaleString()}
                        sub={`${summary.total_checkins} check-ins`}
                        color="teal"
                    />
                </div>
            </div>

            {/* ── Today + Utilisation ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Today's Activity */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <Activity size={16} className="text-[#f79122]" />
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Today's Activity</h4>
                    </div>
                    <div className="space-y-3">
                        {[
                            { label: 'Checked in',  value: today.riders_checked_in, color: 'bg-blue-500' },
                            { label: 'Still active', value: today.riders_active,     color: 'bg-[#f79122]' },
                            { label: 'Completed day',value: today.riders_completed,  color: 'bg-green-500' },
                        ].map((row) => (
                            <div key={row.label} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2.5 h-2.5 rounded-full ${row.color}`} />
                                    <span className="text-sm text-gray-600 dark:text-gray-400">{row.label}</span>
                                </div>
                                <span className="text-sm font-semibold text-gray-900 dark:text-white">{row.value}</span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span>Today's attendance</span>
                            <span>
                                {summary.assigned_riders > 0
                                    ? Math.round((today.riders_checked_in / summary.assigned_riders) * 100)
                                    : 0}%
                            </span>
                        </div>
                        <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-blue-500 rounded-full"
                                style={{
                                    width: summary.assigned_riders > 0
                                        ? `${(today.riders_checked_in / summary.assigned_riders) * 100}%`
                                        : '0%',
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Utilisation Ring */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm flex flex-col items-center justify-center">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 self-start">Paid-Day Utilisation</h4>
                    <RingProgress
                        size={120}
                        thickness={14}
                        roundCaps
                        sections={[{ value: summary.utilization_rate, color: '#f79122' }]}
                        label={
                            <Text ta="center" fw={700} size="lg" c="orange">
                                {summary.utilization_rate}%
                            </Text>
                        }
                    />
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center">
                        {summary.qualified_days} of {summary.possible_rider_days} rider-days completed
                    </p>
                    <div className="mt-3 w-full pt-3 border-t border-gray-100 dark:border-gray-800 grid grid-cols-2 gap-2 text-center">
                        <div>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">
                                KSh {summary.total_earnings_paid.toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-400">Total rider earnings</p>
                        </div>
                        <div>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">
                                {summary.total_active_hours.toLocaleString()}h
                            </p>
                            <p className="text-xs text-gray-400">Total active hours</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Daily Breakdown ── */}
            {daily_breakdown.length > 0 && (
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                    <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
                        <TrendingUp size={16} className="text-[#f79122]" />
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Daily Breakdown</h4>
                    </div>

                    {/* Mini bar chart */}
                    <div className="px-5 pt-4 pb-2">
                        <div className="flex items-end gap-1 h-16">
                            {daily_breakdown.map((day) => {
                                const h = Math.round((day.riders_checked_in / maxDayRiders) * 100);
                                const hc = Math.round((day.riders_completed / maxDayRiders) * 100);
                                return (
                                    <div key={day.date} className="flex-1 flex items-end gap-px" title={`${day.date}: ${day.riders_checked_in} riders, ${day.impressions.toLocaleString()} impressions`}>
                                        <div className="flex-1 bg-blue-200 dark:bg-blue-900/40 rounded-t-sm" style={{ height: `${h}%` }} />
                                        <div className="flex-1 bg-green-400 dark:bg-green-600 rounded-t-sm" style={{ height: `${hc}%` }} />
                                    </div>
                                );
                            })}
                        </div>
                        <div className="flex gap-3 mt-2 text-xs text-gray-400">
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue-200 dark:bg-blue-900/40 inline-block" />Checked in</span>
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-green-400 dark:bg-green-600 inline-block" />Completed</span>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                                    {['Date', 'In', 'Done', 'Distance', 'Hours', 'Est. Impressions'].map((h) => (
                                        <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {daily_breakdown.map((day) => (
                                    <tr key={day.date} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                        <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300 font-medium whitespace-nowrap">
                                            {new Date(day.date).toLocaleDateString('en-KE', { weekday: 'short', month: 'short', day: 'numeric' })}
                                        </td>
                                        <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">{day.riders_checked_in}</td>
                                        <td className="px-4 py-2.5">
                                            <span className={day.riders_completed === day.riders_checked_in && day.riders_checked_in > 0 ? 'text-green-600 font-medium' : 'text-gray-600 dark:text-gray-400'}>
                                                {day.riders_completed}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">{day.distance_km} km</td>
                                        <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">{day.active_hours} h</td>
                                        <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300 font-medium">{fmt(day.impressions)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── Rider Performance ── */}
            {rider_performance.length > 0 && (
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                    <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
                        <Users size={16} className="text-[#f79122]" />
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Rider Performance</h4>
                        <span className="ml-auto text-xs text-gray-400">{rider_performance.length} riders</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-800/50">
                                    {['Rider', 'Qualified Days', 'Active Hours', 'Distance', 'Earnings'].map((h) => (
                                        <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {rider_performance
                                    .slice()
                                    .sort((a, b) => b.qualified_days - a.qualified_days)
                                    .map((rider, i) => (
                                        <tr key={rider.rider_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                            <td className="px-4 py-2.5">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#f79122] to-[#e07a1a] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                                        {rider.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="font-medium text-gray-800 dark:text-gray-200">{rider.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-gray-800 dark:text-gray-200">{rider.qualified_days}</span>
                                                    <div className="flex-1 max-w-[60px] h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-green-500 rounded-full"
                                                            style={{
                                                                width: `${Math.round((rider.qualified_days / (campaign.current_day || 1)) * 100)}%`,
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">{rider.total_active_hours} h</td>
                                            <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">{rider.total_distance_km} km</td>
                                            <td className="px-4 py-2.5 font-medium text-gray-800 dark:text-gray-200">
                                                KSh {rider.total_earnings.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                            <tfoot>
                                <tr className="bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
                                    <td className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Total</td>
                                    <td className="px-4 py-2.5 font-semibold text-gray-800 dark:text-gray-200">
                                        {rider_performance.reduce((s, r) => s + r.qualified_days, 0)}
                                    </td>
                                    <td className="px-4 py-2.5 font-semibold text-gray-800 dark:text-gray-200">
                                        {rider_performance.reduce((s, r) => s + r.total_active_hours, 0).toFixed(1)} h
                                    </td>
                                    <td className="px-4 py-2.5 font-semibold text-gray-800 dark:text-gray-200">
                                        {rider_performance.reduce((s, r) => s + r.total_distance_km, 0).toFixed(2)} km
                                    </td>
                                    <td className="px-4 py-2.5 font-semibold text-gray-800 dark:text-gray-200">
                                        KSh {rider_performance.reduce((s, r) => s + r.total_earnings, 0).toLocaleString()}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}

            {/* Empty state */}
            {daily_breakdown.length === 0 && rider_performance.length === 0 && (
                <div className="bg-white dark:bg-gray-900 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-10 text-center">
                    <Calendar size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-gray-500 dark:text-gray-400 font-medium">No activity data yet</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                        Data will appear once riders begin checking in on this campaign.
                    </p>
                </div>
            )}
        </div>
    );
}
