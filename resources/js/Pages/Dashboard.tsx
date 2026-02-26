import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import type { 
    User,
    StatCard, 
    Activity, 
    Campaign, 
    CurrentCampaign, 
    Transaction, 
    DashboardData,
    PageProps
} from '@/types';

export default function Dashboard() {
    const { auth, dashboardData } = usePage<PageProps & { dashboardData: any }>().props;
    const user: User = auth?.user || { 
        id: 1, 
        name: 'User', 
        email: 'user@example.com',
        role: 'admin',
        is_active: true,
        created_at: '',
        updated_at: ''
    };
    
    const realDashboardData: DashboardData = {
        admin: {
            stats: [
                { name: 'Active Campaigns', value: dashboardData?.activeCampaigns?.toString() || '0', change: '+2.5%', trend: 'up', icon: '🎯' },
                { name: 'Total Riders', value: dashboardData?.totalRiders?.toString() || '0', change: '+12%', trend: 'up', icon: '🏍️' },
                { name: 'Total Helmets', value: dashboardData?.totalHelmets?.toString() || '0', change: '+8.2%', trend: 'up', icon: '🪖' },
                { name: 'Total Payments', value: 'KSh 40,000', change: '+15.3%', trend: 'up', icon: '💰' },
            ],
            recentActivity: dashboardData?.recentActivities || [
                { id: 1, action: 'New rider application approved', user: 'John Doe', time: '2 hours ago', type: 'approval' },
                { id: 2, action: 'Campaign "City Mall Promo" completed', user: 'Metro Ads', time: '4 hours ago', type: 'campaign' },
                { id: 3, action: 'Payment processed', user: 'Jane Smith', time: '6 hours ago', type: 'payment' },
                { id: 4, action: 'New helmet registered', user: 'System', time: '1 day ago', type: 'system' },
            ],
            quickLinks: [
                { name: 'Riders awaiting approval', count: dashboardData?.ridersAwaitingApproval || 0, route: 'riders.index', filter: 'pending' },
                { name: 'Campaigns awaiting approval', count: dashboardData?.campaignsAwaitingApproval || 0, route: 'campaigns.index', filter: 'pending' },
                { name: 'Riders awaiting disbursement', count: dashboardData?.ridersAwaitingDisbursement || 0, route: 'riders.index', filter: 'disbursement' },
            ]
        },
        rider: {
            stats: [
                { name: 'Days Worked', value: '18', change: '+2', trend: 'up', icon: '📅' },
                { name: 'Total Earnings', value: 'KSh 1,260', change: '+70', trend: 'up', icon: '💰' },
                { name: 'Distance Covered', value: '234 km', change: '+12 km', trend: 'up', icon: '🗺️' },
                { name: 'QR Scans', value: '89', change: '+7', trend: 'up', icon: '📱' },
            ],
            currentCampaign: {
                name: 'SafariCom 5G Launch',
                creative: 'SafariCom_Blue_Design.jpg',
                zone: 'CBD Area',
                duration: '15 days remaining'
            }
        },
        advertiser: {
            stats: [
                { name: 'Active Campaigns', value: '3', change: '0', trend: 'neutral', icon: '🎯' },
                { name: 'Total Impressions', value: '45.2K', change: '+2.1K', trend: 'up', icon: '👁️' },
                { name: 'QR Code Scans', value: '1,247', change: '+89', trend: 'up', icon: '📱' },
                { name: 'Campaign Budget', value: 'KSh 150K', change: '-25K', trend: 'down', icon: '💳' },
            ],
            campaigns: [
                { id: 1, name: 'Summer Sale Campaign', status: 'Active', impressions: '15.2K', scans: 423, budget: 'KSh 50K' },
                { id: 2, name: 'Brand Awareness Drive', status: 'Active', impressions: '22.1K', scans: 651, budget: 'KSh 75K' },
                { id: 3, name: 'Product Launch', status: 'Paused', impressions: '8.9K', scans: 173, budget: 'KSh 25K' },
            ]
        }
    };

    const currentData = realDashboardData[user.role] || realDashboardData.admin;
    
    // Type guards for role-specific data
    const hasCurrentCampaign = (data: typeof currentData): data is { stats: StatCard[]; currentCampaign: CurrentCampaign } => {
        return 'currentCampaign' in data;
    };
    
    const hasRecentActivity = (data: typeof currentData): data is { stats: StatCard[]; recentActivity: Activity[] } => {
        return 'recentActivity' in data;
    };
    
    const hasCampaigns = (data: typeof currentData): data is { stats: StatCard[]; campaigns: Campaign[] } => {
        return 'campaigns' in data;
    };

    const getStatusColor = (status: Campaign['status']): string => {
        const colors: Record<Campaign['status'], string> = {
            Active: 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100',
            Paused: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100',
            Completed: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
            Draft: 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100',
        };
        return colors[status] || colors.Active;
    };

    const getTrendColor = (trend: StatCard['trend']): string => {
        const colors: Record<StatCard['trend'], string> = {
            up: 'text-green-600 dark:text-green-400',
            down: 'text-red-600 dark:text-red-400',
            neutral: 'text-gray-600 dark:text-gray-400',
        };
        return colors[trend] || colors.neutral;
    };

    const getTrendIcon = (trend: StatCard['trend']): string => {
        const icons: Record<StatCard['trend'], string> = {
            up: '↗️',
            down: '↘️',
            neutral: '➡️',
        };
        return icons[trend] || icons.neutral;
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                        Dashboard
                    </h2>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        Welcome back, {user.name}!
                    </div>
                </div>
            }
        >
            <Head title="Dashboard" />

            <div className="space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {currentData.stats.map((stat, index) => {
                        const getStatRoute = (statName: string) => {
                            if (statName.includes('Campaign')) return 'campaigns.index';
                            if (statName.includes('Rider')) return 'riders.index';
                            if (statName.includes('Helmet')) return 'helmets.index';
                            return null;
                        };
                        
                        const statRoute = getStatRoute(stat.name);
                        
                        if (statRoute) {
                            return (
                                <Link
                                    key={index}
                                    href={route(statRoute)}
                                    className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow duration-300 cursor-pointer"
                                >
                                    <div className="p-4 sm:p-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 truncate">
                                                    {stat.name}
                                                </p>
                                                <div className="mt-2 flex items-baseline">
                                                    <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                                                        {stat.value}
                                                    </p>
                                                    <p className={`ml-2 flex items-center text-sm font-semibold ${getTrendColor(stat.trend)}`}>
                                                        <span className="mr-1">{getTrendIcon(stat.trend)}</span>
                                                        {stat.change}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-2xl sm:text-3xl flex-shrink-0 ml-4">
                                                {stat.icon}
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            );
                        } else {
                            return (
                                <div
                                    key={index}
                                    className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow duration-300"
                                >
                                    <div className="p-4 sm:p-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 truncate">
                                                    {stat.name}
                                                </p>
                                                <div className="mt-2 flex items-baseline">
                                                    <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                                                        {stat.value}
                                                    </p>
                                                    <p className={`ml-2 flex items-center text-sm font-semibold ${getTrendColor(stat.trend)}`}>
                                                        <span className="mr-1">{getTrendIcon(stat.trend)}</span>
                                                        {stat.change}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-2xl sm:text-3xl flex-shrink-0 ml-4">
                                                {stat.icon}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        }
                    })}
                </div>

                {/* Role-specific Content */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Admin Content */}
                    {user.role === 'admin' && (
                        <>
                            {/* Recent Activity */}
                            <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700">
                                <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
                                </div>
                                <div className="p-4 sm:p-6">
                                    <div className="flow-root max-h-96 overflow-y-auto">
                                        <ul className="-mb-8">
                                            {hasRecentActivity(currentData) && currentData.recentActivity.map((activity, index) => (
                                                <li key={activity.id}>
                                                    <div className="relative pb-8">
                                                        {index !== currentData.recentActivity.length - 1 && (
                                                            <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-600" />
                                                        )}
                                                        <div className="relative flex space-x-3">
                                                            <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                                                                <span className="text-white text-xs">
                                                                    {activity.type === 'rider' && '👤'}
                                                                    {activity.type === 'campaign' && '🎯'}
                                                                    {activity.type === 'helmet' && '🪖'}
                                                                    {activity.type === 'assignment' && '🔗'}
                                                                    {activity.type === 'campaign_closed' && '✅'}
                                                                    {activity.type === 'approval' && '✓'}
                                                                    {activity.type === 'payment' && '💰'}
                                                                    {activity.type === 'system' && '⚙️'}
                                                                </span>
                                                            </div>
                                                            <div className="min-w-0 flex-1 pt-1.5">
                                                                <div>
                                                                    <p className="text-sm text-gray-900 dark:text-white">
                                                                        {activity.action}
                                                                    </p>
                                                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                                                        {activity.user} • {activity.time}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            {/* Quick Links */}
                            <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700">
                                <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Quick Links</h3>
                                </div>
                                <div className="p-4 sm:p-6">
                                    <div className="space-y-3">
                                        {hasRecentActivity(currentData) && 'quickLinks' in currentData && Array.isArray((currentData as any).quickLinks) && (currentData as any).quickLinks.map((link: any, index: number) => (
                                            <Link
                                                key={index}
                                                href={route(link.route, link.filter ? { status: link.filter } : {})}
                                                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer"
                                            >
                                                <span className="text-sm font-medium text-gray-900 dark:text-white">{link.name}</span>
                                                <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                                                    {link.count}
                                                </span>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Rider Content */}
                    {user.role === 'rider' && (
                        <>
                            {/* Current Campaign */}
                            <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700">
                                <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Current Campaign</h3>
                                </div>
                                <div className="p-4 sm:p-6">
                                    <div className="space-y-4">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <span className="text-white font-bold">🎯</span>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                                                    {hasCurrentCampaign(currentData) ? currentData.currentCampaign.name : 'No Active Campaign'}
                                                </h4>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    {hasCurrentCampaign(currentData) ? currentData.currentCampaign.duration : 'N/A'}
                                                </p>
                                            </div>
                                        </div>
                                        {hasCurrentCampaign(currentData) && (
                                            <>
                                                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Creative Design</p>
                                                            <p className="text-sm text-gray-900 dark:text-white">{currentData.currentCampaign.creative}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Assigned Zone</p>
                                                            <p className="text-sm text-gray-900 dark:text-white">{currentData.currentCampaign.zone}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                                                    <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                                                        Check In Today
                                                    </button>
                                                    <button className="flex-1 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-900 dark:text-white px-4 py-2 rounded-lg font-medium transition-colors">
                                                        View Details
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Today's Progress */}
                            <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700">
                                <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Today's Progress</h3>
                                </div>
                                <div className="p-4 sm:p-6">
                                    <div className="space-y-6">
                                        <div>
                                            <div className="flex justify-between text-sm font-medium text-gray-900 dark:text-white mb-2">
                                                <span>Working Hours</span>
                                                <span>6.5 / 8 hours</span>
                                            </div>
                                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '81.25%' }}></div>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-sm font-medium text-gray-900 dark:text-white mb-2">
                                                <span>Distance Covered</span>
                                                <span>45.2 / 60 km</span>
                                            </div>
                                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                                <div className="bg-green-600 h-2 rounded-full" style={{ width: '75.33%' }}></div>
                                            </div>
                                        </div>
                                        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                                            <div className="flex items-center">
                                                <span className="text-green-600 dark:text-green-400 text-lg mr-2">💰</span>
                                                <div>
                                                    <p className="text-sm font-medium text-green-900 dark:text-green-100">Today's Earning</p>
                                                    <p className="text-lg font-bold text-green-900 dark:text-green-100">KSh 70.00</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Advertiser Content */}
                    {user.role === 'advertiser' && (
                        <>
                            {/* Active Campaigns */}
                            <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700">
                                <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Active Campaigns</h3>
                                        <button className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
                                            View All
                                        </button>
                                    </div>
                                </div>
                                <div className="p-4 sm:p-6">
                                    <div className="space-y-4">
                                        {hasCampaigns(currentData) && currentData.campaigns.map((campaign) => (
                                            <div key={campaign.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <h4 className="font-medium text-gray-900 dark:text-white truncate">{campaign.name}</h4>
                                                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(campaign.status)}`}>
                                                        {campaign.status}
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2 sm:gap-4 text-sm">
                                                    <div>
                                                        <p className="text-gray-500 dark:text-gray-400">Impressions</p>
                                                        <p className="font-medium text-gray-900 dark:text-white">{campaign.impressions}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-500 dark:text-gray-400">QR Scans</p>
                                                        <p className="font-medium text-gray-900 dark:text-white">{campaign.scans}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-500 dark:text-gray-400">Budget</p>
                                                        <p className="font-medium text-gray-900 dark:text-white">{campaign.budget}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Performance Chart */}
                            <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700">
                                <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Campaign Performance</h3>
                                </div>
                                <div className="p-4 sm:p-6">
                                    <div className="space-y-4">
                                        <div className="text-center py-8">
                                            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <span className="text-white text-3xl">📈</span>
                                            </div>
                                            <p className="text-gray-500 dark:text-gray-400 mb-4">Campaign performance chart would be displayed here</p>
                                            <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
                                                View Detailed Analytics
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Full-width sections */}
                <div className="grid grid-cols-1 gap-6">
                    {/* Heat Map Section */}
                    <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700">
                        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">GPS Tracking Heat Map</h3>
                                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                                    <select className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                                        <option>Last 24 hours</option>
                                        <option>Last 7 days</option>
                                        <option>Last 30 days</option>
                                    </select>
                                    <button className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 px-3 py-1">
                                        Full Screen
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 sm:p-6">
                            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg h-64 sm:h-96 flex items-center justify-center">
                                <div className="text-center">
                                    <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <span className="text-white text-2xl">🗺️</span>
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-400 mb-2">Interactive Heat Map</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-500">GPS tracking data visualization would be displayed here</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Recent Transactions (for riders and advertisers) */}
                    {(user.role === 'rider' || user.role === 'advertiser') && (
                        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700">
                            <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                        {user.role === 'rider' ? 'Recent Earnings' : 'Recent Transactions'}
                                    </h3>
                                    <button className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
                                        View All
                                    </button>
                                </div>
                            </div>
                            <div className="p-4 sm:p-6">
                                <div className="space-y-3 sm:space-y-4">
                                    {([
                                        { id: 1, desc: 'Daily earning - Jan 27', amount: '+KSh 70.00', date: 'Today', type: 'earning' as const },
                                        { id: 2, desc: 'Daily earning - Jan 26', amount: '+KSh 70.00', date: 'Yesterday', type: 'earning' as const },
                                        { id: 3, desc: 'Wallet withdrawal', amount: '-KSh 500.00', date: '2 days ago', type: 'withdrawal' as const },
                                        { id: 4, desc: 'Daily earning - Jan 24', amount: '+KSh 70.00', date: '3 days ago', type: 'earning' as const },
                                    ] as Transaction[]).map((transaction) => (
                                        <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                            <div className="flex items-center space-x-3 min-w-0 flex-1">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                                    transaction.type === 'earning' ? 'bg-green-100 dark:bg-green-800' : 'bg-red-100 dark:bg-red-800'
                                                }`}>
                                                    <span className={transaction.type === 'earning' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                                        {transaction.type === 'earning' ? '💰' : '📤'}
                                                    </span>
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{transaction.desc}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{transaction.date}</p>
                                                </div>
                                            </div>
                                            <p className={`text-sm font-semibold flex-shrink-0 ml-2 ${
                                                transaction.amount.startsWith('+') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                            }`}>
                                                {transaction.amount}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}