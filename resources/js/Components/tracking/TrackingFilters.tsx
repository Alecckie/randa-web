import { useState } from 'react';
import {
    Card,
    Select,
    MultiSelect,
    Button,
    Group,
    SegmentedControl,
    Badge,
    Text,
    Divider,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import {
    Filter,
    RefreshCw,
    X,
    Calendar,
    Radio,
    Map,
} from 'lucide-react';
import type { TrackingFilters as Filters, SelectOption } from '@/types/tracking';

interface TrackingFiltersProps {
    campaigns: SelectOption[];
    riders: SelectOption[];
    filters: Filters;
    onFilterChange: (filters: Filters) => void;
    onRefresh: () => void;
    loading?: boolean;
}

// ── Date preset helpers ───────────────────────────────────────────────────────

function datePresetValue(preset: string): string {
    const now = new Date();
    switch (preset) {
        case 'yesterday': {
            const d = new Date(now);
            d.setDate(d.getDate() - 1);
            return d.toISOString().split('T')[0];
        }
        case '7days': {
            const d = new Date(now);
            d.setDate(d.getDate() - 7);
            return d.toISOString().split('T')[0];
        }
        case '30days': {
            const d = new Date(now);
            d.setDate(d.getDate() - 30);
            return d.toISOString().split('T')[0];
        }
        default:
            return now.toISOString().split('T')[0];
    }
}

function parseDate(str: string): Date {
    // Construct in local time to avoid UTC offset shifting the day
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
}

function formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

// ─────────────────────────────────────────────────────────────────────────────

export default function TrackingFilters({
    campaigns,
    riders,
    filters,
    onFilterChange,
    onRefresh,
    loading = false,
}: TrackingFiltersProps) {
    const [local, setLocal] = useState<Filters>(filters);

    const apply = (patch: Partial<Filters>) => {
        const next = { ...local, ...patch };
        setLocal(next);
        onFilterChange(next);
    };

    const hasActive =
        local.campaign_id !== null || local.rider_ids.length > 0;

    const today = new Date().toISOString().split('T')[0];

    return (
        <Card
            padding="md"
            radius="lg"
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm"
        >
            {/* ── View mode ── */}
            <div className="mb-4">
                <Text size="xs" fw={600} tt="uppercase" c="dimmed" mb={6}>
                    View mode
                </Text>
                <SegmentedControl
                    fullWidth
                    size="sm"
                    value={local.view_mode}
                    onChange={(v) =>
                        apply({
                            view_mode: v as 'live' | 'historical',
                            date: v === 'live' ? today : local.date,
                        })
                    }
                    data={[
                        {
                            label: (
                                <Group gap={6} justify="center">
                                    <Radio size={14} />
                                    <span>Live</span>
                                    <Badge size="xs" color="green" variant="dot">
                                        auto
                                    </Badge>
                                </Group>
                            ),
                            value: 'live',
                        },
                        {
                            label: (
                                <Group gap={6} justify="center">
                                    <Calendar size={14} />
                                    <span>Historical</span>
                                </Group>
                            ),
                            value: 'historical',
                        },
                    ]}
                    disabled={loading}
                />
            </div>

            {/* ── Date ── */}
            <div className="mb-4">
                <Text size="xs" fw={600} tt="uppercase" c="dimmed" mb={6}>
                    Date
                </Text>

                {local.view_mode === 'live' ? (
                    <div className="flex items-center gap-2 rounded-lg px-3 py-2
                                    bg-green-50 dark:bg-green-900/20
                                    border border-green-200 dark:border-green-800">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
                        <Text size="xs" c="green" fw={500}>
                            Live — showing today's data
                        </Text>
                    </div>
                ) : (
                    <>
                        <Group gap={6} mb={8} wrap="wrap">
                            {[
                                { label: 'Today', value: 'today' },
                                { label: 'Yesterday', value: 'yesterday' },
                                { label: 'Last 7 days', value: '7days' },
                                { label: 'Last 30 days', value: '30days' },
                            ].map((p) => (
                                <Button
                                    key={p.value}
                                    size="xs"
                                    variant={local.date === datePresetValue(p.value) ? 'filled' : 'light'}
                                    color="blue"
                                    onClick={() => apply({ date: datePresetValue(p.value) })}
                                    disabled={loading}
                                >
                                    {p.label}
                                </Button>
                            ))}
                        </Group>

                        <DatePickerInput
                            value={parseDate(local.date)}
                            onChange={(d) => {
                                if (d) apply({ date: formatDate(d) });
                            }}
                            leftSection={<Calendar size={14} />}
                            placeholder="Select date"
                            maxDate={new Date()}
                            size="sm"
                            radius="md"
                            disabled={loading}
                        />
                    </>
                )}
            </div>

            <Divider my="sm" />

            {/* ── Campaign ── */}
            <div className="mb-4">
                <Select
                    label={
                        <Text size="xs" fw={600} tt="uppercase" c="dimmed">
                            Campaign
                        </Text>
                    }
                    placeholder="All campaigns"
                    leftSection={<Map size={14} />}
                    data={campaigns}
                    value={local.campaign_id?.toString() ?? null}
                    onChange={(v) =>
                        apply({ campaign_id: v ? parseInt(v) : null })
                    }
                    clearable
                    searchable
                    size="sm"
                    radius="md"
                    disabled={loading}
                />
            </div>

            {/* ── Riders ── */}
            <div className="mb-4">
                <MultiSelect
                    label={
                        <Text size="xs" fw={600} tt="uppercase" c="dimmed">
                            Riders
                        </Text>
                    }
                    placeholder="All riders"
                    data={riders}
                    value={local.rider_ids.map(String)}
                    onChange={(vals) =>
                        apply({ rider_ids: vals.map(Number) })
                    }
                    clearable
                    searchable
                    size="sm"
                    radius="md"
                    maxValues={10}
                    hidePickedOptions
                    disabled={loading}
                />
                {local.rider_ids.length > 0 && (
                    <Text size="xs" c="dimmed" mt={4}>
                        {local.rider_ids.length} rider
                        {local.rider_ids.length !== 1 ? 's' : ''} selected
                    </Text>
                )}
            </div>

            {/* ── Actions ── */}
            <Group justify="space-between" mt="sm">
                <Button
                    variant="light"
                    leftSection={<RefreshCw size={14} />}
                    onClick={onRefresh}
                    loading={loading}
                    size="sm"
                    radius="md"
                >
                    Refresh
                </Button>

                {hasActive && (
                    <Button
                        variant="subtle"
                        color="red"
                        leftSection={<X size={14} />}
                        onClick={() => {
                            const reset: Filters = {
                                campaign_id: null,
                                rider_ids: [],
                                date: today,
                                view_mode: local.view_mode,
                            };
                            setLocal(reset);
                            onFilterChange(reset);
                        }}
                        disabled={loading}
                        size="sm"
                        radius="md"
                    >
                        Clear
                    </Button>
                )}
            </Group>

            {/* ── Active filter chips ── */}
            {hasActive && (
                <div className="mt-3 p-2.5 rounded-lg
                                bg-blue-50 dark:bg-blue-900/20
                                border border-blue-200 dark:border-blue-800">
                    <Text size="xs" fw={600} c="blue" mb={6}>
                        Active filters
                    </Text>
                    <Group gap={6} wrap="wrap">
                        {local.campaign_id && (
                            <Badge size="sm" variant="light" color="blue">
                                {campaigns.find(
                                    (c) => c.value === local.campaign_id?.toString()
                                )?.label ?? `Campaign #${local.campaign_id}`}
                            </Badge>
                        )}
                        {local.rider_ids.length > 0 && (
                            <Badge size="sm" variant="light" color="indigo">
                                {local.rider_ids.length} rider
                                {local.rider_ids.length !== 1 ? 's' : ''}
                            </Badge>
                        )}
                    </Group>
                </div>
            )}
        </Card>
    );
}