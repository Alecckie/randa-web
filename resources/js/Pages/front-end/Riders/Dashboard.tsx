import { useState, useEffect } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Modal, Button, Alert, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import RiderLayout from '@/Layouts/RiderLayout';
import QrScanner from '@/Components/frontend/CheckIn/QrScanner';
import ManualQrInput from '@/Components/frontend/CheckIn/ManualQrInput';
import axios from 'axios';
import type { PageProps } from '@/types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface StatCard {
    name: string;
    value: string;
    change: string;
    trend: 'up' | 'down' | 'neutral';
    icon: string;
}

interface Earning {
    id: number;
    desc: string;
    amount: string;
    date: string;
    type: 'earning' | 'withdrawal';
}

interface CurrentCampaign {
    id: number;
    name: string;
    helmet_code: string;
    total_days: number;
    current_day: number;
    days_remaining: number;
    end_date: string | null;
}

interface TodayProgress {
    worked_hours: number | null;
    distance_km: number;
    daily_earning: string;
    status: string | null;
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

interface Props {
    todayStatus?: TodayStatus;
    stats?: StatCard[];
    currentCampaign?: CurrentCampaign | null;
    recentEarnings?: Earning[];
    todayProgress?: TodayProgress;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function RiderDashboard({
    todayStatus: initialStatus,
    stats,
    currentCampaign,
    recentEarnings,
    todayProgress,
}: Props) {
    const { auth } = usePage<PageProps>().props;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = auth?.user as any;

    const [scannerOpen, setScannerOpen]         = useState(false);
    const [manualInputOpen, setManualInputOpen] = useState(false);
    const [todayStatus, setTodayStatus]         = useState<TodayStatus | null>(initialStatus ?? null);
    const [loading, setLoading]                 = useState(false);
    const [confirmationData, setConfirmationData] = useState<CheckInConfirmation | null>(null);
    const [showConfirmation, setShowConfirmation] = useState(false);

    useEffect(() => { fetchTodayStatus(); }, []);

    const fetchTodayStatus = async () => {
        try {
            const res = await axios.get('/rider/check-in/status');
            if (res.data.success) setTodayStatus(res.data.data);
        } catch { /* silent — page already has SSR status */ }
    };

    const handleScanQr = async (qrCode: string) => {
        setLoading(true);
        try {
            const res = await axios.post('/rider/check-in', { qr_code: qrCode });
            if (res.data.success) {
                setConfirmationData({
                    campaign_name: res.data.campaign_name,
                    helmet_code:   res.data.helmet_code,
                    check_in_time: res.data.check_in_time,
                    daily_earning: res.data.daily_earning,
                });
                setShowConfirmation(true);
                await fetchTodayStatus();
                notifications.show({ title: 'Success', message: res.data.message, color: 'green' });
            }
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            notifications.show({
                title: 'Check-in Failed',
                message: err.response?.data?.message ?? 'Failed to check in. Please try again.',
                color: 'red',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCheckOut = async () => {
        if (!window.confirm('Are you sure you want to check out?')) return;
        setLoading(true);
        try {
            const res = await axios.post('/rider/check-out');
            if (res.data.success) {
                notifications.show({ title: 'Success', message: res.data.message, color: 'green' });
                await fetchTodayStatus();
                router.reload();
            }
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            notifications.show({
                title: 'Check-out Failed',
                message: err.response?.data?.message ?? 'Failed to check out. Please try again.',
                color: 'red',
            });
        } finally {
            setLoading(false);
        }
    };

    const getTrendColor = (t: string) =>
        t === 'up' ? 'text-green-600 dark:text-green-400' :
        t === 'down' ? 'text-red-600 dark:text-red-400' :
        'text-gray-600 dark:text-gray-400';

    const workedHours  = todayProgress?.worked_hours ?? todayStatus?.worked_hours ?? 0;
    const distanceKm   = todayProgress?.distance_km ?? 0;
    const dailyEarning = todayStatus?.daily_earning ?? todayProgress?.daily_earning ?? 'KSh 0.00';

    return (
        <RiderLayout title="Dashboard" activeNav="dashboard">
            {/* QR Scanner */}
            <QrScanner
                opened={scannerOpen}
                onClose={() => setScannerOpen(false)}
                onScan={handleScanQr}
                title="Scan Helmet QR Code"
            />
            <ManualQrInput
                opened={manualInputOpen}
                onClose={() => setManualInputOpen(false)}
                onSubmit={handleScanQr}
                title="Enter QR Code Manually"
            />

            {/* Check-in Confirmation Modal */}
            <Modal opened={showConfirmation} onClose={() => setShowConfirmation(false)} title="Check-in Successful!" centered size="md">
                {confirmationData && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-center">
                            <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                                <span className="text-3xl text-green-600">✓</span>
                            </div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
                            {[
                                { label: 'Campaign',      value: confirmationData.campaign_name },
                                { label: 'Helmet',        value: confirmationData.helmet_code },
                                { label: 'Check-in Time', value: confirmationData.check_in_time },
                            ].map((row) => (
                                <div key={row.label} className="flex justify-between">
                                    <Text size="sm" c="dimmed">{row.label}:</Text>
                                    <Text size="sm" fw={500}>{row.value}</Text>
                                </div>
                            ))}
                            <div className="flex justify-between">
                                <Text size="sm" c="dimmed">Daily Earning:</Text>
                                <Text size="sm" fw={700} c="green">{confirmationData.daily_earning}</Text>
                            </div>
                        </div>
                        <Button fullWidth onClick={() => setShowConfirmation(false)}>Got it!</Button>
                    </div>
                )}
            </Modal>

            <div className="max-w-9xl mx-auto space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Welcome back, {user?.name ?? 'Rider'}!</p>
                </div>

                {/* Check-in alert */}
                {todayStatus ? (
                    todayStatus.status === 'active' ? (
                        <Alert color="green" title="You're checked in!" icon="✓">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <Text size="sm">Check-in time: {todayStatus.check_in_time}</Text>
                                    <Text size="sm">Campaign: {todayStatus.campaign_name}</Text>
                                </div>
                                <Button color="green" onClick={handleCheckOut} loading={loading}>Check Out</Button>
                            </div>
                        </Alert>
                    ) : (
                        <Alert color="blue" title="Work Complete" icon="✓">
                            <Text size="sm">You completed your work today. Hours worked: {todayStatus.worked_hours?.toFixed(2) ?? 0} hours</Text>
                        </Alert>
                    )
                ) : (
                    <Alert color="yellow" title="Ready to start?" icon="⚡">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <Text size="sm">Scan your helmet QR code to check in and start earning!</Text>
                            <div className="flex gap-2">
                                <Button color="green" onClick={() => setScannerOpen(true)} loading={loading}>Scan QR Code</Button>
                                <Button variant="outline" onClick={() => setManualInputOpen(true)}>Enter Manually</Button>
                            </div>
                        </div>
                    </Alert>
                )}

                {/* Stats */}
                {stats && stats.length > 0 && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {stats.map((stat, i) => (
                            <div key={i} className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
                                <div className="p-4 sm:p-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 truncate">{stat.name}</p>
                                            <div className="mt-2 flex items-baseline gap-2">
                                                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                                                {stat.change && (
                                                    <p className={`text-sm font-semibold ${getTrendColor(stat.trend)}`}>{stat.change}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-2xl sm:text-3xl flex-shrink-0 ml-4">{stat.icon}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Current Campaign + Today's Progress */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Current Campaign */}
                    <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700">
                        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Current Campaign</h3>
                        </div>
                        <div className="p-4 sm:p-6 space-y-4">
                            {currentCampaign ? (
                                <>
                                    <div className="flex items-center space-x-3">
                                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <span className="text-white font-bold">🎯</span>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white truncate">{currentCampaign.name}</h4>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                {currentCampaign.days_remaining > 0
                                                    ? `${currentCampaign.days_remaining} day${currentCampaign.days_remaining !== 1 ? 's' : ''} remaining`
                                                    : 'Campaign ended'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Campaign progress bar */}
                                    {currentCampaign.total_days > 0 && (
                                        <div>
                                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                                                <span>Day {currentCampaign.current_day} of {currentCampaign.total_days}</span>
                                                <span>{Math.round((currentCampaign.current_day / currentCampaign.total_days) * 100)}%</span>
                                            </div>
                                            <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-blue-500 rounded-full"
                                                    style={{ width: `${(currentCampaign.current_day / currentCampaign.total_days) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Helmet Code</p>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">{currentCampaign.helmet_code}</p>
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-3">
                                        {!todayStatus ? (
                                            <button
                                                onClick={() => setScannerOpen(true)}
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
                                            <button disabled className="flex-1 bg-gray-400 text-white px-4 py-2 rounded-lg font-medium cursor-not-allowed">
                                                Already Checked Out
                                            </button>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="py-6 text-center">
                                    <p className="text-gray-400 dark:text-gray-500 text-sm">No active campaign assigned.</p>
                                    {!todayStatus && (
                                        <button
                                            onClick={() => setScannerOpen(true)}
                                            className="mt-3 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                                        >
                                            Scan QR to Check In
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Today's Progress */}
                    <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700">
                        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Today's Progress</h3>
                        </div>
                        <div className="p-4 sm:p-6 space-y-6">
                            {/* Working hours */}
                            <div>
                                <div className="flex justify-between text-sm font-medium text-gray-900 dark:text-white mb-2">
                                    <span>Working Hours</span>
                                    <span>{workedHours ? `${Number(workedHours).toFixed(1)} / 12 hrs` : '0 / 12 hrs'}</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                    <div
                                        className="bg-blue-600 h-2 rounded-full"
                                        style={{ width: `${Math.min((Number(workedHours) / 12) * 100, 100)}%` }}
                                    />
                                </div>
                            </div>

                            {/* Distance */}
                            <div>
                                <div className="flex justify-between text-sm font-medium text-gray-900 dark:text-white mb-2">
                                    <span>Distance Covered</span>
                                    <span>{distanceKm.toFixed(1)} km</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                    <div
                                        className="bg-green-600 h-2 rounded-full"
                                        style={{ width: `${Math.min((distanceKm / 60) * 100, 100)}%` }}
                                    />
                                </div>
                            </div>

                            {/* Today's earning */}
                            <div className={`rounded-lg p-4 ${todayStatus?.status === 'active' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-50 dark:bg-gray-700'}`}>
                                <div className="flex items-center gap-3">
                                    <span className="text-lg">💰</span>
                                    <div>
                                        <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                                            {todayStatus?.status === 'active' ? "Today's Earning (In Progress)" : "Today's Earning"}
                                        </p>
                                        <p className="text-lg font-bold text-gray-900 dark:text-white">{dailyEarning}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Earnings */}
                <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700">
                    <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Earnings</h3>
                    </div>
                    <div className="p-4 sm:p-6 space-y-3">
                        {recentEarnings && recentEarnings.length > 0 ? (
                            recentEarnings.map((e) => (
                                <div key={e.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-green-100 dark:bg-green-800">
                                            <span className="text-green-600 dark:text-green-400">💰</span>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{e.desc}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{e.date}</p>
                                        </div>
                                    </div>
                                    <p className="text-sm font-semibold text-green-600 dark:text-green-400 flex-shrink-0 ml-2">{e.amount}</p>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-gray-400 text-center py-4">No earnings yet. Check in to start earning!</p>
                        )}
                    </div>
                </div>
            </div>
        </RiderLayout>
    );
}
