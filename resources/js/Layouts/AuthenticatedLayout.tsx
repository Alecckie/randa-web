import { Link, usePage } from '@inertiajs/react';
import { PropsWithChildren, ReactNode, useState } from 'react';
import TopBar from '@/Components/layouts/TopBar';
import type { PageProps } from '@/types';

// ── Nav definition ────────────────────────────────────────────────────────────

interface NavItem {
    label: string;
    href: string;
    icon: ReactNode;
    exact?: boolean;
    badge?: number;
}

interface NavCounts {
    pending_riders?: number;
    pending_advertisers?: number;
    pending_payments?: number;
}

function SvgIcon({ d, size = 18 }: { d: string; size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d={d} />
        </svg>
    );
}

function adminNav(counts: NavCounts): NavItem[] {
    return [
        { label: 'Dashboard',      href: '/dashboard',                   icon: <SvgIcon d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />, exact: true },
        { label: 'Riders',         href: '/riders',                      icon: <SvgIcon d="M12 4a4 4 0 110 8 4 4 0 010-8zM6 20v-2a4 4 0 014-4h4a4 4 0 014 4v2" />, badge: counts.pending_riders },
        { label: 'Advertisers',    href: '/advertisers',                 icon: <SvgIcon d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />, badge: counts.pending_advertisers },
        { label: 'Campaigns',      href: '/campaigns',                   icon: <SvgIcon d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />, badge: counts.pending_payments },
        { label: 'Helmets',        href: '/helmets',                     icon: <SvgIcon d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z M12 6v6l4 2" /> },
        { label: 'Coverage Areas', href: '/coverage-areas',              icon: <SvgIcon d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /> },
        { label: 'Heatmap',        href: '/admin/tracking/heatmap-view', icon: <SvgIcon d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /> },
        { label: 'Analytics',      href: '/admin/campaigns/analytics',   icon: <SvgIcon d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /> },
        { label: 'Settings',       href: '/admin/settings',              icon: <SvgIcon d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" /> },
        { label: 'System Setup',   href: '/admin/system-setup',          icon: <SvgIcon d="M5 12a7 7 0 1114 0 7 7 0 01-14 0z M12 9v3l2 2 M4 4l2 2m12-2l-2 2" /> },
    ];
}

const riderNav: NavItem[] = [
    { label: 'Dashboard',   href: '/rider/rider-dash',  icon: <SvgIcon d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />, exact: true },
    { label: 'My Campaign', href: '/rider/campaigns',   icon: <SvgIcon d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" /> },
    { label: 'Check In',    href: '/rider/checkin',     icon: <SvgIcon d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /> },
    { label: 'Profile',     href: '/rider/show-profile',icon: <SvgIcon d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /> },
];

const advertiserNav: NavItem[] = [
    { label: 'Dashboard',       href: '/advert-dash',                icon: <SvgIcon d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />, exact: true },
    { label: 'My Campaigns',    href: '/my-campaigns',               icon: <SvgIcon d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" /> },
    { label: 'Analytics',       href: '/advertiser/analytics',       icon: <SvgIcon d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /> },
    { label: 'Heatmap',         href: '/advertiser/heatmap',         icon: <SvgIcon d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /> },
];

function navForRole(role?: string, counts: NavCounts = {}): NavItem[] {
    if (role === 'rider')      return riderNav;
    if (role === 'advertiser') return advertiserNav;
    return adminNav(counts);
}

// ── Sidebar content ───────────────────────────────────────────────────────────

function Badge({ count, active }: { count?: number; active: boolean }) {
    if (!count || count <= 0) return null;
    return (
        <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-tight ${
            active ? 'bg-white/25 text-white' : 'bg-red-100 text-red-600'
        }`}>
            {count > 99 ? '99+' : count}
        </span>
    );
}

function SidebarContent({ nav, currentPath }: { nav: NavItem[]; currentPath: string }) {
    const isActive = (item: NavItem) =>
        item.exact ? currentPath === item.href : currentPath.startsWith(item.href);

    return (
        <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="flex items-center gap-3 px-6 h-16 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
                <div className="w-8 h-8 bg-[#f79122] rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                    <span className="text-white font-bold text-sm">R</span>
                </div>
                <div>
                    <span className="font-bold text-lg text-gray-900 dark:text-white tracking-tight">RANDA</span>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 -mt-0.5 uppercase tracking-widest">GPS Platform</p>
                </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600 px-3 mb-2">
                    Navigation
                </p>
                {nav.map((item) => {
                    const active = isActive(item);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                                active
                                    ? 'bg-[#f79122] text-white shadow-sm shadow-orange-200 dark:shadow-none'
                                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                            }`}
                        >
                            <span className={`flex-shrink-0 transition-colors ${active ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'}`}>
                                {item.icon}
                            </span>
                            <span className="truncate">{item.label}</span>
                            {item.badge && item.badge > 0
                                ? <Badge count={item.badge} active={active} />
                                : active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/60 flex-shrink-0" />
                            }
                        </Link>
                    );
                })}
            </nav>

            {/* Version footer */}
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex-shrink-0">
                <p className="text-[11px] text-gray-400 dark:text-gray-600 text-center">
                    RANDA GPS Platform · v1.0
                </p>
            </div>
        </div>
    );
}

// ── Layout ────────────────────────────────────────────────────────────────────

interface AuthenticatedProps {
    header?: ReactNode;
    children: ReactNode;
}

export default function Authenticated({ header, children }: PropsWithChildren<AuthenticatedProps>) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { auth, nav_counts } = usePage<any>().props;
    const user = auth?.user;

    const [sidebarOpen, setSidebarOpen] = useState(false);

    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const nav = navForRole(user?.role, nav_counts ?? {});

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex">

            {/* ── Desktop Sidebar ── */}
            <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:z-30 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 shadow-sm">
                <SidebarContent nav={nav} currentPath={currentPath} />
            </aside>

            {/* ── Mobile Sidebar Overlay ── */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-40 lg:hidden">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={() => setSidebarOpen(false)}
                    />
                    {/* Panel */}
                    <aside className="absolute left-0 top-0 bottom-0 w-72 bg-white dark:bg-gray-900 shadow-2xl flex flex-col">
                        <SidebarContent nav={nav} currentPath={currentPath} />
                    </aside>
                </div>
            )}

            {/* ── Main area ── */}
            <div className="flex-1 flex flex-col min-h-screen min-w-0 lg:ml-64">

                {/* Top bar */}
                <TopBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

                {/* Page header strip (optional) */}
                {header && (
                    <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 sm:px-6 lg:px-8 py-4">
                        <div className="text-xl font-semibold text-gray-900 dark:text-white">
                            {header}
                        </div>
                    </div>
                )}

                {/* Content */}
                <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
                    {children}
                </main>

                {/* Footer */}
                <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-6 py-3">
                    <p className="text-xs text-gray-400 dark:text-gray-600 text-center">
                        © {new Date().getFullYear()} RANDA GPS Tracking System. All rights reserved.
                    </p>
                </footer>
            </div>
        </div>
    );
}
