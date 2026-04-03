import { useState } from 'react';
import {
    TextInput,
    Text,
    Badge,
    Loader,
    ScrollArea,
} from '@mantine/core';
import { Search, User, Clock } from 'lucide-react';
import type { RiderListItem } from '@/types/tracking';

interface RiderListProps {
    riders: RiderListItem[];
    onRiderClick: (riderId: number) => void;
    selectedRiderId: number | null;
    loading?: boolean;
}

export default function RiderList({
    riders,
    onRiderClick,
    selectedRiderId,
    loading = false,
}: RiderListProps) {
    const [search, setSearch] = useState('');

    const filtered = riders.filter(
        (r) =>
            r.name.toLowerCase().includes(search.toLowerCase()) ||
            r.email.toLowerCase().includes(search.toLowerCase()) ||
            r.phone.toLowerCase().includes(search.toLowerCase())
    );

    const activeCount = riders.filter((r) => r.tracking_status.is_active).length;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border
                        border-gray-200 dark:border-gray-700 shadow-sm
                        flex flex-col overflow-hidden">

            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                    <Text size="sm" fw={600} className="text-gray-900 dark:text-white">
                        Riders
                    </Text>
                    <div className="flex items-center gap-2">
                        {activeCount > 0 && (
                            <Badge size="sm" color="green" variant="dot">
                                {activeCount} active
                            </Badge>
                        )}
                        <Badge size="sm" variant="light">
                            {riders.length} total
                        </Badge>
                    </div>
                </div>
                <TextInput
                    placeholder="Search riders…"
                    leftSection={<Search size={14} />}
                    value={search}
                    onChange={(e) => setSearch(e.currentTarget.value)}
                    size="xs"
                    radius="md"
                />
            </div>

            {/* List */}
            <ScrollArea style={{ maxHeight: 420 }}>
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader size="sm" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 px-4">
                        <User size={24} className="text-gray-300 mb-2" />
                        <Text size="xs" c="dimmed" ta="center">
                            {search ? 'No riders match your search' : 'No riders available'}
                        </Text>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {filtered.map((rider) => {
                            const isSelected = rider.id === selectedRiderId;
                            const isActive   = rider.tracking_status.is_active;

                            return (
                                <button
                                    key={rider.id}
                                    onClick={() => onRiderClick(rider.id)}
                                    className={`w-full text-left px-4 py-3 transition-colors
                                        hover:bg-gray-50 dark:hover:bg-gray-700/50
                                        ${isSelected
                                            ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-l-blue-500'
                                            : ''
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        {/* Avatar */}
                                        <div className={`w-8 h-8 rounded-full flex-shrink-0
                                            flex items-center justify-center text-white text-xs font-bold
                                            ${isActive
                                                ? 'bg-green-500'
                                                : 'bg-gray-400'
                                            }`}
                                        >
                                            {rider.name.charAt(0).toUpperCase()}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <Text
                                                    size="xs"
                                                    fw={600}
                                                    className="text-gray-900 dark:text-white truncate"
                                                >
                                                    {rider.name}
                                                </Text>
                                                {isActive && (
                                                    <span className="w-1.5 h-1.5 rounded-full
                                                                     bg-green-500 animate-pulse flex-shrink-0" />
                                                )}
                                            </div>

                                            {rider.current_campaign && (
                                                <Text
                                                    size="xs"
                                                    c="blue"
                                                    className="truncate mt-0.5"
                                                >
                                                    {rider.current_campaign.name}
                                                </Text>
                                            )}

                                            <div className="flex items-center gap-1 mt-1">
                                                <Clock size={10} className="text-gray-400" />
                                                <Text size="xs" c="dimmed">
                                                    {rider.tracking_status.last_seen_human}
                                                </Text>
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}