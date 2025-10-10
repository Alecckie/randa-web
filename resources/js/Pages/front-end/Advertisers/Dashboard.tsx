import React, { useState } from 'react';
import { Head, useForm, Link } from '@inertiajs/react';
import {
    Button,
    TextInput,
    Textarea,
    Card,
    Group,
    Text,
    Stack,
    Grid,
    Alert,
    Badge,
    Divider,
    Paper,
    Title,
    Drawer,
} from '@mantine/core';
import {
    Building2,
    FileText,
    Check,
    AlertCircle,
    MapPin,
    Plus,
    BarChart3,
    Users,
} from 'lucide-react';
import Sidebar from '@/Components/frontend/layouts/Sidebar';
import Header from '@/Components/frontend/layouts/Header';

interface Campaign {
    id: number;
    name: string;
    status: 'Active' | 'Paused' | 'Completed' | 'Draft';
    impressions: string;
    scans: number;
    budget: string;
}

interface Transaction {
    id: number;
    desc: string;
    amount: string;
    date: string;
    type: 'payment' | 'refund';
}

interface StatCard {
    name: string;
    value: string;
    change: string;
    trend: 'up' | 'down' | 'neutral';
    icon: string;
}

interface AdvertiserProfileProps {
    user: {
        id: number;
        name: string;
        email: string;
        phone: string;
        role: string;
    };
    advertiser?: {
        id?: number;
        company_name?: string;
        business_registration?: string;
        address?: string;
        status?: string;
    };
    stats?: StatCard[];
    campaigns?: Campaign[];
    transactions?: Transaction[];
}

