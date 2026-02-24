import { Card, Text, Group, RingProgress, ThemeIcon } from '@mantine/core';
import { 
    ActivityIcon, 
    MapPinIcon, 
    TrendingUpIcon, 
    UsersIcon,
    MapIcon,
    GaugeIcon
} from 'lucide-react';
import type { TrackingStats as Stats } from '@/types/tracking';

interface TrackingStatsProps {
    stats: Stats;
    loading?: boolean;
}

export default function TrackingStats({ stats, loading = false }: TrackingStatsProps) {
    const statCards = [
        {
            label: 'Active Riders',
            value: stats.active_riders,
            icon: UsersIcon,
            color: 'blue',
            suffix: '',
        },
        {
            label: 'Total Distance',
            value: stats.total_distance.toFixed(1),
            icon: MapPinIcon,
            color: 'green',
            suffix: ' km',
        },
        {
            label: 'Location Points',
            value: stats.total_locations.toLocaleString(),
            icon: ActivityIcon,
            color: 'violet',
            suffix: '',
        },
        {
            label: 'Active Campaigns',
            value: stats.active_campaigns,
            icon: MapIcon,
            color: 'orange',
            suffix: '',
        },
        {
            label: 'Avg Speed',
            value: stats.avg_speed.toFixed(1),
            icon: GaugeIcon,
            color: 'cyan',
            suffix: ' km/h',
        },
        {
            label: 'Coverage Areas',
            value: stats.coverage_areas,
            icon: TrendingUpIcon,
            color: 'pink',
            suffix: '',
        },
    ];

    if (loading) {
        return (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i} className="animate-pulse">
                        <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </Card>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {statCards.map((stat, index) => {
                const Icon = stat.icon;
                return (
                    <Card 
                        key={index} 
                        className="bg-white dark:bg-gray-800 hover:shadow-lg transition-shadow"
                        padding="md"
                    >
                        <Group justify="space-between" wrap="nowrap">
                            <div className="flex-1 min-w-0">
                                <Text 
                                    size="xs" 
                                    c="dimmed" 
                                    className="font-medium uppercase tracking-wide"
                                >
                                    {stat.label}
                                </Text>
                                <Text 
                                    size="xl" 
                                    fw={700} 
                                    className="mt-1 truncate"
                                >
                                    {stat.value}{stat.suffix}
                                </Text>
                            </div>
                            <ThemeIcon 
                                size="xl" 
                                radius="md" 
                                variant="light" 
                                color={stat.color}
                            >
                                <Icon size={24} />
                            </ThemeIcon>
                        </Group>
                    </Card>
                );
            })}
        </div>
    );
}