import React from 'react';
import { Badge } from '@mantine/core';
import { Check, AlertCircle, Menu } from 'lucide-react';

interface RiderHeaderProps {
    onMenuClick: () => void;
    rider?: {
        id?: number;
        status?: string;
    };
}

const RiderHeader: React.FC<RiderHeaderProps> = ({ onMenuClick, rider }) => {
    const hasProfile = !!rider?.id;
    const isApproved = rider?.status === 'approved';
    const isPending = rider?.status === 'pending';

    return (
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-20">
            <div className="px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={onMenuClick}
                            className="lg:hidden p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                            <Menu size={20} />
                        </button>
                    </div>

                    <div className="flex items-center space-x-3">
                        <Badge
                            color={isApproved ? 'green' : isPending ? 'yellow' : 'gray'}
                            variant="light"
                            leftSection={isApproved ? <Check size={12} /> : <AlertCircle size={12} />}
                            className="hidden sm:flex"
                        >
                            {hasProfile && rider?.status
                                ? rider.status.charAt(0).toUpperCase() + rider.status.slice(1)
                                : 'Incomplete Profile'
                            }
                        </Badge>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RiderHeader;