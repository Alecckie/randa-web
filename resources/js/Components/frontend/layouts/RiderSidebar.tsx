import { Link, usePage } from '@inertiajs/react';
import { Package, Bike, User } from 'lucide-react';

interface NavItem {
    icon: React.ReactNode;
    label: string;
    key: string;
    href: string;
    exact?: boolean;
    badge?: number;
}

interface RiderSidebarProps {
    activeNav?: string;
}

interface NavCounts {
    unread_notifications?: number;
}

function navigationSections(counts: NavCounts) {
    return [
        {
            group: 'Main',
            items: [
                { icon: <Package size={18} />, label: 'Dashboard',   key: 'dashboard', href: '/rider/rider-dash', exact: true, badge: counts.unread_notifications },
                { icon: <Bike size={18} />,    label: 'My Campaigns', key: 'campaigns', href: '/rider/campaigns' },
            ] as NavItem[],
        },
        {
            group: 'Account',
            items: [
                { icon: <User size={18} />, label: 'Profile', key: 'profile', href: '/rider/show-profile' },
            ] as NavItem[],
        },
    ];
}

function NavBadge({ count, active }: { count?: number; active: boolean }) {
    if (!count || count <= 0) return null;
    return (
        <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-tight ${
            active ? 'bg-white/25 text-white' : 'bg-red-100 text-red-600'
        }`}>
            {count > 99 ? '99+' : count}
        </span>
    );
}

export default function RiderSidebar({ activeNav }: RiderSidebarProps) {
    const { nav_counts } = usePage().props as { nav_counts?: NavCounts };
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const sections = navigationSections(nav_counts ?? {});

    const isActive = (item: NavItem) =>
        activeNav === item.key ||
        (item.exact ? currentPath === item.href : currentPath.startsWith(item.href));

    return (
        <div className="h-full flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">

            {/* Logo */}
            <div className="flex items-center gap-3 px-5 h-16 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
                <div className="w-8 h-8 bg-[#f79122] rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                    <span className="text-white font-bold text-sm">R</span>
                </div>
                <div>
                    <span className="font-bold text-lg text-gray-900 dark:text-white tracking-tight">RANDA</span>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 -mt-0.5 uppercase tracking-widest">GPS Platform</p>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
                {sections.map((section, idx) => (
                    <div key={idx}>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600 px-3 mb-2">
                            {section.group}
                        </p>
                        <div className="space-y-0.5">
                            {section.items.map((item) => {
                                const active = isActive(item);
                                return (
                                    <Link
                                        key={item.key}
                                        href={item.href}
                                        className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                                            active
                                                ? 'bg-[#f79122] text-white shadow-sm shadow-orange-200 dark:shadow-none'
                                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                        }`}
                                    >
                                        <span className={`flex-shrink-0 transition-colors ${
                                            active ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'
                                        }`}>
                                            {item.icon}
                                        </span>
                                        <span className="truncate">{item.label}</span>
                                        <NavBadge count={item.badge} active={active} />
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 flex-shrink-0">
                <p className="text-[11px] text-gray-400 dark:text-gray-600 text-center">
                    RANDA GPS Platform · v1.0
                </p>
            </div>
        </div>
    );
}
