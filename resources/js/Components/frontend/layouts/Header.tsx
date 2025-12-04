import React from 'react';
import { Button, Menu, Badge } from '@mantine/core';
import {
    Menu as MenuIcon,
    Plus,
    ChevronDown,
    Target,
    Image as ImageIcon,
    Users,
    FileText,
    Bell,
    Check,
    AlertCircle,
} from 'lucide-react';

interface Advertiser {
    id?: number;
    company_name?: string;
    business_registration?: string;
    address?: string;
    status?: string;
}

interface HeaderProps {
    onMenuClick: () => void;
    user?: Advertiser;
    showCreateMenu?: boolean;
}

export default function Header({ onMenuClick, user, showCreateMenu = true }: HeaderProps) {
    const hasProfile = !!user?.id;
    const isApproved = user?.status === 'approved';
    const isPending = user?.status === 'pending';
    const isRejected = user?.status === 'rejected';

    return (
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-20">
            <div className="px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Left Side */}
                    <div className="flex items-center space-x-4">
                        {/* Mobile Menu Button */}
                        <button
                            onClick={onMenuClick}
                            className="lg:hidden p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                            <MenuIcon size={20} />
                        </button>

                        {/* Create New Dropdown */}
                        {showCreateMenu && isApproved && (
                            <Menu shadow="md" width={220}>
                                <Menu.Target>
                                    <Button
                                        leftSection={<Plus size={18} />}
                                        rightSection={<ChevronDown size={16} />}
                                        styles={{
                                            root: {
                                                backgroundColor: '#f79122',
                                                '&:hover': {
                                                    backgroundColor: '#e07d15',
                                                },
                                            },
                                        }}
                                        variant="filled"
                                    >
                                        Create New
                                    </Button>
                                </Menu.Target>

                                <Menu.Dropdown>
                                    <Menu.Label>Campaign Management</Menu.Label>
                                    <Menu.Item leftSection={<Target size={16} />}>
                                        New Campaign
                                    </Menu.Item>
                                    {/* <Menu.Item leftSection={<ImageIcon size={16} />}>
                                        Upload Creative
                                    </Menu.Item> */}

                                    <Menu.Divider />

                                    <Menu.Label>Other Actions</Menu.Label>
                                    <Menu.Item leftSection={<Users size={16} />}>
                                        Connect Rider
                                    </Menu.Item>
                                    <Menu.Item leftSection={<FileText size={16} />}>
                                        Generate Report
                                    </Menu.Item>
                                </Menu.Dropdown>
                            </Menu>
                        )}
                    </div>

                    {/* Right Side */}
                    <div className="flex items-center space-x-3">
                        <Button variant="subtle" color="gray" className="hidden sm:flex">
                            <Bell size={18} />
                        </Button>

                        {/* Status Badge */}
                        <Badge
                            color={isApproved ? 'green' : isPending ? 'yellow' : isRejected ? 'red' : 'gray'}
                            variant="light"
                            leftSection={
                                isApproved ? <Check size={12} /> :
                                    isPending ? <AlertCircle size={12} /> :
                                        <AlertCircle size={12} />
                            }
                            className="hidden sm:flex"
                        >
                            {hasProfile && user.status
                                ? user?.status?.charAt(0).toUpperCase() + user?.status?.slice(1)
                                : 'Not Completed'
                            }
                        </Badge>
                    </div>
                </div>
            </div>
        </div>
    );
}