export default function AdvertiserDashboard({ 
    user, 
    advertiser,
    stats = [
        { name: 'Active Campaigns', value: '3', change: '0', trend: 'neutral' as const, icon: '🎯' },
        { name: 'Total Impressions', value: '45.2K', change: '+2.1K', trend: 'up' as const, icon: '👁️' },
        { name: 'QR Code Scans', value: '1,247', change: '+89', trend: 'up' as const, icon: '📱' },
        { name: 'Campaign Budget', value: 'KSh 150K', change: '-25K', trend: 'down' as const, icon: '💳' },
    ],
    campaigns = [
        { id: 1, name: 'Summer Sale Campaign', status: 'Active' as const, impressions: '15.2K', scans: 423, budget: 'KSh 50K' },
        { id: 2, name: 'Brand Awareness Drive', status: 'Active' as const, impressions: '22.1K', scans: 651, budget: 'KSh 75K' },
        { id: 3, name: 'Product Launch', status: 'Paused' as const, impressions: '8.9K', scans: 173, budget: 'KSh 25K' },
    ],
    transactions = [
        { id: 1, desc: 'Campaign Payment - Summer Sale', amount: '-KSh 50,000', date: 'Today', type: 'payment' as const },
        { id: 2, desc: 'Campaign Payment - Brand Awareness', amount: '-KSh 75,000', date: 'Yesterday', type: 'payment' as const },
        { id: 3, desc: 'Refund - Cancelled Campaign', amount: '+KSh 10,000', date: '2 days ago', type: 'refund' as const },
        { id: 4, desc: 'Campaign Payment - Product Launch', amount: '-KSh 25,000', date: '3 days ago', type: 'payment' as const },
    ]
}: AdvertiserProfileProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeNav, setActiveNav] = useState('dashboard');
    
    const { data, setData, post, processing, errors } = useForm({
        company_name: advertiser?.company_name || '',
        business_registration: advertiser?.business_registration || '',
        address: advertiser?.address || '',
        user_id: user?.id || ''
    });

    const hasProfile = !!advertiser?.id;
    const isApproved = advertiser?.status === 'approved';
    const isPending = advertiser?.status === 'pending';
    const isRejected = advertiser?.status === 'rejected';

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const endpoint = '/advertiser-complete-profile';
        post(endpoint, {
            onSuccess: () => {
                // Handle success
            }
        });
    };

    const isFormValid = () => {
        return data.company_name && data.address;
    };

    const getStatusColor = (status: Campaign['status']): string => {
        const colors: Record<Campaign['status'], string> = {
            Active: 'green',
            Paused: 'yellow',
            Completed: 'gray',
            Draft: 'blue',
        };
        return colors[status] || 'green';
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
        <div className="min-h-screen bg-slate-50 dark:bg-gray-900 flex">
            <Head title="Advertiser Dashboard" />

            {/* Desktop Sidebar */}
            <div className="hidden lg:block w-64 fixed inset-y-0 left-0 z-30">
                <Sidebar user={user} activeNav={activeNav} onNavClick={setActiveNav} />
            </div>

            {/* Mobile Drawer */}
            <Drawer
                opened={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                size="280px"
                padding={0}
                withCloseButton={false}
            >
                <Sidebar user={user} activeNav={activeNav} onNavClick={setActiveNav} />
            </Drawer>

            {/* Main Content */}
            <div className="flex-1 lg:ml-64">
                {/* Header */}
                <Header 
                    onMenuClick={() => setSidebarOpen(true)} 
                    user={advertiser}
                    showCreateMenu={true}
                />

                {/* Page Content */}
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

                        {/* Status Messages */}
                        {!hasProfile && (
                            <Alert color="purple" variant="light" icon={<AlertCircle size={16} />}>
                                <Text size="sm">
                                    <strong>Complete Your Profile:</strong> Please fill out your company information to start creating advertising campaigns.
                                </Text>
                            </Alert>
                        )}

                        {isPending && (
                            <Alert color="yellow" variant="light" icon={<AlertCircle size={16} />}>
                                <Text size="sm">
                                    <strong>Application Under Review:</strong> Your advertiser profile is being reviewed by our team. You'll be notified once it's approved.
                                </Text>
                            </Alert>
                        )}

                        {isApproved && (
                            <Alert color="green" variant="light" icon={<Check size={16} />}>
                                <Text size="sm">
                                    <strong>Profile Approved:</strong> Your advertiser profile has been approved and you can start creating campaigns.
                                </Text>
                            </Alert>
                        )}

                        {isRejected && (
                            <Alert color="red" variant="light" icon={<AlertCircle size={16} />}>
                                <Text size="sm">
                                    <strong>Application Rejected:</strong> Please review and update your information, then resubmit your application.
                                </Text>
                            </Alert>
                        )}

                        {/* Company Profile Form */}
                        {(!hasProfile || isRejected) && (
                            <Card>
                                <Stack>
                                    <div>
                                        <Text size="lg" fw={600} mb="sm" className="flex items-center">
                                            <Building2 size={20} className="mr-2" />
                                            Company Information
                                        </Text>
                                        <Text size="sm" c="dimmed">
                                            Provide your company details for the advertiser account.
                                        </Text>
                                    </div>

                                    <Divider />

                                    <Grid>
                                        <Grid.Col span={{ base: 12, md: 6 }}>
                                            <TextInput
                                                label="Company Name"
                                                placeholder="Enter company name"
                                                value={data.company_name}
                                                onChange={(e) => setData('company_name', e.currentTarget.value)}
                                                error={errors.company_name}
                                                leftSection={<Building2 size={16} />}
                                                required
                                            />
                                        </Grid.Col>

                                        <Grid.Col span={{ base: 12, md: 6 }}>
                                            <TextInput
                                                label="Business Registration Number"
                                                placeholder="Enter registration number (optional)"
                                                description="Company registration or license number"
                                                value={data.business_registration}
                                                onChange={(e) => setData('business_registration', e.currentTarget.value)}
                                                error={errors.business_registration}
                                                leftSection={<FileText size={16} />}
                                            />
                                        </Grid.Col>

                                        <Grid.Col span={12}>
                                            <Textarea
                                                label="Company Address"
                                                placeholder="Enter complete company address"
                                                description="Physical address of your company"
                                                value={data.address}
                                                onChange={(e) => setData('address', e.currentTarget.value)}
                                                error={errors.address}
                                                minRows={3}
                                                required
                                            />
                                        </Grid.Col>
                                    </Grid>

                                    <Divider />

                                    <Alert icon={<AlertCircle size={16} />} color="purple" variant="light">
                                        <Text size="sm">
                                            <strong>Application Process:</strong>
                                            <br />• Your application will be submitted with "pending" status
                                            <br />• Admin review is required before approval
                                            <br />• You'll be notified once your application is reviewed
                                            <br />• Campaign creation access will be granted upon approval
                                        </Text>
                                    </Alert>

                                    <Group justify="flex-end">
                                        <Button
                                            onClick={handleSubmit}
                                            loading={processing}
                                            disabled={!isFormValid() || processing}
                                            color="purple"
                                            leftSection={<Building2 size={16} />}
                                        >
                                            {hasProfile ? 'Update Profile' : 'Submit Application'}
                                        </Button>
                                    </Group>

                                    {Object.keys(errors).length > 0 && (
                                        <Alert color="red" variant="light">
                                            <Text size="sm" fw={500} mb="xs">Please fix the following errors:</Text>
                                            <ul className="list-disc list-inside text-sm space-y-1">
                                                {Object.entries(errors).map(([field, error]) => (
                                                    <li key={field}>{error}</li>
                                                ))}
                                            </ul>
                                        </Alert>
                                    )}
                                </Stack>
                            </Card>
                        )}

                        {/* Approved Advertiser Dashboard Content */}
                        {isApproved && (
                            <div className="space-y-6">
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

                                {/* Main Content - Two Column Layout */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                                                {campaigns.map((campaign) => (
                                                    <div key={campaign.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <h4 className="font-medium text-gray-900 dark:text-white truncate">{campaign.name}</h4>
                                                            <Badge color={getStatusColor(campaign.status)} variant="light" size="sm">
                                                                {campaign.status}
                                                            </Badge>
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
                                            <div className="text-center py-8">
                                                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                                    <span className="text-white text-3xl">📈</span>
                                                </div>
                                                <p className="text-gray-500 dark:text-gray-400 mb-4">Campaign performance chart</p>
                                                <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
                                                    View Detailed Analytics
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Recent Transactions */}
                                <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700">
                                    <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Transactions</h3>
                                            <button className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
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
                                                            transaction.type === 'refund' ? 'bg-green-100 dark:bg-green-800' : 'bg-red-100 dark:bg-red-800'
                                                        }`}>
                                                            <span className={transaction.type === 'refund' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                                                {transaction.type === 'refund' ? '💰' : '📤'}
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
                                                <p className="text-sm text-gray-500">GPS tracking data visualization</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Company Profile Info */}
                                <Card>
                                    <Stack>
                                        <div>
                                            <Text size="lg" fw={600} mb="sm" className="flex items-center">
                                                <Building2 size={20} className="mr-2" />
                                                Company Profile
                                            </Text>
                                        </div>

                                        <Grid>
                                            <Grid.Col span={{ base: 12, md: 6 }}>
                                                <Paper p="md" withBorder className="bg-slate-50">
                                                    <div className="flex items-center space-x-3 mb-2">
                                                        <Building2 size={16} className="text-slate-600" />
                                                        <Text size="sm" c="dimmed">Company Name</Text>
                                                    </div>
                                                    <Text fw={500}>{advertiser?.company_name}</Text>
                                                </Paper>
                                            </Grid.Col>

                                            {advertiser?.business_registration && (
                                                <Grid.Col span={{ base: 12, md: 6 }}>
                                                    <Paper p="md" withBorder className="bg-slate-50">
                                                        <div className="flex items-center space-x-3 mb-2">
                                                            <FileText size={16} className="text-slate-600" />
                                                            <Text size="sm" c="dimmed">Registration Number</Text>
                                                        </div>
                                                        <Text fw={500}>{advertiser.business_registration}</Text>
                                                    </Paper>
                                                </Grid.Col>
                                            )}

                                            <Grid.Col span={12}>
                                                <Paper p="md" withBorder className="bg-slate-50">
                                                    <div className="flex items-center space-x-3 mb-2">
                                                        <MapPin size={16} className="text-slate-600" />
                                                        <Text size="sm" c="dimmed">Company Address</Text>
                                                    </div>
                                                    <Text fw={500}>{advertiser?.address}</Text>
                                                </Paper>
                                            </Grid.Col>
                                        </Grid>
                                    </Stack>
                                </Card>

                                {/* Quick Actions */}
                                <Card>
                                    <Stack>
                                        <div>
                                            <Text size="lg" fw={600} mb="sm">Quick Actions</Text>
                                            <Text size="sm" c="dimmed">
                                                Get started with your advertising campaigns
                                            </Text>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            <Button
                                                variant="light"
                                                color="purple"
                                                size="lg"
                                                leftSection={<Plus size={20} />}
                                                className="h-20"
                                                fullWidth
                                            >
                                                <div className="text-left">
                                                    <Text size="sm" fw={600}>Create Campaign</Text>
                                                    <Text size="xs" c="dimmed">Start a new campaign</Text>
                                                </div>
                                            </Button>

                                            <Button
                                                variant="light"
                                                color="blue"
                                                size="lg"
                                                leftSection={<BarChart3 size={20} />}
                                                className="h-20"
                                                fullWidth
                                            >
                                                <div className="text-left">
                                                    <Text size="sm" fw={600}>View Analytics</Text>
                                                    <Text size="xs" c="dimmed">Track performance</Text>
                                                </div>
                                            </Button>

                                            <Button
                                                variant="light"
                                                color="green"
                                                size="lg"
                                                leftSection={<Users size={20} />}
                                                className="h-20"
                                                fullWidth
                                            >
                                                <div className="text-left">
                                                    <Text size="sm" fw={600}>Find Riders</Text>
                                                    <Text size="xs" c="dimmed">Browse riders</Text>
                                                </div>
                                            </Button>
                                        </div>
                                    </Stack>
                                </Card>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}