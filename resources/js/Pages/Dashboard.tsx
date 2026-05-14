import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import type { PageProps } from '@/types';

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

function activityIcon(type: string) {
    const map: Record<string, string> = {
        rider: '👤', campaign: '🎯', helmet: '🪖',
        assignment: '🔗', campaign_closed: '✅', approval: '✓',
        payment: '💰', system: '⚙️',
    };
    return map[type] ?? '•';
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
        { name: 'Active Campaigns', value: d.activeCampaigns,  icon: '🎯', route: 'campaigns.index' },
        { name: 'Total Riders',     value: d.totalRiders,      icon: '🏍️', route: 'riders.index' },
        { name: 'Total Helmets',    value: d.totalHelmets,     icon: '🪖', route: 'helmets.index' },
        {
            name: 'Total Payments',
            value: 'KSh ' + (d.totalPayments >= 1000
                ? (d.totalPayments / 1000).toFixed(1) + 'K'
                : d.totalPayments.toLocaleString()),
            icon: '💰',
            route: null,
        },
    ];

    const quickLinks: QuickLink[] = [
        { name: 'Riders awaiting approval',      count: d.ridersAwaitingApproval,       route: 'riders.index',    filter: 'pending' },
        { name: 'Campaigns awaiting approval',   count: d.campaignsAwaitingApproval,    route: 'campaigns.index', filter: 'pending' },
        { name: 'Riders awaiting disbursement',  count: d.ridersAwaitingDisbursement,   route: 'riders.index',    filter: 'disbursement' },
    ];

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h2>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Welcome back, {user?.name}!</span>
                </div>
            }
        >
            <Head title="Dashboard" />

            <div className="space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {stats.map((stat) => {
                        const inner = (
                            <div className="p-4 sm:p-6 flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.name}</p>
                                    <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mt-1">
                                        {stat.value}
                                    </p>
                                </div>
                                <div className="text-3xl ml-4">{stat.icon}</div>
                            </div>
                        );
                        return stat.route ? (
                            <Link
                                key={stat.name}
                                href={route(stat.route)}
                                className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
                            >
                                {inner}
                            </Link>
                        ) : (
                            <div key={stat.name} className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700">
                                {inner}
                            </div>
                        );
                    })}
                </div>

                {/* Recent Activity + Quick Links */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Recent Activity */}
                    <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700">
                        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
                        </div>
                        <div className="p-4 sm:p-6 max-h-96 overflow-y-auto">
                            {d.recentActivities.length > 0 ? (
                                <ul className="space-y-4">
                                    {d.recentActivities.map((activity, i) => (
                                        <li key={activity.id} className="flex gap-3">
                                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs">
                                                {activityIcon(activity.type)}
                                            </div>
                                            <div className="min-w-0 flex-1 pt-1">
                                                <p className="text-sm text-gray-900 dark:text-white">{activity.action}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{activity.user} · {activity.time}</p>
                                            </div>
                                            {i < d.recentActivities.length - 1 && (
                                                <div className="absolute left-7 h-full w-px bg-gray-200 dark:bg-gray-600" />
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-gray-400 text-center py-8">No recent activity in the last 7 days.</p>
                            )}
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700">
                        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Pending Actions</h3>
                        </div>
                        <div className="p-4 sm:p-6 space-y-3">
                            {quickLinks.map((link) => (
                                <Link
                                    key={link.name}
                                    href={route(link.route, link.filter ? { status: link.filter } : {})}
                                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                                >
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">{link.name}</span>
                                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                                        link.count > 0
                                            ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                                            : 'bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
                                    }`}>
                                        {link.count}
                                    </span>
                                </Link>
                            ))}

                            <div className="pt-3 border-t border-gray-100 dark:border-gray-700 grid grid-cols-2 gap-3">
                                <Link href={route('admin.campaigns.analytics')} className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-[#f79122] text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-[#f79122] transition-all">
                                    📊 Analytics
                                </Link>
                                <Link href={route('admin.tracking.heatmap-view')} className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-[#f79122] text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-[#f79122] transition-all">
                                    🗺️ Heatmap
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
