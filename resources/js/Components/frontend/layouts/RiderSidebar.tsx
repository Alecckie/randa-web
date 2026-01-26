import React from 'react';
import { Link } from '@inertiajs/react';
import { Text } from '@mantine/core';
import {
    Bike,
    Package,
    MapPinned,
    Calendar,
    TrendingUp,
    Clock,
    User,
    LogOut,
    AlertCircle,
} from 'lucide-react';

interface RiderSidebarProps {
    user: {
        id: number;
        name: string;
        email: string;
        phone?: string;
        role: string;
    };
    activeNav: string;
}

const RiderSidebar: React.FC<RiderSidebarProps> = ({ user, activeNav }) => {
    const navigationItems = [
        {
            group: 'Main',
            items: [
                { icon: <Package size={20} />, label: 'Dashboard', key: 'dashboard', href: '/rider/rider-dash' },
                { icon: <Bike size={20} />, label: 'My Campaigns', key: 'campaigns', href: '/rider/campaigns' },
                // { icon: <MapPinned size={20} />, label: 'GPS Tracking', key: 'tracking', href: '/rider/tracking' },
            ]
        },
        // {
        //     group: 'Activity',
        //     items: [
        //         { icon: <Calendar size={20} />, label: 'Schedule', key: 'schedule', href: '/rider/schedule' },
        //         { icon: <TrendingUp size={20} />, label: 'Earnings', key: 'earnings', href: '/rider/earnings' },
        //         { icon: <Clock size={20} />, label: 'Work History', key: 'history', href: '/rider/history' },
        //     ]
        // },
        {
            group: 'Account',
            items: [
                { icon: <User size={20} />, label: 'Profile', key: 'profile', href: '/rider/show-profile' },
                // { icon: <AlertCircle size={20} />, label: 'Help & Support', key: 'support', href: '/rider/support' },
            ]
        },
    ];

    const handleLogout = () => {
        // Using Inertia's post method for logout
        if (window.confirm('Are you sure you want to logout?')) {
            window.location.href = '/logout';
        }
    };

    return (
        <div className="h-full flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-[#f79122] rounded-xl flex items-center justify-center shadow-lg">
                        <span className="text-lg font-bold text-white">R</span>
                    </div>
                    <div>
                        <Text size="sm" fw={600} className="text-gray-900 dark:text-white">Randa</Text>
                        <Text size="xs" c="dimmed">Rider</Text>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                {navigationItems.map((section, idx) => (
                    <div key={idx} className="mb-6">
                        <Text size="xs" fw={600} c="dimmed" className="uppercase mb-2 px-3">
                            {section.group}
                        </Text>
                        <div className="space-y-1">
                            {section.items.map((item) => (
                                <Link
                                    key={item.key}
                                    href={item.href}
                                    className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors w-full text-left ${activeNav === item.key
                                        ? 'bg-orange-50 dark:bg-orange-900/20 text-[#f79122] dark:text-orange-400'
                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                                        }`}
                                >
                                    {item.icon}
                                    <span className="text-sm font-medium">{item.label}</span>
                                </Link>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
                        <Bike size={20} className="text-[#f79122] dark:text-orange-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <Text size="sm" fw={600} className="truncate text-gray-900 dark:text-white">
                            {user?.name || 'Rider'}
                        </Text>
                        <Text size="xs" c="dimmed" className="truncate">
                            {user?.email || 'rider@example.com'}
                        </Text>
                    </div>
                </div>
                <Link
                    method="post"
                    as="button"
                    href="/logout"
                    className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 transition-all duration-200"
                >
                    <LogOut size={16} />
                    <span className="text-sm font-medium">Logout</span>
                </Link>
            </div>
        </div>
    );
};

export default RiderSidebar;