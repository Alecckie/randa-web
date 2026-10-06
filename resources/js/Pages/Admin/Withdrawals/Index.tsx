import { useState } from 'react';
import axios from 'axios';
import { Head, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { getWithdrawalStatusColor, getWithdrawalStatusLabel } from '@/utils/status';
import { formatDate } from '@/utils/formatting';
import {
    Badge,
    Button,
    Card,
    Drawer,
    Group,
    Modal,
    NumberInput,
    Paper,
    Select,
    Table,
    Text,
    TextInput,
    Textarea,
    Pagination,
    Stack,
    Divider,
    ActionIcon,
    Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Wallet, CheckCircle, XCircle, Banknote, Calendar, History as HistoryIcon, AlertCircle } from 'lucide-react';

interface Withdrawal {
    id: number;
    amount_requested: number;
    amount_settled: number | null;
    mpesa_confirmation_code: string | null;
    status: 'pending' | 'settled' | 'rejected';
    rejection_reason: string | null;
    created_at: string;
    reviewed_at: string | null;
    rider: {
        id: number;
        wallet_balance: number;
        user: { id: number; name: string; email: string };
    };
    reviewed_by: { id: number; name: string } | null;
}

interface RiderHistoryWithdrawal {
    id: number;
    amount_requested: number;
    amount_settled: number | null;
    mpesa_confirmation_code: string | null;
    status: 'pending' | 'settled' | 'rejected';
    rejection_reason: string | null;
    created_at: string;
    reviewed_at: string | null;
    reviewed_by: { id: number; name: string } | null;
}

interface RiderHistoryEarningDay {
    check_in_id: number;
    date: string;
    daily_earning: number;
    max_possible_earning: number;
    qualified: boolean;
    settled: boolean;
    settled_at: string | null;
}

interface RiderHistoryData {
    rider: { id: number; name: string; current_owed: number };
    withdrawals: RiderHistoryWithdrawal[];
    earnings: {
        days_worked: number;
        total_earning: number;
        total_settled: number;
        total_owed: number;
        days: RiderHistoryEarningDay[];
    };
}

interface Summary {
    pending_count: number;
    pending_amount: number;
    settled_this_month_count: number;
    settled_this_month_amount: number;
}

interface Props {
    withdrawals: {
        data: Withdrawal[];
        current_page: number;
        last_page: number;
        total: number;
    };
    summary: Summary;
    filters: { status?: string };
}

export default function WithdrawalsIndex({ withdrawals, summary, filters }: Props) {
    const { flash } = usePage().props as any;
    const [rejectModalOpened, { open: openRejectModal, close: closeRejectModal }] = useDisclosure(false);
    const [settleModalOpened, { open: openSettleModal, close: closeSettleModal }] = useDisclosure(false);
    const [rejectingId, setRejectingId] = useState<number | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [settlingWithdrawal, setSettlingWithdrawal] = useState<Withdrawal | null>(null);
    const [settleAmount, setSettleAmount] = useState<number | ''>('');
    const [settleMpesaCode, setSettleMpesaCode] = useState('');
    const [busy, setBusy] = useState(false);
    const [historyOpened, { open: openHistory, close: closeHistory }] = useDisclosure(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState<string | null>(null);
    const [historyData, setHistoryData] = useState<RiderHistoryData | null>(null);

    const openRiderHistory = async (riderId: number) => {
        openHistory();
        setHistoryLoading(true);
        setHistoryError(null);
        setHistoryData(null);
        try {
            const { data } = await axios.get(route('admin.withdrawals.rider-history', riderId));
            setHistoryData(data);
        } catch {
            setHistoryError('Failed to load this rider\'s history. Please try again.');
        } finally {
            setHistoryLoading(false);
        }
    };

    const handleStatusFilter = (status: string | null) => {
        router.get(route('admin.withdrawals.index'), status ? { status } : {}, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const openSettle = (withdrawal: Withdrawal) => {
        setSettlingWithdrawal(withdrawal);
        // Settlement pays out the rider's current outstanding balance, not
        // the (possibly stale) amount they requested — more shifts may have
        // ended since they submitted the request.
        setSettleAmount(withdrawal.rider.wallet_balance);
        setSettleMpesaCode('');
        openSettleModal();
    };

    const submitSettle = () => {
        if (!settlingWithdrawal || settleAmount === '' || settleMpesaCode.trim().length === 0) return;
        setBusy(true);
        router.post(route('admin.withdrawals.settle', settlingWithdrawal.id), {
            amount_settled: settleAmount,
            mpesa_confirmation_code: settleMpesaCode.trim(),
        }, {
            preserveScroll: true,
            onFinish: () => setBusy(false),
            onSuccess: () => closeSettleModal(),
        });
    };

    const openReject = (id: number) => {
        setRejectingId(id);
        setRejectReason('');
        openRejectModal();
    };

    const submitReject = () => {
        if (!rejectingId) return;
        setBusy(true);
        router.post(route('admin.withdrawals.reject', rejectingId), { reason: rejectReason }, {
            preserveScroll: true,
            onFinish: () => setBusy(false),
            onSuccess: () => closeRejectModal(),
        });
    };

    const handlePageChange = (page: number) => {
        router.get(route('admin.withdrawals.index'), { ...filters, page }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const StatCard = ({ icon: Icon, label, value, sub }: any) => (
        <Paper p="md" withBorder>
            <Group gap="sm">
                <div className="p-2 rounded-lg bg-gray-100">
                    <Icon size={20} className="text-gray-500" />
                </div>
                <div>
                    <Text size="xs" c="dimmed">{label}</Text>
                    <Text size="lg" fw={700}>{value}</Text>
                    {sub && <Text size="xs" c="dimmed">{sub}</Text>}
                </div>
            </Group>
        </Paper>
    );

    return (
        <AuthenticatedLayout header="Rider Withdrawals">
            <Head title="Withdrawals" />

            <div className="space-y-6">
                {flash?.success && (
                    <Paper p="sm" className="bg-green-50 border border-green-200">
                        <Text size="sm" c="green">{flash.success}</Text>
                    </Paper>
                )}
                {flash?.error && (
                    <Paper p="sm" className="bg-red-50 border border-red-200">
                        <Text size="sm" c="red">{flash.error}</Text>
                    </Paper>
                )}

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <StatCard icon={Wallet} label="Pending Requests" value={summary.pending_count} />
                    <StatCard icon={Banknote} label="Pending Amount" value={`KSh ${summary.pending_amount.toLocaleString()}`} />
                    <StatCard icon={CheckCircle} label="Settled This Month" value={summary.settled_this_month_count} />
                    <StatCard icon={Calendar} label="Paid Out This Month" value={`KSh ${summary.settled_this_month_amount.toLocaleString()}`} />
                </div>

                <Card withBorder radius="md">
                    <Group justify="space-between" mb="md">
                        <Text fw={600} size="lg">Withdrawal Requests</Text>
                        <Select
                            placeholder="All statuses"
                            data={[
                                { value: '', label: 'All statuses' },
                                { value: 'pending', label: 'Pending' },
                                { value: 'settled', label: 'Settled' },
                                { value: 'rejected', label: 'Rejected' },
                            ]}
                            value={filters.status ?? ''}
                            onChange={handleStatusFilter}
                            clearable
                            w={200}
                        />
                    </Group>

                    {withdrawals.data.length > 0 ? (
                        <div className="overflow-x-auto">
                            <Table>
                                <Table.Thead>
                                    <Table.Tr>
                                        <Table.Th>Rider</Table.Th>
                                        <Table.Th>Total Owed</Table.Th>
                                        <Table.Th>Requested</Table.Th>
                                        <Table.Th>Settled</Table.Th>
                                        <Table.Th>Status</Table.Th>
                                        <Table.Th>Requested At</Table.Th>
                                        <Table.Th>Actions</Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {withdrawals.data.map((w) => (
                                        <Table.Tr key={w.id}>
                                            <Table.Td>
                                                <Text size="sm" fw={500}>{w.rider.user.name}</Text>
                                                <Text size="xs" c="dimmed">{w.rider.user.email}</Text>
                                            </Table.Td>
                                            <Table.Td>
                                                <Text
                                                    size="sm"
                                                    fw={600}
                                                    c={w.rider.wallet_balance !== w.amount_requested ? 'orange' : undefined}
                                                >
                                                    KSh {w.rider.wallet_balance.toLocaleString()}
                                                </Text>
                                                {w.status === 'pending' && w.rider.wallet_balance !== w.amount_requested && (
                                                    <Text size="xs" c="dimmed">since requested</Text>
                                                )}
                                            </Table.Td>
                                            <Table.Td>KSh {w.amount_requested.toLocaleString()}</Table.Td>
                                            <Table.Td>
                                                {w.amount_settled !== null ? `KSh ${w.amount_settled.toLocaleString()}` : '—'}
                                                {w.mpesa_confirmation_code && (
                                                    <Text size="xs" c="dimmed" mt={2}>M-Pesa: {w.mpesa_confirmation_code}</Text>
                                                )}
                                            </Table.Td>
                                            <Table.Td>
                                                <Badge color={getWithdrawalStatusColor(w.status)} variant="light">
                                                    {getWithdrawalStatusLabel(w.status)}
                                                </Badge>
                                                {w.status === 'rejected' && w.rejection_reason && (
                                                    <Text size="xs" c="dimmed" mt={4}>{w.rejection_reason}</Text>
                                                )}
                                            </Table.Td>
                                            <Table.Td>
                                                <Text size="sm">{formatDate(w.created_at)}</Text>
                                            </Table.Td>
                                            <Table.Td>
                                                <Group gap={6} wrap="nowrap">
                                                    {w.status === 'pending' ? (
                                                        <>
                                                            <Button
                                                                size="xs"
                                                                color="green"
                                                                disabled={busy}
                                                                leftSection={<CheckCircle size={14} />}
                                                                onClick={() => openSettle(w)}
                                                            >
                                                                Mark Settled
                                                            </Button>
                                                            <Button
                                                                size="xs"
                                                                color="red"
                                                                variant="light"
                                                                disabled={busy}
                                                                leftSection={<XCircle size={14} />}
                                                                onClick={() => openReject(w.id)}
                                                            >
                                                                Reject
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <Text size="xs" c="dimmed">
                                                            {w.reviewed_by ? `by ${w.reviewed_by.name}` : '—'}
                                                        </Text>
                                                    )}
                                                    <Tooltip label="Earnings & withdrawal history">
                                                        <ActionIcon
                                                            variant="subtle"
                                                            color="gray"
                                                            onClick={() => openRiderHistory(w.rider.id)}
                                                        >
                                                            <HistoryIcon size={16} />
                                                        </ActionIcon>
                                                    </Tooltip>
                                                </Group>
                                            </Table.Td>
                                        </Table.Tr>
                                    ))}
                                </Table.Tbody>
                            </Table>
                        </div>
                    ) : (
                        <Paper p="xl" className="text-center">
                            <Wallet size={40} className="mx-auto text-gray-300 mb-3" />
                            <Text c="dimmed">No withdrawal requests {filters.status ? `with status "${filters.status}"` : 'yet'}.</Text>
                        </Paper>
                    )}

                    {withdrawals.last_page > 1 && (
                        <Group justify="center" mt="md">
                            <Pagination total={withdrawals.last_page} value={withdrawals.current_page} onChange={handlePageChange} />
                        </Group>
                    )}
                </Card>
            </div>

            <Modal opened={settleModalOpened} onClose={closeSettleModal} title="Mark Withdrawal Settled" centered>
                <Text size="sm" c="dimmed" mb="sm">
                    Only enter this after you've actually paid {settlingWithdrawal?.rider.user.name} via M-Pesa.
                    The amount must match their real outstanding balance exactly — it's rejected otherwise.
                </Text>
                <NumberInput
                    label="Amount Paid (KSh)"
                    description={`Requested: KSh ${settlingWithdrawal?.amount_requested.toLocaleString() ?? '—'} · Currently owed: KSh ${settlingWithdrawal?.rider.wallet_balance.toLocaleString() ?? '—'}`}
                    value={settleAmount}
                    onChange={(v) => setSettleAmount(typeof v === 'number' ? v : '')}
                    min={0.01}
                    decimalScale={2}
                    required
                    mb="sm"
                />
                <TextInput
                    label="M-Pesa Confirmation Code"
                    placeholder="e.g. QGH7XXXXXX"
                    value={settleMpesaCode}
                    onChange={(e) => setSettleMpesaCode(e.currentTarget.value)}
                    required
                    mb="md"
                />
                <Group justify="flex-end">
                    <Button variant="subtle" onClick={closeSettleModal}>Cancel</Button>
                    <Button
                        color="green"
                        loading={busy}
                        disabled={settleAmount === '' || settleMpesaCode.trim().length === 0}
                        onClick={submitSettle}
                    >
                        Confirm Settled
                    </Button>
                </Group>
            </Modal>

            <Modal opened={rejectModalOpened} onClose={closeRejectModal} title="Reject Withdrawal Request" centered>
                <Text size="sm" c="dimmed" mb="sm">
                    No money will move. The rider will be notified with this reason (optional).
                </Text>
                <Textarea
                    placeholder="Reason (optional)"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    minRows={3}
                    mb="md"
                />
                <Group justify="flex-end">
                    <Button variant="subtle" onClick={closeRejectModal}>Cancel</Button>
                    <Button color="red" loading={busy} onClick={submitReject}>Reject Request</Button>
                </Group>
            </Modal>

            <Drawer
                opened={historyOpened}
                onClose={closeHistory}
                title={historyData ? `${historyData.rider.name} — Earnings & Withdrawal History` : 'Earnings & Withdrawal History'}
                position="right"
                size="lg"
            >
                {historyLoading && (
                    <div className="flex items-center justify-center py-16">
                        <div className="animate-spin w-8 h-8 border-4 border-gray-300 border-t-transparent rounded-full" />
                    </div>
                )}

                {historyError && (
                    <Paper p="sm" className="bg-red-50 border border-red-200" mb="md">
                        <Group gap="xs">
                            <AlertCircle size={16} className="text-red-600" />
                            <Text size="sm" c="red">{historyError}</Text>
                        </Group>
                    </Paper>
                )}

                {historyData && !historyLoading && (
                    <Stack gap="lg">
                        <div className="grid grid-cols-3 gap-3">
                            <Paper p="sm" withBorder>
                                <Text size="xs" c="dimmed">Total Earned</Text>
                                <Text size="lg" fw={700}>KSh {historyData.earnings.total_earning.toLocaleString()}</Text>
                            </Paper>
                            <Paper p="sm" withBorder>
                                <Text size="xs" c="dimmed">Total Settled</Text>
                                <Text size="lg" fw={700} c="green">KSh {historyData.earnings.total_settled.toLocaleString()}</Text>
                            </Paper>
                            <Paper p="sm" withBorder>
                                <Text size="xs" c="dimmed">Currently Owed</Text>
                                <Text size="lg" fw={700} c="orange">KSh {historyData.rider.current_owed.toLocaleString()}</Text>
                            </Paper>
                        </div>

                        <div>
                            <Text fw={600} mb="xs">Withdrawal Requests</Text>
                            {historyData.withdrawals.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <Table striped fz="sm">
                                        <Table.Thead>
                                            <Table.Tr>
                                                <Table.Th>Date</Table.Th>
                                                <Table.Th>Requested</Table.Th>
                                                <Table.Th>Settled</Table.Th>
                                                <Table.Th>Status</Table.Th>
                                            </Table.Tr>
                                        </Table.Thead>
                                        <Table.Tbody>
                                            {historyData.withdrawals.map((w) => (
                                                <Table.Tr key={w.id}>
                                                    <Table.Td>{formatDate(w.created_at)}</Table.Td>
                                                    <Table.Td>KSh {w.amount_requested.toLocaleString()}</Table.Td>
                                                    <Table.Td>{w.amount_settled !== null ? `KSh ${w.amount_settled.toLocaleString()}` : '—'}</Table.Td>
                                                    <Table.Td>
                                                        <Badge size="sm" color={getWithdrawalStatusColor(w.status)} variant="light">
                                                            {getWithdrawalStatusLabel(w.status)}
                                                        </Badge>
                                                    </Table.Td>
                                                </Table.Tr>
                                            ))}
                                        </Table.Tbody>
                                    </Table>
                                </div>
                            ) : (
                                <Text size="sm" c="dimmed">No withdrawal requests yet.</Text>
                            )}
                        </div>

                        <Divider />

                        <div>
                            <Text fw={600} mb="xs">Daily Earnings ({historyData.earnings.days_worked} day{historyData.earnings.days_worked !== 1 ? 's' : ''} worked)</Text>
                            {historyData.earnings.days.length > 0 ? (
                                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                                    <Table striped fz="sm">
                                        <Table.Thead>
                                            <Table.Tr>
                                                <Table.Th>Date</Table.Th>
                                                <Table.Th>Earned</Table.Th>
                                                <Table.Th>Settled</Table.Th>
                                            </Table.Tr>
                                        </Table.Thead>
                                        <Table.Tbody>
                                            {[...historyData.earnings.days].reverse().map((day) => (
                                                <Table.Tr key={day.check_in_id}>
                                                    <Table.Td>{formatDate(day.date)}</Table.Td>
                                                    <Table.Td>KSh {day.daily_earning.toLocaleString()} / {day.max_possible_earning.toLocaleString()}</Table.Td>
                                                    <Table.Td>
                                                        {day.settled ? (
                                                            <Badge size="sm" color="green" variant="light">Settled</Badge>
                                                        ) : (
                                                            <Badge size="sm" color="yellow" variant="light">Outstanding</Badge>
                                                        )}
                                                    </Table.Td>
                                                </Table.Tr>
                                            ))}
                                        </Table.Tbody>
                                    </Table>
                                </div>
                            ) : (
                                <Text size="sm" c="dimmed">No earnings recorded yet.</Text>
                            )}
                        </div>
                    </Stack>
                )}
            </Drawer>
        </AuthenticatedLayout>
    );
}
