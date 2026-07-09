import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import type { PageProps } from '@/types';
import { Megaphone, Users, HardHat, UserCheck, FileCheck, Banknote, BarChart3, Map } from 'lucide-react';

interface Activity {
    id: string;
    action: string;
    user: string;
    time: string;
    type: string;
}

interface QuickLink {
    name: string;
    count: number;
    route: string;
    filter: string;
}

interface DashboardData {
    activeCampaigns: number;
    totalRiders: number;
    totalHelmets: number;
    totalPayments: number;
    ridersAwaitingApproval: number;
    campaignsAwaitingApproval: number;
    ridersAwaitingDisbursement: number;
    recentActivities: Activity[];
}

function activityDot(type: string): string {
    const map: Record<string, string> = {
        rider: 'bg-blue-500', campaign: 'bg-orange-500', helmet: 'bg-purple-500',
        assignment: 'bg-green-500', campaign_closed: 'bg-gray-400', approval: 'bg-teal-500',
        payment: 'bg-emerald-500', system: 'bg-slate-400',
        campaign_status_change: 'bg-indigo-500',
        rider_live: 'bg-green-500', rider_paused: 'bg-amber-500', rider_leaving: 'bg-rose-500',
    };
    return map[type] ?? 'bg-slate-400';
}

export default function Dashboard() {
    const { auth, dashboardData } = usePage<PageProps & { dashboardData: DashboardData }>().props;
    const user = auth?.user;

    const d = dashboardData ?? {
        activeCampaigns: 0, totalRiders: 0, totalHelmets: 0, totalPayments: 0,
        ridersAwaitingApproval: 0, campaignsAwaitingApproval: 0,
        ridersAwaitingDisbursement: 0, recentActivities: [],
    };

    const stats = [
        { name: 'Active Campaigns', value: d.activeCampaigns, icon: <Megaphone size={22} className="text-gray-500" />, route: 'campaigns.index' },
        { name: 'Total Riders',     value: d.totalRiders,     icon: <Users size={22} className="text-gray-500" />,   route: 'riders.index' },
        { name: 'Total Helmets',    value: d.totalHelmets,    icon: <HardHat size={22} className="text-gray-500" />, route: 'helmets.index' },
        {
            name: 'Total Payments',
            value: 'KSh ' + (d.totalPayments >= 1000
                ? (d.totalPayments / 1000).toFixed(1) + 'K'
                : d.totalPayments.toLocaleString()),
            icon: <Banknote size={22} className="text-gray-500" />,
            route: null,
        },
    ];

    const quickLinks: QuickLink[] = [
        { name: 'Riders awaiting approval',     count: d.ridersAwaitingApproval,     route: 'riders.index',    filter: 'pending' },
        { name: 'Campaigns awaiting approval',  count: d.campaignsAwaitingApproval,  route: 'campaigns.index', filter: 'pending' },
        { name: 'Riders awaiting disbursement', count: d.ridersAwaitingDisbursement, route: 'riders.index',    filter: 'disbursement' },
    ];

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h2>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Welcome back, {user?.name}</span>
                </div>
            }
        >
            <Head title="Dashboard" />

            <div className="space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-1 gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {stats.map((stat) => {
                        const inner = (
                            <div className="p-5 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{stat.name}</p>
                                    <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mt-1">
                                        {stat.value}
                                    </p>
                                </div>
                                <div className="w-11 h-11 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                                    {stat.icon}
                                </div>
                            </div>
                        );
                        return stat.route ? (
                            <Link
                                key={stat.name}
                                href={route(stat.route)}
                                className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:shadow-sm transition-shadow"
                            >
                                {inner}
                            </Link>
                        ) : (
                            <div key={stat.name} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                                {inner}
                            </div>
                        );
                    })}
                </div>

                {/* Recent Activity + Quick Links */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Recent Activity */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">Recent Activity</h3>
                        </div>
                        <div className="p-5 max-h-96 overflow-y-auto">
                            {d.recentActivities.length > 0 ? (
                                <ul className="space-y-4">
                                    {d.recentActivities.map((activity) => (
                                        <li key={activity.id} className="flex gap-3">
                                            <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${activityDot(activity.type)}`} />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm text-gray-900 dark:text-white">{activity.action}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{activity.user} · {activity.time}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-gray-400 text-center py-8">No recent activity in the last 7 days.</p>
                            )}
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">Pending Actions</h3>
                        </div>
                        <div className="p-5 space-y-2">
                            {quickLinks.map((link) => (
                                <Link
                                    key={link.name}
                                    href={route(link.route, link.filter ? { status: link.filter } : {})}
                                    className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors"
                                >
                                    <span className="text-sm text-gray-700 dark:text-gray-300">{link.name}</span>
                                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                                        link.count > 0
                                            ? 'bg-orange-50 dark:bg-orange-900/20 text-[#f79122]'
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                                    }`}>
                                        {link.count}
                                    </span>
                                </Link>
                            ))}

                            <div className="pt-3 border-t border-gray-100 dark:border-gray-800 grid grid-cols-2 gap-3">
                                <Link href={route('admin.campaigns.analytics')} className="flex items-center gap-2.5 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-[#f79122] text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-[#f79122] transition-all">
                                    <BarChart3 size={16} />
                                    Analytics
                                </Link>
                                <Link href={route('admin.tracking.heatmap-view')} className="flex items-center gap-2.5 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-[#f79122] text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-[#f79122] transition-all">
                                    <Map size={16} />
                                    Heatmap
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
