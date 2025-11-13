import { defineConfig, loadEnv } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // Load env file based on mode in the current working directory
    const env = loadEnv(mode, process.cwd(), '');
    
    return {
        plugins: [
            laravel({
                input: 'resources/js/app.tsx',
                ssr: 'resources/js/ssr.tsx',
                refresh: true,
            }),
            react(),
        ],
        define: {
            // Map REVERB variables to VITE_REVERB for frontend
            // Falls back to REVERB_ if VITE_REVERB_ is not set
            'import.meta.env.VITE_REVERB_APP_KEY': JSON.stringify(
                env.VITE_REVERB_APP_KEY || env.REVERB_APP_KEY
            ),
            'import.meta.env.VITE_REVERB_HOST': JSON.stringify(
                env.VITE_REVERB_HOST || env.REVERB_HOST
            ),
            'import.meta.env.VITE_REVERB_PORT': JSON.stringify(
                env.VITE_REVERB_PORT || env.REVERB_PORT
            ),
            'import.meta.env.VITE_REVERB_SCHEME': JSON.stringify(
                env.VITE_REVERB_SCHEME || env.REVERB_SCHEME
            ),
        },
    };
});