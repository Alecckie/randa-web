import { Card, Text, Group, ThemeIcon, Skeleton } from '@mantine/core';
import {
    Users,
    MapPin,
    Activity,
    Map,
    Gauge,
} from 'lucide-react';
import type { TrackingStats as Stats } from '@/types/tracking';

interface TrackingStatsProps {
    stats: Stats;
    loading?: boolean;
}

export default function TrackingStats({ stats, loading = false }: TrackingStatsProps) {
    const cards = [
        {
            label: 'Active riders',
            value: stats.active_riders.toString(),
            suffix: '',
            icon: Users,
            color: 'blue',
            description: 'Checked in today',
        },
        {
            label: 'Total distance',
            value: Number(stats.total_distance).toFixed(1),
            suffix: ' km',
            icon: MapPin,
            color: 'green',
            description: 'Fleet total today',
        },
        {
            label: 'GPS points',
            value: Number(stats.total_locations).toLocaleString(),
            suffix: '',
            icon: Activity,
            color: 'violet',
            description: 'Points recorded today',
        },
        {
            label: 'Active campaigns',
            value: stats.active_campaigns.toString(),
            suffix: '',
            icon: Map,
            color: 'orange',
            description: 'With riders checked in',
        },
        {
            label: 'Avg speed',
            value: Number(stats.avg_speed).toFixed(1),
            suffix: ' km/h',
            icon: Gauge,
            color: 'cyan',
            description: 'Fleet average',
        },
    ];

    if (loading) {
        return (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {cards.map((_, i) => (
                    <Card key={i} radius="lg" padding="md"
                          className="border border-gray-200 dark:border-gray-700">
                        <Skeleton height={12} width="60%" mb={8} />
                        <Skeleton height={28} width="80%" mb={4} />
                        <Skeleton height={10} width="50%" />
                    </Card>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {cards.map((card) => {
                const Icon = card.icon;
                return (
                    <Card
                        key={card.label}
                        radius="lg"
                        padding="md"
                        className="bg-white dark:bg-gray-800
                                   border border-gray-200 dark:border-gray-700
                                   hover:shadow-md transition-shadow duration-200"
                    >
                        <Group justify="space-between" wrap="nowrap" mb={8}>
                            <ThemeIcon
                                size="lg"
                                radius="md"
                                variant="light"
                                color={card.color}
                            >
                                <Icon size={18} />
                            </ThemeIcon>
                        </Group>

                        <Text
                            size="xl"
                            fw={700}
                            className="text-gray-900 dark:text-white leading-none"
                        >
                            {card.value}
                            <span className="text-base font-medium text-gray-500 dark:text-gray-400">
                                {card.suffix}
                            </span>
                        </Text>

                        <Text size="xs" fw={500} c="dimmed" mt={4}>
                            {card.label}
                        </Text>

                        <Text size="xs" c="dimmed" mt={2} className="hidden sm:block">
                            {card.description}
                        </Text>
                    </Card>
                );
            })}
        </div>
    );
}