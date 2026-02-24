import { useState } from 'react';
import { 
    Card, 
    Select, 
    MultiSelect, 
    Button, 
    Group, 
    SegmentedControl,
    Badge,
    Text
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { 
    FilterIcon, 
    RefreshCwIcon, 
    XIcon,
    CalendarIcon,
    RadioIcon,
    MapIcon
} from 'lucide-react';
import type { TrackingFilters as Filters } from '@/types/tracking';

interface TrackingFiltersProps {
    campaigns: Array<{ value: string; label: string }>;
    riders: Array<{ value: string; label: string }>;
    filters: Filters;
    onFilterChange: (filters: Filters) => void;
    onRefresh: () => void;
    loading?: boolean;
}

export default function TrackingFilters({
    campaigns,
    riders,
    filters,
    onFilterChange,
    onRefresh,
    loading = false
}: TrackingFiltersProps) {
    const [localFilters, setLocalFilters] = useState<Filters>(filters);

    const datePresets = [
        { label: 'Today', value: 'today' },
        { label: 'Yesterday', value: 'yesterday' },
        { label: 'Last 7 Days', value: '7days' },
        { label: 'Last 30 Days', value: '30days' },
    ];

    const handleDatePreset = (preset: string) => {
        const today = new Date();
        let date = today;

        switch (preset) {
            case 'yesterday':
                date = new Date(today.setDate(today.getDate() - 1));
                break;
            case '7days':
                date = new Date(today.setDate(today.getDate() - 7));
                break;
            case '30days':
                date = new Date(today.setDate(today.getDate() - 30));
                break;
            default:
                date = new Date();
        }

        const newFilters = {
            ...localFilters,
            date: date.toISOString().split('T')[0],
        };
        setLocalFilters(newFilters);
        onFilterChange(newFilters);
    };

    const handleViewModeChange = (mode: 'live' | 'historical') => {
        const newFilters = {
            ...localFilters,
            view_mode: mode,
            date: mode === 'live' ? new Date().toISOString().split('T')[0] : localFilters.date,
        };
        setLocalFilters(newFilters);
        onFilterChange(newFilters);
    };

    const handleCampaignChange = (value: string | null) => {
        const newFilters = {
            ...localFilters,
            campaign_id: value ? parseInt(value) : null,
        };
        setLocalFilters(newFilters);
        onFilterChange(newFilters);
    };

    const handleRidersChange = (values: string[]) => {
        const newFilters = {
            ...localFilters,
            rider_ids: values.map(v => parseInt(v)),
        };
        setLocalFilters(newFilters);
        onFilterChange(newFilters);
    };

    const handleDateChange = (date: Date | null) => {
        if (!date) return;
        
        const newFilters = {
            ...localFilters,
            date: date.toISOString().split('T')[0],
        };
        setLocalFilters(newFilters);
        onFilterChange(newFilters);
    };

    const handleClearFilters = () => {
        const defaultFilters: Filters = {
            campaign_id: null,
            rider_ids: [],
            date: new Date().toISOString().split('T')[0],
            view_mode: 'live',
        };
        setLocalFilters(defaultFilters);
        onFilterChange(defaultFilters);
    };

    const hasActiveFilters = 
        localFilters.campaign_id !== null || 
        localFilters.rider_ids.length > 0;

    return (
        <Card className="bg-white dark:bg-gray-800" padding="md">
            {/* View Mode Toggle */}
            <div className="mb-4">
                <Text size="sm" fw={500} mb="xs">View Mode</Text>
                <SegmentedControl
                    fullWidth
                    value={localFilters.view_mode}
                    onChange={(value) => handleViewModeChange(value as 'live' | 'historical')}
                    data={[
                        { 
                            label: (
                                <Group gap="xs" justify="center">
                                    <RadioIcon size={16} />
                                    <span>Live</span>
                                    <Badge size="xs" variant="light" color="green">Auto</Badge>
                                </Group>
                            ), 
                            value: 'live' 
                        },
                        { 
                            label: (
                                <Group gap="xs" justify="center">
                                    <CalendarIcon size={16} />
                                    <span>Historical</span>
                                </Group>
                            ), 
                            value: 'historical' 
                        },
                    ]}
                    disabled={loading}
                />
            </div>

            {/* Date Selection */}
            <div className="mb-4">
                <Text size="sm" fw={500} mb="xs">Date</Text>
                
                {localFilters.view_mode === 'live' ? (
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                        <Group gap="xs">
                            <RadioIcon size={16} className="text-green-600 animate-pulse" />
                            <Text size="sm" c="green" fw={500}>
                                Live tracking active - Today's data
                            </Text>
                        </Group>
                    </div>
                ) : (
                    <>
                        <Group mb="xs">
                            {datePresets.map((preset) => (
                                <Button
                                    key={preset.value}
                                    size="xs"
                                    variant="light"
                                    onClick={() => handleDatePreset(preset.value)}
                                    disabled={loading}
                                >
                                    {preset.label}
                                </Button>
                            ))}
                        </Group>
                        <DatePickerInput
                            value={new Date(localFilters.date)}
                            leftSection={<CalendarIcon size={16} />}
                            placeholder="Select date"
                            maxDate={new Date()}
                            disabled={loading}
                        />
                    </>
                )}
            </div>

            {/* Campaign Filter */}
            <div className="mb-4">
                <Select
                    label="Campaign"
                    placeholder="All Campaigns"
                    leftSection={<MapIcon size={16} />}
                    data={[
                        { value: '', label: 'All Campaigns' },
                        ...campaigns
                    ]}
                    value={localFilters.campaign_id?.toString() || ''}
                    onChange={handleCampaignChange}
                    clearable
                    searchable
                    disabled={loading}
                />
            </div>

            {/* Rider Filter */}
            <div className="mb-4">
                <MultiSelect
                    label="Riders"
                    placeholder="All Riders"
                    data={riders}
                    value={localFilters.rider_ids.map(id => id.toString())}
                    onChange={handleRidersChange}
                    clearable
                    searchable
                    disabled={loading}
                    maxValues={10}
                    hidePickedOptions
                />
                {localFilters.rider_ids.length > 0 && (
                    <Text size="xs" c="dimmed" mt="xs">
                        {localFilters.rider_ids.length} rider(s) selected
                    </Text>
                )}
            </div>

            {/* Action Buttons */}
            <Group justify="space-between">
                <Button
                    variant="light"
                    leftSection={<RefreshCwIcon size={16} />}
                    onClick={onRefresh}
                    loading={loading}
                    size="sm"
                >
                    Refresh
                </Button>
                
                {hasActiveFilters && (
                    <Button
                        variant="subtle"
                        color="red"
                        leftSection={<XIcon size={16} />}
                        onClick={handleClearFilters}
                        disabled={loading}
                        size="sm"
                    >
                        Clear
                    </Button>
                )}
            </Group>

            {/* Active Filters Summary */}
            {hasActiveFilters && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                    <Text size="xs" fw={500} mb="xs">Active Filters:</Text>
                    <div className="flex flex-wrap gap-2">
                        {localFilters.campaign_id && (
                            <Badge size="sm" variant="light">
                                Campaign: {campaigns.find(c => c.value === localFilters.campaign_id?.toString())?.label}
                            </Badge>
                        )}
                        {localFilters.rider_ids.length > 0 && (
                            <Badge size="sm" variant="light">
                                {localFilters.rider_ids.length} Rider(s)
                            </Badge>
                        )}
                    </div>
                </div>
            )}
        </Card>
    );
}