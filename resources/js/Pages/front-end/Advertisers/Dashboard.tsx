import React, { useState, lazy, Suspense } from 'react';
import type { HeatmapPeriod } from '@/Components/tracking/LiveHeatmap';
import { Head, useForm, Link } from '@inertiajs/react';
import {
    Button, TextInput, Textarea, Card, Group, Text,
    Stack, Grid, Alert, Badge, Divider, Paper, Title,
} from '@mantine/core';
import {
    Building2, FileText, Check, AlertCircle,
    MapPin, Plus, BarChart3, Users, TrendingUp, TrendingDown, Minus,
} from 'lucide-react';
import AdvertiserLayout from '@/Layouts/AdvertiserLayout';

const LiveHeatmap = lazy(() => import('@/Components/tracking/LiveHeatmap'));

// ── Types ──────────────────────────────────────────────────────────────────────

interface Campaign {
    id: number;
    name: string;
    status: string;
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

interface Props {
    user: { id: number; name: string; email: string; phone: string; role: string };
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

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCardComp({ stat }: { stat: StatCard }) {
    const trendColor = stat.trend === 'up'
        ? 'text-green-600 dark:text-green-400'
        : stat.trend === 'down'
        ? 'text-red-600 dark:text-red-400'
        : 'text-gray-500';
    const TrendIcon = stat.trend === 'up' ? TrendingUp : stat.trend === 'down' ? TrendingDown : Minus;

    return (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{stat.name}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</p>
                </div>
                <div className="text-2xl">{stat.icon}</div>
            </div>
            {stat.change && (
                <div className={`flex items-center gap-1 mt-3 text-xs font-medium ${trendColor}`}>
                    <TrendIcon size={13} />
                    {stat.change}
                </div>
            )}
        </div>
    );
}

function statusBadgeColor(status: string) {
    const map: Record<string, string> = {
        active: 'green', paused: 'yellow', completed: 'gray',
        draft: 'blue', pending_payment: 'orange', paid: 'teal',
        Active: 'green', Paused: 'yellow', Completed: 'gray', Draft: 'blue',
    };
    return map[status] ?? 'gray';
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AdvertiserDashboard({ user, advertiser, stats, campaigns, transactions }: Props) {
    const [heatmapPeriod, setHeatmapPeriod] = useState<HeatmapPeriod>('7days');
    const campaignIds = (campaigns ?? []).map((c) => c.id);

    const { data, setData, post, processing, errors } = useForm({
        company_name:          advertiser?.company_name          ?? '',
        business_registration: advertiser?.business_registration ?? '',
        address:               advertiser?.address               ?? '',
        user_id:               user?.id                          ?? '',
    });

    const hasProfile = !!advertiser?.id;
    const isApproved = advertiser?.status === 'approved';
    const isPending  = advertiser?.status === 'pending';
    const isRejected = advertiser?.status === 'rejected';

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/advertiser-complete-profile');
    };

    return (
        <AdvertiserLayout title="Dashboard" activeNav="dashboard">
            <Head title="Dashboard" />
            <div className="space-y-6">

                <div>
                    <Title order={2} className="text-gray-900 dark:text-white">Dashboard</Title>
                    <Text size="sm" c="dimmed" mt={4}>Welcome back, {user.name}!</Text>
                </div>

                {/* Status alerts */}
                {!hasProfile && (
                    <Alert color="orange" icon={<AlertCircle size={16} />}>
                        <strong>Complete Your Profile:</strong> Fill out your company information to start creating advertising campaigns.
                    </Alert>
                )}
                {isPending && (
                    <Alert color="yellow" icon={<AlertCircle size={16} />}>
                        <strong>Under Review:</strong> Your advertiser profile is being reviewed. You'll be notified once approved.
                    </Alert>
                )}
                {isApproved && (
                    <Alert color="green" icon={<Check size={16} />}>
                        <strong>Profile Approved</strong> — you can create campaigns.
                    </Alert>
                )}
                {isRejected && (
                    <Alert color="red" icon={<AlertCircle size={16} />}>
                        <strong>Application Rejected:</strong> Please update your information and resubmit.
                    </Alert>
                )}

                {/* Company profile form */}
                {(!hasProfile || isRejected) && (
                    <Card radius="md" withBorder>
                        <Stack>
                            <Text size="lg" fw={600} className="flex items-center gap-2">
                                <Building2 size={20} /> Company Information
                            </Text>
                            <Divider />
                            <Grid>
                                <Grid.Col span={{ base: 12, md: 6 }}>
                                    <TextInput
                                        label="Company Name"
                                        placeholder="Enter company name"
                                        value={data.company_name}
                                        onChange={(e) => setData('company_name', e.currentTarget.value)}
                                        error={errors.company_name}
                                        leftSection={<Building2 size={15} />}
                                        required
                                    />
                                </Grid.Col>
                                <Grid.Col span={{ base: 12, md: 6 }}>
                                    <TextInput
                                        label="Business Registration"
                                        placeholder="Optional"
                                        value={data.business_registration}
                                        onChange={(e) => setData('business_registration', e.currentTarget.value)}
                                        error={errors.business_registration}
                                        leftSection={<FileText size={15} />}
                                    />
                                </Grid.Col>
                                <Grid.Col span={12}>
                                    <Textarea
                                        label="Company Address"
                                        placeholder="Physical address"
                                        value={data.address}
                                        onChange={(e) => setData('address', e.currentTarget.value)}
                                        error={errors.address}
                                        minRows={3}
                                        required
                                    />
                                </Grid.Col>
                            </Grid>
                            <Group justify="flex-end">
                                <Button
                                    onClick={handleSubmit}
                                    loading={processing}
                                    disabled={!data.company_name || !data.address}
                                    color="orange"
                                    leftSection={<Building2 size={15} />}
                                >
                                    {hasProfile ? 'Update Profile' : 'Submit Application'}
                                </Button>
                            </Group>
                        </Stack>
                    </Card>
                )}

                {/* Main dashboard (approved) */}
                {isApproved && (
                    <div className="space-y-6">

                        {/* Stats */}
                        {stats && stats.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {stats.map((s, i) => <StatCardComp key={i} stat={s} />)}
                            </div>
                        )}

                        {/* Campaigns + Quick Actions */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Campaigns */}
                            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                                <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">My Campaigns</h3>
                                    <Link href={route('my-campaigns.index')} className="text-xs text-[#f79122] hover:underline font-medium">
                                        View all
                                    </Link>
                                </div>
                                {campaigns && campaigns.length > 0 ? (
                                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {campaigns.map((c) => (
                                            <div key={c.id} className="px-5 py-3.5 flex items-center justify-between">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{c.name}</p>
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                                    <Badge color={statusBadgeColor(c.status)} variant="light" size="sm" tt="capitalize">
                                                        {c.status}
                                                    </Badge>
                                                    <Link
                                                        href={route('advertiser.analytics')}
                                                        className="text-xs text-[#f79122] hover:underline font-medium"
                                                    >
                                                        Analytics
                                                    </Link>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="px-5 py-8 text-center text-sm text-gray-400">
                                        No campaigns yet.{' '}
                                        <Link href={route('my-campaigns.create')} className="text-[#f79122] hover:underline">
                                            Create one
                                        </Link>
                                    </div>
                                )}
                            </div>

                            {/* Quick Actions */}
                            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                                <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Quick Actions</h3>
                                </div>
                                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {[
                                        { label: 'New Campaign', icon: <Plus size={18} />,    href: route('my-campaigns.create'),    color: 'bg-orange-50 dark:bg-orange-900/20 text-[#f79122]' },
                                        { label: 'Analytics',    icon: <BarChart3 size={18} />, href: route('advertiser.analytics'), color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' },
                                        { label: 'Heatmap',      icon: <MapPin size={18} />,    href: route('advertiser.heatmap'),   color: 'bg-green-50 dark:bg-green-900/20 text-green-600' },
                                        { label: 'My Campaigns', icon: <Users size={18} />,     href: route('my-campaigns.index'),   color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600' },
                                    ].map((action) => (
                                        <Link
                                            key={action.label}
                                            href={action.href}
                                            className="flex items-center gap-3 p-3.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-[#f79122] hover:shadow-sm transition-all group"
                                        >
                                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${action.color}`}>
                                                {action.icon}
                                            </div>
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">
                                                {action.label}
                                            </span>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Recent Transactions */}
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Recent Transactions</h3>
                            </div>
                            {transactions && transactions.length > 0 ? (
                                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {transactions.map((t) => (
                                        <div key={t.id} className="px-5 py-3.5 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                                    t.type === 'refund' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
                                                }`}>
                                                    <span className="text-sm">{t.type === 'refund' ? '↩' : '↗'}</span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{t.desc}</p>
                                                    <p className="text-xs text-gray-500">{t.date}</p>
                                                </div>
                                            </div>
                                            <span className={`text-sm font-semibold ${t.amount.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                                                {t.amount}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="px-5 py-6 text-sm text-gray-400 text-center">No transactions yet.</p>
                            )}
                        </div>

                        {/* Heatmap preview */}
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Rider Heatmap</h3>
                                    <p className="text-xs text-gray-500 mt-0.5">GPS density of your campaign riders</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <select
                                        value={heatmapPeriod}
                                        onChange={(e) => setHeatmapPeriod(e.target.value as HeatmapPeriod)}
                                        className="text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                                    >
                                        <option value="today">Today</option>
                                        <option value="7days">Last 7 days</option>
                                        <option value="30days">Last 30 days</option>
                                    </select>
                                    <Link href={route('advertiser.heatmap')} className="text-xs text-[#f79122] hover:underline font-medium whitespace-nowrap">
                                        Full view →
                                    </Link>
                                </div>
                            </div>
                            <div className="p-4">
                                <Suspense fallback={
                                    <div className="h-72 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                                        <span className="text-sm text-gray-400">Loading map…</span>
                                    </div>
                                }>
                                    <LiveHeatmap campaignIds={campaignIds} period={heatmapPeriod} height={288} />
                                </Suspense>
                            </div>
                        </div>

                        {/* Company profile info */}
                        {advertiser?.company_name && (
                            <Card radius="md" withBorder>
                                <Stack gap="sm">
                                    <Text fw={600} className="flex items-center gap-2">
                                        <Building2 size={18} /> Company Profile
                                    </Text>
                                    <Grid>
                                        <Grid.Col span={{ base: 12, md: 6 }}>
                                            <Paper p="sm" withBorder>
                                                <Text size="xs" c="dimmed">Company Name</Text>
                                                <Text fw={500} size="sm" mt={2}>{advertiser.company_name}</Text>
                                            </Paper>
                                        </Grid.Col>
                                        {advertiser.business_registration && (
                                            <Grid.Col span={{ base: 12, md: 6 }}>
                                                <Paper p="sm" withBorder>
                                                    <Text size="xs" c="dimmed">Registration No.</Text>
                                                    <Text fw={500} size="sm" mt={2}>{advertiser.business_registration}</Text>
                                                </Paper>
                                            </Grid.Col>
                                        )}
                                        {advertiser.address && (
                                            <Grid.Col span={12}>
                                                <Paper p="sm" withBorder>
                                                    <Text size="xs" c="dimmed">Address</Text>
                                                    <Text fw={500} size="sm" mt={2}>{advertiser.address}</Text>
                                                </Paper>
                                            </Grid.Col>
                                        )}
                                    </Grid>
                                </Stack>
                            </Card>
                        )}
                    </div>
                )}
            </div>
        </AdvertiserLayout>
    );
}
