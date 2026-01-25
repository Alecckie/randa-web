import React, { useState, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import { Drawer, Title, Text, Modal, Button, Alert } from '@mantine/core';
import RiderSidebar from '@/Components/frontend/layouts/RiderSidebar';
import RiderHeader from '@/Components/frontend/layouts/RiderHeader';
import QrScanner from '@/Components/frontend/CheckIn/QrScanner';
import ManualQrInput from '@/Components/frontend/CheckIn/ManualQrInput';
import axios from 'axios';
import { notifications } from '@mantine/notifications';

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

interface TodayStatus {
    id: number;
    status: 'active' | 'completed';
    check_in_time: string;
    check_out_time: string;
    worked_hours: number | null;
    daily_earning: string;
    campaign_name: string;
    helmet_code: string;
    can_check_out: boolean;
}

interface CheckInConfirmation {
    campaign_name: string;
    helmet_code: string;
    check_in_time: string;
    daily_earning: string;
}

// MAIN RIDER DASHBOARD
export default function RiderDashboard({ todayStatus: initialStatus }: { todayStatus?: TodayStatus }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeNav, setActiveNav] = useState('dashboard');
    const [scannerOpen, setScannerOpen] = useState(false);
    const [manualInputOpen, setManualInputOpen] = useState(false);
    const [todayStatus, setTodayStatus] = useState<TodayStatus | null>(initialStatus || null);
    const [loading, setLoading] = useState(false);
    const [confirmationData, setConfirmationData] = useState<CheckInConfirmation | null>(null);
    const [showConfirmation, setShowConfirmation] = useState(false);

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
        name: todayStatus?.campaign_name || 'SafariCom 5G Launch',
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

    // Fetch today's status on mount
    useEffect(() => {
        fetchTodayStatus();
    }, []);

    const fetchTodayStatus = async () => {
        try {
            const response = await axios.get('/rider/check-in/status');
            if (response.data.success) {
                setTodayStatus(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching today status:', error);
        }
    };

    const handleScanQr = async (qrCode: string) => {
        setLoading(true);
        try {
            const response = await axios.post('/rider/check-in', { qr_code: qrCode });
            
            if (response.data.success) {
                setConfirmationData({
                    campaign_name: response.data.campaign_name,
                    helmet_code: response.data.helmet_code,
                    check_in_time: response.data.check_in_time,
                    daily_earning: response.data.daily_earning
                });
                setShowConfirmation(true);
                
                // Update today's status
                await fetchTodayStatus();
                
                notifications.show({
                    title: 'Success',
                    message: response.data.message,
                    color: 'green',
                });
            }
        } catch (error: any) {
            notifications.show({
                title: 'Check-in Failed',
                message: error.response?.data?.message || 'Failed to check in. Please try again.',
                color: 'red',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCheckOut = async () => {
        if (!window.confirm('Are you sure you want to check out?')) {
            return;
        }

        setLoading(true);
        try {
            const response = await axios.post('/rider/check-out');
            
            if (response.data.success) {
                notifications.show({
                    title: 'Success',
                    message: response.data.message,
                    color: 'green',
                });
                
                // Update today's status
                await fetchTodayStatus();
                
                // Refresh page to update stats
                router.reload();
            }
        } catch (error: any) {
            notifications.show({
                title: 'Check-out Failed',
                message: error.response?.data?.message || 'Failed to check out. Please try again.',
                color: 'red',
            });
        } finally {
            setLoading(false);
        }
    };

    const openScanner = () => {
        setScannerOpen(true);
    };

    const openManualInput = () => {
        setManualInputOpen(true);
    };

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

            {/* QR Scanner Modal */}
            <QrScanner
                opened={scannerOpen}
                onClose={() => setScannerOpen(false)}
                onScan={handleScanQr}
                title="Scan Helmet QR Code"
            />

            {/* Manual QR Input Modal */}
            <ManualQrInput
                opened={manualInputOpen}
                onClose={() => setManualInputOpen(false)}
                onSubmit={handleScanQr}
                title="Enter QR Code Manually"
            />

            {/* Check-in Confirmation Modal */}
            <Modal
                opened={showConfirmation}
                onClose={() => setShowConfirmation(false)}
                title="Check-in Successful!"
                centered
                size="md"
            >
                {confirmationData && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-center">
                            <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                                <span className="text-3xl">✓</span>
                            </div>
                        </div>
                        
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
                            <div className="flex justify-between">
                                <Text size="sm" c="dimmed">Campaign:</Text>
                                <Text size="sm" fw={500}>{confirmationData.campaign_name}</Text>
                            </div>
                            <div className="flex justify-between">
                                <Text size="sm" c="dimmed">Helmet:</Text>
                                <Text size="sm" fw={500}>{confirmationData.helmet_code}</Text>
                            </div>
                            <div className="flex justify-between">
                                <Text size="sm" c="dimmed">Check-in Time:</Text>
                                <Text size="sm" fw={500}>{confirmationData.check_in_time}</Text>
                            </div>
                            <div className="flex justify-between">
                                <Text size="sm" c="dimmed">Daily Earning:</Text>
                                <Text size="sm" fw={700} c="green">{confirmationData.daily_earning}</Text>
                            </div>
                        </div>

                        <Button fullWidth onClick={() => setShowConfirmation(false)}>
                            Got it!
                        </Button>
                    </div>
                )}
            </Modal>

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

                        {/* Check-in/Check-out Alert */}
                        {todayStatus ? (
                            todayStatus.status === 'active' ? (
                                <Alert color="green" title="You're checked in!" icon="✓">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                                        <div>
                                            <Text size="sm">Check-in time: {todayStatus.check_in_time}</Text>
                                            <Text size="sm">Campaign: {todayStatus.campaign_name}</Text>
                                        </div>
                                        <Button
                                            color="green"
                                            onClick={handleCheckOut}
                                            loading={loading}
                                            className="mt-2 sm:mt-0"
                                        >
                                            Check Out
                                        </Button>
                                    </div>
                                </Alert>
                            ) : (
                                <Alert color="blue" title="Work Complete" icon="✓">
                                    <Text size="sm">
                                        You completed your work today. Hours worked: {todayStatus.worked_hours?.toFixed(2)} hours
                                    </Text>
                                </Alert>
                            )
                        ) : (
                            <Alert color="yellow" title="Ready to start?" icon="⚡">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                                    <Text size="sm">Scan your helmet QR code to check in and start earning!</Text>
                                    <div className="flex space-x-2 mt-2 sm:mt-0">
                                        <Button
                                            color="green"
                                            onClick={openScanner}
                                            loading={loading}
                                        >
                                            Scan QR Code
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={openManualInput}
                                        >
                                            Enter Manually
                                        </Button>
                                    </div>
                                </div>
                            </Alert>
                        )}

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
                                            {!todayStatus ? (
                                                <button 
                                                    onClick={openScanner}
                                                    disabled={loading}
                                                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                                                >
                                                    {loading ? 'Processing...' : 'Check In Today'}
                                                </button>
                                            ) : todayStatus.can_check_out ? (
                                                <button 
                                                    onClick={handleCheckOut}
                                                    disabled={loading}
                                                    className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                                                >
                                                    {loading ? 'Processing...' : 'Check Out'}
                                                </button>
                                            ) : (
                                                <button 
                                                    disabled
                                                    className="flex-1 bg-gray-400 text-white px-4 py-2 rounded-lg font-medium cursor-not-allowed"
                                                >
                                                    Already Checked Out
                                                </button>
                                            )}
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
                                                <span>{todayStatus?.worked_hours ? `${todayStatus.worked_hours.toFixed(1)} / 8 hours` : '0 / 8 hours'}</span>
                                            </div>
                                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                                <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${Math.min((todayStatus?.worked_hours || 0) / 8 * 100, 100)}%` }}></div>
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
                                        <div className={`rounded-lg p-4 ${todayStatus?.status === 'active' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-50 dark:bg-gray-700'}`}>
                                            <div className="flex items-center">
                                                <span className={`text-lg mr-2 ${todayStatus?.status === 'active' ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>💰</span>
                                                <div>
                                                    <p className={`text-sm font-medium ${todayStatus?.status === 'active' ? 'text-green-900 dark:text-green-100' : 'text-gray-900 dark:text-gray-100'}`}>
                                                        {todayStatus?.status === 'active' ? "Today's Earning (In Progress)" : "Today's Earning"}
                                                    </p>
                                                    <p className={`text-lg font-bold ${todayStatus?.status === 'active' ? 'text-green-900 dark:text-green-100' : 'text-gray-900 dark:text-gray-100'}`}>
                                                        {todayStatus?.daily_earning || 'KSh 0.00'}
                                                    </p>
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