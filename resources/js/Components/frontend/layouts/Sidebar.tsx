import React from 'react';
import { Link } from '@inertiajs/react';
import { Text, Avatar, Stack } from '@mantine/core';
import {
    Building2,
    LogOut,
    LayoutDashboard,
    Target,
    BarChart3,
    Users,
    Image as ImageIcon,
    Wallet,
    Bell,
    Settings,
    HelpCircle,
} from 'lucide-react';

interface User {
    id: number;
    name: string;
    email: string;
    role: string;
}

interface SidebarProps {
    user: User;
    activeNav: string;
    onNavClick: (key: string) => void;
}

const navigationItems = [
    {
        group: 'Main',
        items: [
            { icon: <LayoutDashboard size={20} />, label: 'Dashboard', key: 'dashboard', href: route('advert-dash.index') },
            { icon: <Target size={20} />, label: 'Campaigns', key: 'campaigns', href: route('my-campaigns.index') },
            { icon: <BarChart3 size={20} />, label: 'Analytics', key: 'analytics', href: '/advertiser/analytics' },
        ]
    },
    {
        group: 'Resources',
        items: [
            { icon: <Users size={20} />, label: 'Find Riders', key: 'riders', href: '/advertiser/riders' },
            { icon: <ImageIcon size={20} />, label: 'Creatives', key: 'creatives', href: '/advertiser/creatives' },
            { icon: <Wallet size={20} />, label: 'Billing', key: 'billing', href: '/advertiser/billing' },
        ]
    },
    {
        group: 'Account',
        items: [
            { icon: <Bell size={20} />, label: 'Notifications', key: 'notifications', href: '/advertiser/notifications' },
            { icon: <Settings size={20} />, label: 'Settings', key: 'settings', href: '/advertiser/settings' },
            { icon: <HelpCircle size={20} />, label: 'Help & Support', key: 'support', href: '/advertiser/support' },
        ]
    },
];

export default function Sidebar({ user, activeNav, onNavClick }: SidebarProps) {
    return (
        <div className="h-full flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
            {/* Sidebar Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                        <span className="text-lg font-bold text-white">R</span>
                    </div>
                    <div>
                        <Text size="sm" fw={600} className="text-gray-900 dark:text-white">Randa</Text>
                        <Text size="xs" c="dimmed">Advertiser</Text>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto p-4">
                {navigationItems.map((section, idx) => (
                    <div key={idx} className="mb-6">
                        <Text size="xs" fw={600} c="dimmed" className="uppercase mb-2 px-3">
                            {section.group}
                        </Text>
                        <Stack gap="xs">
                            {section.items.map((item) => (
                                <Link
                                    key={item.key}
                                    href={item.href}
                                    onClick={() => onNavClick(item.key)}
                                    className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors w-full text-left ${
                                        activeNav === item.key
                                            ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400'
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                                    }`}
                                >
                                    {item.icon}
                                    <span className="text-sm font-medium">{item.label}</span>
                                </Link>
                            ))}
                        </Stack>
                    </div>
                ))}
            </div>

            {/* User Profile at Bottom */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3 mb-3">
                    <Avatar size="md" color="purple">
                        <Building2 size={20} />
                    </Avatar>
                    <div className="flex-1 min-w-0">
                        <Text size="sm" fw={600} className="truncate text-gray-900 dark:text-white">
                            {user?.name}
                        </Text>
                        <Text size="xs" c="dimmed" className="truncate">
                            {user?.email}
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
}