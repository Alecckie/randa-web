
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

// Make Pusher available globally for Echo
window.Pusher = Pusher;

// Get CSRF token from meta tag
const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

if (!csrfToken) {
    console.error('❌ CSRF token not found in meta tags. Add <meta name="csrf-token" content="{{ csrf_token() }}"> to your layout.');
}

// Get Pusher configuration from environment variables
const pusherConfig = {
    key: import.meta.env.VITE_PUSHER_APP_KEY,
    cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER,
    wsHost: import.meta.env.VITE_PUSHER_HOST,
    wsPort: import.meta.env.VITE_PUSHER_PORT ? parseInt(import.meta.env.VITE_PUSHER_PORT) : 443,
    wssPort: import.meta.env.VITE_PUSHER_PORT ? parseInt(import.meta.env.VITE_PUSHER_PORT) : 443,
    scheme: import.meta.env.VITE_PUSHER_SCHEME || 'https',
};

console.log('🔧 Initializing Echo with Pusher configuration:', {
    key: pusherConfig.key?.substring(0, 10) + '...',
    cluster: pusherConfig.cluster,
    wsHost: pusherConfig.wsHost || 'default',
    wsPort: pusherConfig.wsPort,
    scheme: pusherConfig.scheme,
});

// Validate required configuration
if (!pusherConfig.key) {
    console.error('❌ VITE_PUSHER_APP_KEY is not defined in .env file');
}

if (!pusherConfig.cluster) {
    console.error('❌ VITE_PUSHER_APP_CLUSTER is not defined in .env file');
}

// Initialize Laravel Echo with Pusher
try {
    window.Echo = new Echo({
        broadcaster: 'pusher',
        key: pusherConfig.key,
        cluster: pusherConfig.cluster,
        wsHost: pusherConfig.wsHost || undefined,
        wsPort: pusherConfig.wsPort,
        wssPort: pusherConfig.wssPort,
        forceTLS: pusherConfig.scheme === 'https',
        encrypted: true,
        disableStats: true,
        enabledTransports: ['ws', 'wss'],
        
        // Authentication endpoint for private/presence channels
        authEndpoint: '/broadcasting/auth',
        auth: {
            headers: {
                'X-CSRF-TOKEN': csrfToken || '',
                'Accept': 'application/json',
            },
        },
        
        // Optional: Enable for debugging
        // enableLogging: import.meta.env.DEV, // Only in development
    });

    console.log('✅ Laravel Echo initialized successfully with Pusher');

    // Optional: Add connection state logging
    if (import.meta.env.DEV) {
        window.Echo.connector.pusher.connection.bind('state_change', (states: any) => {
            console.log('🔌 Pusher connection state changed:', {
                previous: states.previous,
                current: states.current
            });
        });

        window.Echo.connector.pusher.connection.bind('connected', () => {
            console.log('✅ Pusher connected successfully');
        });

        window.Echo.connector.pusher.connection.bind('disconnected', () => {
            console.warn('⚠️ Pusher disconnected');
        });

        window.Echo.connector.pusher.connection.bind('error', (error: any) => {
            console.error('❌ Pusher connection error:', error);
        });
    }
} catch (error) {
    console.error('❌ Failed to initialize Laravel Echo:', error);
}

// Export Echo instance (optional, since it's on window)
export default window.Echo;