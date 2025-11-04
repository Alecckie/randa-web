import { Link, usePage } from '@inertiajs/react';
import { PropsWithChildren, ReactNode, useState, useEffect, useRef } from 'react';
import type {
    User,
    NavigationItem,
    ApplicationLogoProps,
    DropdownProps,
    DropdownTriggerProps,
    DropdownContentProps,
    DropdownLinkProps,
    PageProps
} from '@/types';

const ApplicationLogo: React.FC<ApplicationLogoProps> = ({ className }) => (
    <div className={className}>
        <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">R</span>
            </div>
            <span className="font-bold text-xl text-gray-800 dark:text-white">RANDA</span>
        </div>
    </div>
);

const Dropdown: React.FC<DropdownProps> & {
    Trigger: React.FC<DropdownTriggerProps>;
    Content: React.FC<DropdownContentProps>;
    Link: React.FC<DropdownLinkProps>;
} = ({ children }) => {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <div onClick={() => setIsOpen(!isOpen)}>
                {children}
            </div>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                    {/* This is where the dropdown content gets rendered */}
                </div>
            )}
        </div>
    );
};

Dropdown.Trigger = ({ children }: DropdownTriggerProps) => (
    <div className="cursor-pointer">
        {children}
    </div>
);

Dropdown.Content = ({ children }: DropdownContentProps) => (
    <div className="py-1">
        {children}
    </div>
);

Dropdown.Link = ({ href, children, method = 'get', as = 'a' }: DropdownLinkProps) => (
    <Link
        href={href}
        method={method}
        as={as}
        className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
    >
        {children}
    </Link>
);

interface AuthenticatedProps {
    header?: ReactNode;
    children: ReactNode;
}

export default function Authenticated({
    header,
    children,
}: PropsWithChildren<AuthenticatedProps>) {
    const { auth } = usePage<PageProps>().props;
    const user: User = auth?.user || {
        id: 1,
        name: 'User',
        email: 'user@example.com',
        role: 'admin',
        is_active: true,
        created_at: '',
        updated_at: ''
    };
    const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
    const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);

    // Navigation items based on user role
    const getNavigationItems = (userRole: User['role']): NavigationItem[] => {
        const commonItems: NavigationItem[] = [
            { name: 'Dashboard', href: '/dashboard', icon: '📊' },
        ];

        const roleSpecificItems: Record<User['role'], NavigationItem[]> = {
            admin: [
                { name: 'Riders', href: '/riders', icon: '🏍️' },
                { name: 'Advertisers', href: '/advertisers', icon: '📢' },
                { name: 'Campaigns', href: '/campaigns', icon: '🎯' },
                { name: 'Helmets', href: '/helmets', icon: '🪖' },
                { name: 'Coverage Areas', href: '/coverage-areas', icon: '🪖' },
                { name: 'Payments', href: '/admin/payments', icon: '💰' },
                { name: 'Settings', href: '/admin/settings', icon: '⚙️' },
            ],
            rider: [
                { name: 'My Campaign', href: '/rider/campaign', icon: '🎯' },
                { name: 'Check In/Out', href: '/rider/checkin', icon: '📍' },
                { name: 'Wallet', href: '/rider/wallet', icon: '💰' },
                { name: 'Earnings', href: '/rider/earnings', icon: '💵' },
                { name: 'GPS Tracking', href: '/rider/tracking', icon: '🗺️' },
            ],
            advertiser: [
                { name: 'My Campaigns', href: '/advertiser/campaigns', icon: '🎯' },
                { name: 'Analytics', href: '/advertiser/analytics', icon: '📈' },
                { name: 'Create Campaign', href: '/advertiser/campaigns/create', icon: '➕' },
                { name: 'Reports', href: '/advertiser/reports', icon: '📋' },
                { name: 'Billing', href: '/advertiser/billing', icon: '💳' },
            ]
        };

        return [...commonItems, ...(roleSpecificItems[userRole] || [])];
    };

    const navigationItems = getNavigationItems(user.role);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
            {/* Sidebar */}
            <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-xl transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                } transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 lg:flex lg:flex-col`}>

                {/* Logo Section */}
                <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <ApplicationLogo className="flex-shrink-0" />
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                        aria-label="Close sidebar"
                    >
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* User Info */}
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-semibold text-sm">
                                {user.name?.charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {user.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                                {user.role}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                    {navigationItems.map((item) => (
                        <Link
                            key={item.name}
                            href={item.href}
                            className="group flex items-center px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-colors duration-200"
                        >
                            <span className="mr-3 text-lg flex-shrink-0">{item.icon}</span>
                            <span className="truncate">{item.name}</span>
                        </Link>
                    ))}
                </nav>

                {/* Bottom section */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                        RANDA GPS Tracking System
                        <br />
                        Version 1.0.0
                    </div>
                </div>
            </div>

            {/* Main Content Area - Fixed positioning */}
            <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
                {/* Header */}
                <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
                    <div className="px-4 sm:px-6 lg:px-8 py-4">
                        <div className="flex items-center justify-between">
                            {/* Mobile menu button */}
                            <div className="flex items-center space-x-4">
                                <button
                                    onClick={() => setSidebarOpen(true)}
                                    className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                                    aria-label="Open sidebar"
                                >
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                                    </svg>
                                </button>

                                {/* Header content */}
                                {header && (
                                    <div className="text-xl font-semibold text-gray-900 dark:text-white">
                                        {header}
                                    </div>
                                )}
                            </div>

                            {/* Header Actions */}
                            <div className="flex items-center space-x-2 sm:space-x-4">
                                {/* Search */}
                                <div className="hidden md:block">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Search..."
                                            className="w-48 lg:w-64 pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                                        />
                                        <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </div>
                                </div>

                                {/* Notifications */}
                                <button
                                    className="relative p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                                    aria-label="View notifications"
                                >
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-5 5v5H9v-5l-5-5h5V7a3 3 0 016 0v10z" />
                                    </svg>
                                    <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
                                </button>

                                {/* Settings */}
                                <button
                                    className="p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                                    aria-label="Settings"
                                >
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </button>

                                {/* Profile Dropdown */}
                                <div className="relative">
                                    <button
                                        onClick={() => setDropdownOpen(!dropdownOpen)}
                                        className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors duration-200"
                                        aria-label="Profile menu"
                                    >
                                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                                            <span className="text-white font-semibold text-xs">
                                                {user.name?.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                        <svg className={`h-4 w-4 text-gray-400 transform transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>

                                    {dropdownOpen && (
                                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                                            <div className="py-1">
                                                <Link
                                                    href="/profile/edit"
                                                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                                                >
                                                    Profile Settings
                                                </Link>
                                                
                                                <div className="border-t border-gray-200 dark:border-gray-600 my-1"></div>
                                                <Link
                                                    href="/logout"
                                                    method="post"
                                                    as="button"
                                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                                                >
                                                    Sign Out
                                                </Link>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex-1 p-4 sm:p-6 lg:p-8">
                    {children}
                </main>

                {/* Footer */}
                <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-auto">
                    <div className="px-4 sm:px-6 lg:px-8 py-4">
                        <div className="flex flex-col md:flex-row justify-between items-center space-y-2 md:space-y-0">
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                © 2025 RANDA GPS Tracking System. All rights reserved.
                            </div>
                            <div className="flex flex-wrap justify-center space-x-4 md:space-x-6 text-sm text-gray-600 dark:text-gray-400">
                               
                            </div>
                        </div>
                    </div>
                </footer>
            </div>

            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                ></div>
            )}
        </div>
    );
}