import { useState, useEffect, useRef } from 'react';
import { initials } from '@/utils/formatting';
import { Link, usePage } from '@inertiajs/react';
import {
    User,
    Settings,
    LogOut,
    ChevronDown,
    Menu,
} from 'lucide-react';
import NotificationBell from '@/Components/layouts/NotificationBell';

interface TopBarProps {
    onMenuClick?: () => void;
}

const roleLabel: Record<string, string> = {
    admin:      'Administrator',
    advertiser: 'Advertiser',
    rider:      'Rider',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function TopBar({ onMenuClick }: TopBarProps) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { auth } = usePage<any>().props;
    const user = auth?.user;

    const [userOpen, setUserOpen] = useState(false);
    const userRef                 = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const userInitials = user?.name ? initials(user.name) : 'U';
    const userRole     = roleLabel[user?.role] ?? user?.role ?? '';

    return (
        <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40 flex items-center px-4 sm:px-6 shadow-sm flex-shrink-0">

            {/* ── Left ── */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Hamburger (mobile) */}
                {onMenuClick && (
                    <button
                        onClick={onMenuClick}
                        className="lg:hidden p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors flex-shrink-0"
                        aria-label="Open menu"
                    >
                        <Menu size={20} />
                    </button>
                )}

                {/* Logo – mobile only (sidebar hidden) */}
                <div className="lg:hidden flex items-center gap-2 flex-shrink-0">
                    <div className="w-7 h-7 bg-[#f79122] rounded-lg flex items-center justify-center shadow-sm">
                        <span className="text-white font-bold text-xs">R</span>
                    </div>
                    <span className="font-bold text-gray-900 dark:text-white tracking-tight">RANDA</span>
                </div>
            </div>

            {/* ── Right ── */}
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">

                {/* ── Notification Bell ── */}
                <NotificationBell />

                {/* Divider */}
                <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />

                {/* ── User Dropdown ── */}
                <div ref={userRef} className="relative">
                    <button
                        onClick={() => setUserOpen((v) => !v)}
                        className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                        aria-label="User menu"
                    >
                        {/* Avatar */}
                        <div className="w-8 h-8 rounded-full bg-[#f79122] flex items-center justify-center flex-shrink-0 shadow-sm">
                            <span className="text-white font-semibold text-xs">{userInitials}</span>
                        </div>
                        {/* Name + role (desktop) */}
                        <div className="hidden sm:block text-left leading-none">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{user?.name ?? 'User'}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 capitalize">{userRole}</p>
                        </div>
                        <ChevronDown
                            size={14}
                            className={`hidden sm:block text-gray-400 flex-shrink-0 transition-transform duration-150 ${userOpen ? 'rotate-180' : ''}`}
                        />
                    </button>

                    {userOpen && (
                        <div className="absolute right-0 top-full mt-2 w-60 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
                            {/* User card */}
                            <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-800 bg-orange-50 dark:bg-gray-800">
                                <div className="flex items-center gap-3">
                                    <div className="w-11 h-11 rounded-full bg-[#f79122] flex items-center justify-center flex-shrink-0 shadow">
                                        <span className="text-white font-bold text-sm">{userInitials}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user?.name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                                        <span className="inline-block mt-1 text-[10px] font-medium bg-[#f79122]/20 text-[#c26d0a] dark:bg-orange-900/30 dark:text-orange-300 px-1.5 py-0.5 rounded capitalize">
                                            {userRole}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Menu items */}
                            <div className="py-1.5">
                                <Link
                                    href="/profile/edit"
                                    onClick={() => setUserOpen(false)}
                                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 hover:text-[#f79122] transition-colors group"
                                >
                                    <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center group-hover:bg-orange-100 dark:group-hover:bg-orange-900/30 transition-colors">
                                        <User size={14} className="group-hover:text-[#f79122] transition-colors" />
                                    </div>
                                    <div>
                                        <p className="font-medium">My Profile</p>
                                        <p className="text-xs text-gray-400">View & edit your info</p>
                                    </div>
                                </Link>

                                <Link
                                    href="/profile/edit#password"
                                    onClick={() => setUserOpen(false)}
                                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 hover:text-[#f79122] transition-colors group"
                                >
                                    <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center group-hover:bg-orange-100 dark:group-hover:bg-orange-900/30 transition-colors">
                                        <Settings size={14} className="group-hover:text-[#f79122] transition-colors" />
                                    </div>
                                    <div>
                                        <p className="font-medium">Account Settings</p>
                                        <p className="text-xs text-gray-400">Password & security</p>
                                    </div>
                                </Link>
                            </div>

                            {/* Logout */}
                            <div className="border-t border-gray-100 dark:border-gray-800 py-1.5">
                                <Link
                                    href="/logout"
                                    method="post"
                                    as="button"
                                    onClick={() => setUserOpen(false)}
                                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 transition-colors group"
                                >
                                    <div className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center group-hover:bg-red-100 dark:group-hover:bg-red-900/30 transition-colors">
                                        <LogOut size={14} />
                                    </div>
                                    <div>
                                        <p className="font-medium">Sign Out</p>
                                        <p className="text-xs text-red-400">End your session</p>
                                    </div>
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
