import { useState, useEffect, useRef } from 'react';
import { Link, usePage, router } from '@inertiajs/react';
import axios from 'axios';
import {
    Bell,
    User,
    Settings,
    LogOut,
    ChevronDown,
    Menu,
    CheckCheck,
    ExternalLink,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AppNotification {
    id: string;
    data: {
        title: string;
        body: string;
        link?: string;
        type?: 'info' | 'success' | 'warning' | 'error';
    };
    read_at: string | null;
    created_at: string;
}

interface TopBarProps {
    onMenuClick?: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

function notifDot(type?: string): string {
    const map: Record<string, string> = {
        success: 'bg-green-500',
        warning: 'bg-amber-500',
        error:   'bg-red-500',
        info:    'bg-blue-500',
    };
    return map[type ?? ''] ?? 'bg-blue-500';
}

function initials(name: string): string {
    return name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
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

    const [notifOpen, setNotifOpen]         = useState(false);
    const [userOpen, setUserOpen]           = useState(false);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [unread, setUnread]               = useState(0);

    const notifRef = useRef<HTMLDivElement>(null);
    const userRef  = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
            if (userRef.current  && !userRef.current.contains(e.target as Node))  setUserOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Fetch + poll notifications
    const fetchNotifications = async () => {
        try {
            const res = await axios.get('/notifications');
            setNotifications(res.data.notifications ?? []);
            setUnread(res.data.unread_count ?? 0);
        } catch {
            // silent – network may not be ready
        }
    };

    useEffect(() => {
        fetchNotifications();
        const id = setInterval(fetchNotifications, 60_000);
        return () => clearInterval(id);
    }, []);

    const markRead = async (id: string) => {
        try {
            await axios.post(`/notifications/${id}/read`);
            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
            );
            setUnread((c) => Math.max(0, c - 1));
        } catch { /* ignore */ }
    };

    const markAllRead = async () => {
        try {
            await axios.post('/notifications/read-all');
            setNotifications((prev) => prev.map((n) => ({ ...n, read_at: new Date().toISOString() })));
            setUnread(0);
        } catch { /* ignore */ }
    };

    const handleNotifClick = (n: AppNotification) => {
        if (!n.read_at) markRead(n.id);
        if (n.data.link) {
            setNotifOpen(false);
            router.visit(n.data.link);
        }
    };

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
                        className="lg:hidden p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
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
                <div ref={notifRef} className="relative">
                    <button
                        onClick={() => { setNotifOpen((v) => !v); setUserOpen(false); }}
                        className="relative p-2.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
                        aria-label="Notifications"
                    >
                        <Bell size={20} />
                        {unread > 0 && (
                            <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center px-0.5 shadow">
                                {unread > 99 ? '99+' : unread}
                            </span>
                        )}
                    </button>

                    {notifOpen && (
                        <div className="absolute right-0 top-full mt-2 w-[340px] sm:w-[380px] bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
                            {/* Header */}
                            <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 dark:border-gray-800">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Notifications</h3>
                                    {unread > 0 && (
                                        <span className="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 text-xs font-bold px-1.5 py-0.5 rounded-full">
                                            {unread}
                                        </span>
                                    )}
                                </div>
                                {unread > 0 && (
                                    <button
                                        onClick={markAllRead}
                                        className="flex items-center gap-1 text-xs text-[#f79122] hover:text-orange-600 font-medium transition-colors"
                                    >
                                        <CheckCheck size={13} />
                                        Mark all read
                                    </button>
                                )}
                            </div>

                            {/* List */}
                            <div className="max-h-[400px] overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                                {notifications.length === 0 ? (
                                    <div className="py-12 text-center">
                                        <Bell size={28} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                                        <p className="text-sm text-gray-400 dark:text-gray-500">You're all caught up!</p>
                                    </div>
                                ) : (
                                    notifications.map((n) => (
                                        <button
                                            key={n.id}
                                            onClick={() => handleNotifClick(n)}
                                            className={`w-full text-left px-4 py-3.5 flex gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                                                !n.read_at ? 'bg-orange-50/60 dark:bg-orange-900/10' : ''
                                            }`}
                                        >
                                            {/* Colored dot */}
                                            <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${notifDot(n.data.type)}`} />
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm leading-snug ${
                                                    !n.read_at
                                                        ? 'font-semibold text-gray-900 dark:text-white'
                                                        : 'font-medium text-gray-600 dark:text-gray-300'
                                                }`}>
                                                    {n.data.title}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                                                    {n.data.body}
                                                </p>
                                                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                                                    {timeAgo(n.created_at)}
                                                </p>
                                            </div>
                                            {n.data.link && (
                                                <ExternalLink size={13} className="text-gray-300 dark:text-gray-600 flex-shrink-0 mt-1" />
                                            )}
                                        </button>
                                    ))
                                )}
                            </div>

                            {/* Footer */}
                            {notifications.length > 0 && (
                                <div className="px-4 py-2.5 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                                    <p className="text-xs text-gray-400 text-center">
                                        Showing {notifications.length} most recent notifications
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Divider */}
                <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />

                {/* ── User Dropdown ── */}
                <div ref={userRef} className="relative">
                    <button
                        onClick={() => { setUserOpen((v) => !v); setNotifOpen(false); }}
                        className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        aria-label="User menu"
                    >
                        {/* Avatar */}
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#f79122] to-[#e07a1a] flex items-center justify-center flex-shrink-0 shadow-sm">
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
                            <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-800 dark:to-gray-800">
                                <div className="flex items-center gap-3">
                                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#f79122] to-[#e07a1a] flex items-center justify-center flex-shrink-0 shadow">
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
                                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-[#f79122] transition-colors group"
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
                                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-[#f79122] transition-colors group"
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
                                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors group"
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
