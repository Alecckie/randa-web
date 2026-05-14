import { PropsWithChildren, ReactNode, useState } from 'react';
import { Head } from '@inertiajs/react';
import { Drawer } from '@mantine/core';
import Sidebar from '@/Components/frontend/layouts/Sidebar';
import TopBar from '@/Components/layouts/TopBar';

interface AdvertiserLayoutProps {
    title?: string;
    activeNav?: string;
    children: ReactNode;
}

export default function AdvertiserLayout({
    title,
    activeNav,
    children,
}: PropsWithChildren<AdvertiserLayoutProps>) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex">
            {title && <Head title={title} />}

            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:z-30">
                <Sidebar activeNav={activeNav} />
            </aside>

            {/* Mobile Drawer */}
            <Drawer
                opened={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                size="260px"
                padding={0}
                withCloseButton={false}
                zIndex={50}
            >
                <Sidebar activeNav={activeNav} />
            </Drawer>

            {/* Main */}
            <div className="flex-1 flex flex-col min-h-screen lg:ml-64">
                <TopBar onMenuClick={() => setSidebarOpen(true)} />
                <main className="flex-1 p-4 sm:p-6 lg:p-8">
                    {children}
                </main>
                <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-6 py-3">
                    <p className="text-xs text-gray-400 dark:text-gray-600 text-center">
                        © {new Date().getFullYear()} RANDA GPS Tracking System. All rights reserved.
                    </p>
                </footer>
            </div>
        </div>
    );
}
