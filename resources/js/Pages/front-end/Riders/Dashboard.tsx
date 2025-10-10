import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import { Drawer, Title, Text } from '@mantine/core';
import RiderSidebar from '@/Components/frontend/layouts/RiderSidebar';
import RiderHeader from '@/Components/frontend/layouts/RiderHeader';

// TYPES
interface StatCard {
    name: string;
    value: string;
    change: string;
    trend: 'up' | 'down' | 'neutral';
    icon: string;
}

interface Transaction {
    id: number;
    desc: string;
    amount: string;
    date: string;
    type: 'earning' | 'withdrawal';
}

// MAIN RIDER DASHBOARD
export default function RiderDashboard() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeNav, setActiveNav] = useState('dashboard');

    const user = {
        id: 1,
        name: 'John Doe',
        email: 'john.doe@example.com',
        role: 'rider',
    };

    const rider = {
        id: 1,
        status: 'approved',
        national_id: '12345678',
        mpesa_number: '254712345678',
    };

    const stats: StatCard[] = [
        { name: 'Days Worked', value: '18', change: '+2', trend: 'up', icon: '📅' },
        { name: 'Total Earnings', value: 'KSh 1,260', change: '+70', trend: 'up', icon: '💰' },
        { name: 'Distance Covered', value: '234 km', change: '+12 km', trend: 'up', icon: '🗺️' },
        { name: 'QR Scans', value: '89', change: '+7', trend: 'up', icon: '📱' },
    ];

    const currentCampaign = {
        name: 'SafariCom 5G Launch',
        creative: 'SafariCom_Blue_Design.jpg',
        zone: 'CBD Area',
        duration: '15 days remaining'
    };

    const transactions: Transaction[] = [
        { id: 1, desc: 'Daily earning - Jan 27', amount: '+KSh 70.00', date: 'Today', type: 'earning' },
        { id: 2, desc: 'Daily earning - Jan 26', amount: '+KSh 70.00', date: 'Yesterday', type: 'earning' },
        { id: 3, desc: 'Wallet withdrawal', amount: '-KSh 500.00', date: '2 days ago', type: 'withdrawal' },
        { id: 4, desc: 'Daily earning - Jan 24', amount: '+KSh 70.00', date: '3 days ago', type: 'earning' },
    ];

    const getTrendColor = (trend: string) => {
        return trend === 'up' ? 'text-green-600 dark:text-green-400' : 
               trend === 'down' ? 'text-red-600 dark:text-red-400' : 
               'text-gray-600 dark:text-gray-400';
    };

    const getTrendIcon = (trend: string) => {
        return trend === 'up' ? '↗️' : trend === 'down' ? '↘️' : '➡️';
    };

    return (
          <div className="min-h-screen bg-slate-50 dark:bg-gray-900 flex">
            <Head title="Rider Dashboard" />

            {/* Desktop Sidebar */}
            <div className="hidden lg:block w-64 fixed inset-y-0 left-0 z-30">
                <RiderSidebar user={user} activeNav="dashboard" />
            </div>

            {/* Mobile Drawer */}
            <Drawer
                opened={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                size="280px"
                padding={0}
                withCloseButton={false}
            >
                <RiderSidebar user={user} activeNav="dashboard" />
            </Drawer>

            {/* Main Content */}
            <div className="flex-1 lg:ml-64">
                <RiderHeader onMenuClick={() => setSidebarOpen(true)} rider={rider} />

                <div className="p-4 sm:p-6 lg:p-8">
                    <div className="max-w-9xl mx-auto space-y-6">
                        {/* Page Title */}
                        <div>
                            <Title order={2} size="h2" className="text-gray-900 dark:text-white">
                                Dashboard
                            </Title>
                            <Text size="sm" c="dimmed" mt="xs">
                                Welcome back, {user.name}!
                            </Text>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            {stats.map((stat, index) => (
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
                            ))}
                        </div>
                        {/* Two Column Layout */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                                                    {currentCampaign.name}
                                                </h4>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    {currentCampaign.duration}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Creative Design</p>
                                                    <p className="text-sm text-gray-900 dark:text-white">{currentCampaign.creative}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Assigned Zone</p>
                                                    <p className="text-sm text-gray-900 dark:text-white">{currentCampaign.zone}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                                            <button className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                                                Check In Today
                                            </button>
                                            <button className="flex-1 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-900 dark:text-white px-4 py-2 rounded-lg font-medium transition-colors">
                                                View Details
                                            </button>
                                        </div>
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
                        </div>

                        {/* Recent Earnings */}
                        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700">
                            <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Earnings</h3>
                                    <button className="text-sm text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300">
                                        View All
                                    </button>
                                </div>
                            </div>
                            <div className="p-4 sm:p-6">
                                <div className="space-y-3 sm:space-y-4">
                                    {transactions.map((transaction) => (
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

                        {/* GPS Tracking Heat Map */}
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
                                        <button className="text-sm text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 px-3 py-1">
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
                                        <p className="text-sm text-gray-500">GPS tracking data visualization</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}