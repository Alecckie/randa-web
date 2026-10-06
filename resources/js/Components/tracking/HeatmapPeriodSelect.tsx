import { Group, Select } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import type { HeatmapPeriod } from './LiveHeatmap';

interface HeatmapPeriodSelectProps {
    period: HeatmapPeriod;
    customDate: string | null;
    onPeriodChange: (period: HeatmapPeriod) => void;
    onCustomDateChange: (date: string | null) => void;
}

export default function HeatmapPeriodSelect({
    period,
    customDate,
    onPeriodChange,
    onCustomDateChange,
}: HeatmapPeriodSelectProps) {
    return (
        <Group gap="xs" align="flex-end">
            <Select
                label="Period"
                value={period}
                onChange={(value) => onPeriodChange((value as HeatmapPeriod) ?? 'today')}
                data={[
                    { value: 'today', label: 'Today' },
                    { value: '7days', label: 'Last 7 days' },
                    { value: '30days', label: 'Last 30 days' },
                    { value: 'custom', label: 'Pick a date' },
                ]}
                w={180}
                allowDeselect={false}
                comboboxProps={{ zIndex: 2000 }}
            />
            {period === 'custom' && (
                <DatePickerInput
                    label="Date"
                    placeholder="Select date"
                    value={customDate}
                    onChange={(value) => onCustomDateChange(value)}
                    maxDate={new Date()}
                    w={180}
                    popoverProps={{ zIndex: 2000 }}
                />
            )}
        </Group>
    );
}
