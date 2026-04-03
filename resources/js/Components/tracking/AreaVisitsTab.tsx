import { useState, useEffect, useCallback } from 'react';
import {
    Select,
    Text,
    Badge,
    Loader,
    Table,
    Collapse,
    Progress,
    Tooltip,
    Alert,
    NumberFormatter,
} from '@mantine/core';
import {
    MapPin,
    ChevronDown,
    ChevronRight,
    Users,
    Clock,
    TrendingUp,
    AlertCircle,
    BarChart2,
} from 'lucide-react';
import axios from 'axios';
import type { SelectOption } from '@/types/tracking';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface RiderBreakdown {
    rider_id: number;
    rider_name: string;
    visit_count: number;
    total_minutes: number;
    avg_minutes: number;
    last_visit: string | null;
}

interface AreaVisitSummary {
    coverage_area_id: number;
    area_name: string;
    area_full_name: string;
    total_visits: number;
    unique_riders: number;
    total_gps_points: number;
    avg_duration_minutes: number | null;
    first_visit: string | null;
    last_visit: string | null;
    by_rider: RiderBreakdown[];
}

interface VisitSummaryResponse {
    campaign_id: number;
    total_areas: number;
    total_visits: number;
    areas: AreaVisitSummary[];
}

interface IndividualVisit {
    id: number;
    visit_date: string;
    entered_at: string;
    exited_at: string | null;
    duration: string;
    duration_seconds: number | null;
    gps_points_inside: number;
    is_complete: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface AreaVisitsTabProps {
    campaigns: SelectOption[];
    riders: SelectOption[];
}

// ─────────────────────────────────────────────────────────────────────────────
// API helpers
// ─────────────────────────────────────────────────────────────────────────────

async function fetchVisitSummary(
    campaignId: number,
    riderId?: number | null,
    dateFrom?: string,
    dateTo?: string
): Promise<VisitSummaryResponse> {
    const params: Record<string, string> = {};
    if (riderId)   params.rider_id  = String(riderId);
    if (dateFrom)  params.date_from = dateFrom;
    if (dateTo)    params.date_to   = dateTo;

    const res = await axios.get(
        `/admin/area-visits/campaign/${campaignId}`,
        { params }
    );
    return res.data.data as VisitSummaryResponse;
}

async function fetchRiderVisitLog(
    campaignId: number,
    areaId: number,
    riderId: number
): Promise<IndividualVisit[]> {
    const res = await axios.get(
        `/admin/area-visits/campaign/${campaignId}/area/${areaId}`,
        { params: { rider_id: riderId } }
    );
    return res.data.data.visit_log as IndividualVisit[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({
    icon,
    label,
    value,
    color = 'blue',
}: {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    color?: string;
}) {
    return (
        <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl border
                        border-gray-200 dark:border-gray-700 px-4 py-3">
            <div className={`flex items-center gap-1.5 mb-1 text-${color}-500`}>
                {icon}
                <Text size="xs" c="dimmed">{label}</Text>
            </div>
            <Text fw={700} size="lg" className="text-gray-900 dark:text-white">
                {value}
            </Text>
        </div>
    );
}

function VisitLogTable({ visits }: { visits: IndividualVisit[] }) {
    if (visits.length === 0) {
        return (
            <Text size="xs" c="dimmed" ta="center" py="sm">
                No individual visits found.
            </Text>
        );
    }

    return (
        <div className="overflow-x-auto">
            <Table
                striped
                highlightOnHover
                withTableBorder={false}
                fz="xs"
                className="mt-2"
            >
                <Table.Thead>
                    <Table.Tr>
                        <Table.Th>Date</Table.Th>
                        <Table.Th>Entered</Table.Th>
                        <Table.Th>Exited</Table.Th>
                        <Table.Th>Duration</Table.Th>
                        <Table.Th>GPS pts</Table.Th>
                        <Table.Th>Status</Table.Th>
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    {visits.map((v) => (
                        <Table.Tr key={v.id}>
                            <Table.Td>{v.visit_date}</Table.Td>
                            <Table.Td>
                                {new Date(v.entered_at).toLocaleTimeString()}
                            </Table.Td>
                            <Table.Td>
                                {v.exited_at
                                    ? new Date(v.exited_at).toLocaleTimeString()
                                    : '—'}
                            </Table.Td>
                            <Table.Td>{v.duration}</Table.Td>
                            <Table.Td>{v.gps_points_inside}</Table.Td>
                            <Table.Td>
                                <Badge
                                    size="xs"
                                    variant="light"
                                    color={v.is_complete ? 'green' : 'orange'}
                                >
                                    {v.is_complete ? 'Complete' : 'Partial'}
                                </Badge>
                            </Table.Td>
                        </Table.Tr>
                    ))}
                </Table.Tbody>
            </Table>
        </div>
    );
}

function RiderRow({
    rider,
    areaId,
    campaignId,
    maxVisits,
}: {
    rider: RiderBreakdown;
    areaId: number;
    campaignId: number;
    maxVisits: number;
}) {
    const [expanded, setExpanded]   = useState(false);
    const [visits, setVisits]       = useState<IndividualVisit[]>([]);
    const [loading, setLoading]     = useState(false);
    const [fetched, setFetched]     = useState(false);

    const handleExpand = async () => {
        if (!fetched) {
            setLoading(true);
            try {
                const data = await fetchRiderVisitLog(campaignId, areaId, rider.rider_id);
                setVisits(data);
                setFetched(true);
            } catch {
                // silently fail — empty table shows
            } finally {
                setLoading(false);
            }
        }
        setExpanded((p) => !p);
    };

    const pct = maxVisits > 0 ? Math.round((rider.visit_count / maxVisits) * 100) : 0;

    return (
        <>
            <Table.Tr
                className="cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20
                           transition-colors"
                onClick={handleExpand}
            >
                <Table.Td>
                    <div className="flex items-center gap-2">
                        {expanded
                            ? <ChevronDown size={14} className="text-blue-500 flex-shrink-0" />
                            : <ChevronRight size={14} className="text-gray-400 flex-shrink-0" />
                        }
                        <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center
                                        justify-content-center text-white text-xs font-bold flex-shrink-0"
                             style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                            {rider.rider_name.charAt(0).toUpperCase()}
                        </div>
                        <Text size="sm" fw={500}>{rider.rider_name}</Text>
                    </div>
                </Table.Td>
                <Table.Td>
                    <div className="flex items-center gap-2">
                        <Badge variant="filled" size="sm" color="blue">
                            {rider.visit_count}
                        </Badge>
                        <Progress
                            value={pct}
                            size="sm"
                            color="blue"
                            style={{ width: 60 }}
                        />
                    </div>
                </Table.Td>
                <Table.Td>
                    <Text size="xs" c="dimmed">
                        {rider.total_minutes > 0
                            ? `${rider.total_minutes.toFixed(0)} min total`
                            : '—'}
                    </Text>
                </Table.Td>
                <Table.Td>
                    <Text size="xs" c="dimmed">
                        {rider.avg_minutes > 0
                            ? `${rider.avg_minutes.toFixed(1)} min avg`
                            : '—'}
                    </Text>
                </Table.Td>
                <Table.Td>
                    <Text size="xs" c="dimmed">
                        {rider.last_visit
                            ? new Date(rider.last_visit).toLocaleDateString()
                            : '—'}
                    </Text>
                </Table.Td>
            </Table.Tr>

            {/* Expanded visit log */}
            {expanded && (
                <Table.Tr>
                    <Table.Td colSpan={5} className="bg-gray-50 dark:bg-gray-800/40 px-4 py-2">
                        {loading ? (
                            <div className="flex items-center gap-2 py-2">
                                <Loader size="xs" />
                                <Text size="xs" c="dimmed">Loading visit log…</Text>
                            </div>
                        ) : (
                            <VisitLogTable visits={visits} />
                        )}
                    </Table.Td>
                </Table.Tr>
            )}
        </>
    );
}

function AreaAccordionRow({
    area,
    campaignId,
    maxVisits,
}: {
    area: AreaVisitSummary;
    campaignId: number;
    maxVisits: number;
}) {
    const [open, setOpen] = useState(false);
    const pct = maxVisits > 0 ? Math.round((area.total_visits / maxVisits) * 100) : 0;

    return (
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl
                        overflow-hidden mb-3">

            {/* Area header row */}
            <button
                onClick={() => setOpen((p) => !p)}
                className="w-full flex items-center justify-between px-4 py-3
                           bg-white dark:bg-gray-800
                           hover:bg-gray-50 dark:hover:bg-gray-750
                           transition-colors text-left"
            >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/40
                                    flex items-center justify-center flex-shrink-0">
                        <MapPin size={16} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="min-w-0">
                        <Text fw={600} size="sm" className="text-gray-900 dark:text-white truncate">
                            {area.area_name}
                        </Text>
                        <Text size="xs" c="dimmed" className="truncate">
                            {area.area_full_name}
                        </Text>
                    </div>
                </div>

                <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                    {/* Visit count pill */}
                    <div className="text-right hidden sm:block">
                        <Text size="xs" c="dimmed">Visits</Text>
                        <Badge size="lg" variant="filled" color="blue">
                            {area.total_visits}
                        </Badge>
                    </div>

                    {/* Unique riders */}
                    <div className="text-right hidden md:block">
                        <Text size="xs" c="dimmed">Riders</Text>
                        <Text fw={600} size="sm">{area.unique_riders}</Text>
                    </div>

                    {/* Avg duration */}
                    <div className="text-right hidden md:block">
                        <Text size="xs" c="dimmed">Avg time</Text>
                        <Text fw={600} size="sm">
                            {area.avg_duration_minutes != null
                                ? `${area.avg_duration_minutes.toFixed(1)} min`
                                : '—'}
                        </Text>
                    </div>

                    {/* Bar */}
                    <div className="w-20 hidden sm:block">
                        <Tooltip label={`${pct}% of most-visited area`}>
                            <Progress value={pct} size="sm" color="blue" radius="xl" />
                        </Tooltip>
                    </div>

                    {open
                        ? <ChevronDown size={16} className="text-gray-400" />
                        : <ChevronRight size={16} className="text-gray-400" />
                    }
                </div>
            </button>

            {/* Expanded: per-rider breakdown */}
            <Collapse in={open}>
                <div className="border-t border-gray-200 dark:border-gray-700
                                px-4 py-3 bg-gray-50 dark:bg-gray-800/40">

                    {/* Area stat strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                        <StatCard
                            icon={<TrendingUp size={14} />}
                            label="Total visits"
                            value={area.total_visits}
                            color="blue"
                        />
                        <StatCard
                            icon={<Users size={14} />}
                            label="Unique riders"
                            value={area.unique_riders}
                            color="violet"
                        />
                        <StatCard
                            icon={<Clock size={14} />}
                            label="Avg visit time"
                            value={
                                area.avg_duration_minutes != null
                                    ? `${area.avg_duration_minutes.toFixed(1)} min`
                                    : '—'
                            }
                            color="green"
                        />
                        <StatCard
                            icon={<BarChart2 size={14} />}
                            label="GPS points"
                            value={<NumberFormatter value={area.total_gps_points} thousandSeparator />}
                            color="orange"
                        />
                    </div>

                    {/* Per-rider table */}
                    {area.by_rider.length > 0 ? (
                        <div className="overflow-x-auto rounded-lg border
                                        border-gray-200 dark:border-gray-700">
                            <Table
                                striped={false}
                                highlightOnHover={false}
                                withTableBorder={false}
                                fz="sm"
                            >
                                <Table.Thead className="bg-white dark:bg-gray-800">
                                    <Table.Tr>
                                        <Table.Th>Rider</Table.Th>
                                        <Table.Th>Visits</Table.Th>
                                        <Table.Th>Total time</Table.Th>
                                        <Table.Th>Avg time</Table.Th>
                                        <Table.Th>Last visit</Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {area.by_rider.map((rider) => (
                                        <RiderRow
                                            key={rider.rider_id}
                                            rider={rider}
                                            areaId={area.coverage_area_id}
                                            campaignId={campaignId}
                                            maxVisits={Math.max(
                                                ...area.by_rider.map((r) => r.visit_count)
                                            )}
                                        />
                                    ))}
                                </Table.Tbody>
                            </Table>
                        </div>
                    ) : (
                        <Text size="xs" c="dimmed" ta="center" py="sm">
                            No rider breakdown available.
                        </Text>
                    )}
                </div>
            </Collapse>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function AreaVisitsTab({ campaigns, riders }: AreaVisitsTabProps) {
    const [campaignId, setCampaignId]   = useState<number | null>(null);
    const [riderId, setRiderId]         = useState<number | null>(null);
    const [dateFrom, setDateFrom]       = useState('');
    const [dateTo, setDateTo]           = useState('');
    const [data, setData]               = useState<VisitSummaryResponse | null>(null);
    const [loading, setLoading]         = useState(false);
    const [error, setError]             = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!campaignId) return;

        setLoading(true);
        setError(null);

        try {
            const result = await fetchVisitSummary(
                campaignId,
                riderId,
                dateFrom || undefined,
                dateTo   || undefined
            );
            setData(result);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Failed to load visit data.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    }, [campaignId, riderId, dateFrom, dateTo]);

    useEffect(() => {
        load();
    }, [load]);

    const maxVisits = data
        ? Math.max(...data.areas.map((a) => a.total_visits), 1)
        : 1;

    // ── Render ─────────────────────────────────────────────────────────────

    return (
        <div className="space-y-4 py-2">

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Select
                    label="Campaign"
                    placeholder="Select a campaign"
                    data={campaigns}
                    value={campaignId?.toString() ?? null}
                    onChange={(v) => setCampaignId(v ? parseInt(v) : null)}
                    searchable
                    clearable
                    size="sm"
                    radius="md"
                />
                <Select
                    label="Rider (optional)"
                    placeholder="All riders"
                    data={riders}
                    value={riderId?.toString() ?? null}
                    onChange={(v) => setRiderId(v ? parseInt(v) : null)}
                    searchable
                    clearable
                    size="sm"
                    radius="md"
                />
                <div>
                    <Text size="xs" fw={500} c="dimmed" mb={4}>From date</Text>
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        max={dateTo || undefined}
                        className="w-full h-9 rounded-lg border border-gray-300
                                   dark:border-gray-600 bg-white dark:bg-gray-800
                                   text-sm px-3 text-gray-900 dark:text-white
                                   focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div>
                    <Text size="xs" fw={500} c="dimmed" mb={4}>To date</Text>
                    <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        min={dateFrom || undefined}
                        className="w-full h-9 rounded-lg border border-gray-300
                                   dark:border-gray-600 bg-white dark:bg-gray-800
                                   text-sm px-3 text-gray-900 dark:text-white
                                   focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            {/* Empty / prompt state */}
            {!campaignId && (
                <div className="flex flex-col items-center justify-center py-16
                                text-center border border-dashed border-gray-300
                                dark:border-gray-700 rounded-xl">
                    <MapPin size={32} className="text-gray-300 dark:text-gray-600 mb-3" />
                    <Text fw={500} c="dimmed">Select a campaign to view area visits</Text>
                    <Text size="xs" c="dimmed" mt={4} maw={320}>
                        Area visits show how many times each rider entered and exited
                        a specific coverage area during the campaign.
                    </Text>
                </div>
            )}

            {/* Loading */}
            {campaignId && loading && (
                <div className="flex items-center justify-center py-12">
                    <Loader size="md" />
                </div>
            )}

            {/* Error */}
            {error && (
                <Alert icon={<AlertCircle size={16} />} color="red" variant="light" radius="md">
                    {error}
                </Alert>
            )}

            {/* Results */}
            {!loading && data && (
                <>
                    {/* Summary header */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <StatCard
                            icon={<MapPin size={14} />}
                            label="Areas visited"
                            value={data.total_areas}
                            color="blue"
                        />
                        <StatCard
                            icon={<TrendingUp size={14} />}
                            label="Total visits"
                            value={data.total_visits}
                            color="green"
                        />
                        <StatCard
                            icon={<Users size={14} />}
                            label={riderId ? 'Rider filter active' : 'All riders'}
                            value={riderId ? '1 rider' : `${riders.length} riders`}
                            color="violet"
                        />
                    </div>

                    {/* Area list */}
                    {data.areas.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12
                                        border border-dashed border-gray-300
                                        dark:border-gray-700 rounded-xl">
                            <MapPin size={28} className="text-gray-300 mb-2" />
                            <Text c="dimmed" fw={500}>No visits recorded yet</Text>
                            <Text size="xs" c="dimmed" mt={4} maw={360} ta="center">
                                Visits are detected automatically when riders check out.
                                Make sure coverage areas have their center coordinates set.
                            </Text>
                        </div>
                    ) : (
                        <div>
                            <Text size="xs" c="dimmed" mb={10}>
                                Click an area to see per-rider breakdown.
                                Click a rider row to see their individual visit log.
                            </Text>
                            {data.areas.map((area) => (
                                <AreaAccordionRow
                                    key={area.coverage_area_id}
                                    area={area}
                                    campaignId={campaignId!}
                                    maxVisits={maxVisits}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}