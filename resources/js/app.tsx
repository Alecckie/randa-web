import '../css/app.css';
import './bootstrap';

import { createInertiaApp, router } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { MantineProvider, createTheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { DatesProvider } from '@mantine/dates';
import { showSuccessToast, showErrorToast, showWarningToast } from '@/utils/toast';
import type { FlashProps } from '@/types';

import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';
import 'leaflet/dist/leaflet.css';
import { configureEcho } from '@laravel/echo-react';
import './utils/echo';



configureEcho({
    broadcaster: 'reverb',
});

// Global flash-message -> toast bridge. Backend controllers flash
// 'success' / 'error' / 'warning' onto the session; every Inertia visit
// shares that data back as page.props.flash, so we surface it here as
// an auto-dismissing top-right toast instead of each page rendering its
// own inline banner.
function showFlashToasts(flash: FlashProps | undefined | null) {
    if (!flash) return;

    if (flash.success) showSuccessToast(flash.success);
    if (flash.error) showErrorToast(flash.error);
    if (flash.warning) showWarningToast(flash.warning);
}

router.on('success', (event) => {
    const page = event.detail.page as { props?: { flash?: FlashProps } };
    showFlashToasts(page.props?.flash);
});

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';
const theme = createTheme({
    primaryColor: 'orange',
    fontFamily: 'Inter, system-ui, sans-serif',
    headings: {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontWeight: '600',
    },
    colors: {
        orange: [
            '#fff7ed',
            '#ffedd5',
            '#fed7aa',
            '#fdba74',
            '#fb923c',
            '#f97316',
            '#ea580c',
            '#c2410c',
            '#9a3412',
            '#7c2d12',
        ],
    },
    components: {
        Button: {
            defaultProps: {
                size: 'sm',
            },
        },
        Card: {
            defaultProps: {
                padding: 'lg',
                radius: 'md',
                shadow: 'sm',
            },
        },
    },
});
createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.tsx`,
            import.meta.glob('./Pages/**/*.tsx'),
        ),
    setup({ el, App, props }) {
        if (import.meta.env.SSR) {
            hydrateRoot(el, <MantineProvider theme={theme} forceColorScheme="light">
                <Notifications position="top-right" zIndex={2077} /><App {...props} />
            </MantineProvider>);
            return;
        }

        createRoot(el).render(<MantineProvider theme={theme} forceColorScheme="light">
            <DatesProvider settings={{ locale: 'en', firstDayOfWeek: 0 }}>
                <Notifications position="top-right" zIndex={2077} /><App {...props} />
            </DatesProvider>
        </MantineProvider>);

        // Also surface flash toasts on a hard/initial page load (router.on('success')
        // only fires for client-side Inertia visits after this).
        showFlashToasts(props.initialPage?.props?.flash as FlashProps | undefined);
    },
    progress: {
        color: '#4B5563',
    },
});
