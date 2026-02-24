import { Card, Text, Badge, Group, ScrollArea, ActionIcon, Tooltip } from '@mantine/core';
import { MapPinIcon, ClockIcon, PhoneIcon } from 'lucide-react';
import type { RiderListItem } from '@/types/tracking';

interface RiderListProps {
    riders: RiderListItem[];
    onRiderClick?: (riderId: number) => void;
    selectedRiderId?: number | null;
    loading?: boolean;
}

export default function RiderList({ 
    riders, 
    onRiderClick, 
    selectedRiderId,
    loading = false 
}: RiderListProps) {
    if (loading) {
        return (
            <Card className="bg-white dark:bg-gray-800">
                <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="animate-pulse">
                            <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        </div>
                    ))}
                </div>
            </Card>
        );
    }

    if (riders.length === 0) {
        return (
            <Card className="bg-white dark:bg-gray-800">
                <div className="text-center py-8">
                    <div className="text-4xl mb-2">👥</div>
                    <Text size="sm" c="dimmed">No active riders</Text>
                </div>
            </Card>
        );
    }

    return (
        <Card className="bg-white dark:bg-gray-800" padding="xs">
            <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                <Text size="sm" fw={600}>
                    Active Riders ({riders.length})
                </Text>
            </div>

            <ScrollArea h={600} type="auto">
                <div className="p-2 space-y-2">
                    {riders.map((rider) => (
                        <div
                            key={rider.id}
                            onClick={() => onRiderClick?.(rider.id)}
                            className={`
                                p-3 rounded-lg cursor-pointer transition-all
                                hover:bg-gray-50 dark:hover:bg-gray-700
                                ${selectedRiderId === rider.id 
                                    ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500' 
                                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                                }
                            `}
                        >
                            {/* Rider Header */}
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex-1 min-w-0">
                                    <Text size="sm" fw={600} className="truncate">
                                        {rider.name}
                                    </Text>
                                    <Text size="xs" c="dimmed" className="truncate">
                                        {rider.email}
                                    </Text>
                                </div>
                                
                                {/* Status Indicator */}
                                <div className={`
                                    w-2 h-2 rounded-full ml-2 flex-shrink-0 mt-1
                                    ${rider.tracking_status.is_active 
                                        ? 'bg-green-500 animate-pulse' 
                                        : 'bg-gray-400'
                                    }
                                `} />
                            </div>

                            {/* Campaign Badge */}
                            {rider.current_campaign && (
                                <Badge 
                                    size="xs" 
                                    variant="light" 
                                    color="blue"
                                    className="mb-2"
                                >
                                    {rider.current_campaign.name}
                                </Badge>
                            )}

                            {/* Last Seen */}
                            <Group gap="xs" className="text-xs text-gray-600 dark:text-gray-400">
                                <ClockIcon size={12} />
                                <Text size="xs">
                                    {rider.tracking_status.last_seen_human}
                                </Text>
                            </Group>

                            {/* Quick Actions */}
                            <Group gap="xs" mt="xs">
                                <Tooltip label="Call Rider">
                                    <ActionIcon 
                                        size="sm" 
                                        variant="light"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            window.location.href = `tel:${rider.phone}`;
                                        }}
                                    >
                                        <PhoneIcon size={14} />
                                    </ActionIcon>
                                </Tooltip>
                                
                                <Tooltip label="View on Map">
                                    <ActionIcon 
                                        size="sm" 
                                        variant="light"
                                        color="blue"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRiderClick?.(rider.id);
                                        }}
                                    >
                                        <MapPinIcon size={14} />
                                    </ActionIcon>
                                </Tooltip>
                            </Group>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </Card>
    );
}