import { useState, useEffect, useRef } from 'react';
import { router } from '@inertiajs/react';
import { timeAgo } from '@/utils/formatting';
import axios from 'axios';
import { Bell, CheckCheck, ExternalLink } from 'lucide-react';

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

function dot(type?: string): string {
    const map: Record<string, string> = {
        success: 'bg-green-500',
        warning: 'bg-amber-500',
        error:   'bg-red-500',
        info:    'bg-blue-500',
    };
    return map[type ?? ''] ?? 'bg-blue-500';
}

export default function NotificationBell() {
    const [open, setOpen]                    = useState(false);
    const [notifications, setNotifications]  = useState<AppNotification[]>([]);
    const [unread, setUnread]                = useState(0);
    const ref                                = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const fetch = async () => {
        try {
            const res = await axios.get('/notifications');
            setNotifications(res.data.notifications ?? []);
            setUnread(res.data.unread_count ?? 0);
        } catch { /* silent */ }
    };

    useEffect(() => {
        fetch();
        const id = setInterval(fetch, 60_000);
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

    const handleClick = (n: AppNotification) => {
        if (!n.read_at) markRead(n.id);
        if (n.data.link) {
            setOpen(false);
            router.visit(n.data.link);
        }
    };

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen((v) => !v)}
                className="relative p-2.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                aria-label="Notifications"
            >
                <Bell size={20} />
                {unread > 0 && (
                    <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center px-0.5 shadow">
                        {unread > 99 ? '99+' : unread}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-2 w-[340px] sm:w-[380px] bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Notifications</h3>
                            {unread > 0 && (
                                <span className="bg-red-100 text-red-600 text-xs font-bold px-1.5 py-0.5 rounded-full">
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
                                <Bell size={28} className="mx-auto text-gray-300 mb-2" />
                                <p className="text-sm text-gray-400">You're all caught up!</p>
                            </div>
                        ) : (
                            notifications.map((n) => (
                                <button
                                    key={n.id}
                                    onClick={() => handleClick(n)}
                                    className={`w-full text-left px-4 py-3.5 flex gap-3 hover:bg-gray-50 transition-colors ${
                                        !n.read_at ? 'bg-orange-50/60' : ''
                                    }`}
                                >
                                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${dot(n.data.type)}`} />
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm leading-snug ${
                                            !n.read_at ? 'font-semibold text-gray-900' : 'font-medium text-gray-600'
                                        }`}>
                                            {n.data.title}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.data.body}</p>
                                        <p className="text-[11px] text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
                                    </div>
                                    {n.data.link && (
                                        <ExternalLink size={13} className="text-gray-300 flex-shrink-0 mt-1" />
                                    )}
                                </button>
                            ))
                        )}
                    </div>

                    {notifications.length > 0 && (
                        <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50">
                            <p className="text-xs text-gray-400 text-center">
                                Showing {notifications.length} most recent
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
