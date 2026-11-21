import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'icon.svg',
        'apple-touch-icon.png',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'pwa-maskable-512x512.png',
        'fonts/Faruma.ttf',
      ],
      manifest: {
        name: 'Koshaaru',
        short_name: 'Koshaaru',
        description: 'Koshaaru (ކޮށާރު) — Offline-First Dhivehi Dictionary, Daily Words FSRS & Thaana Word Games',
        theme_color: '#0D6E6E',
        background_color: '#FAF7F2',
        display: 'standalone',
        dir: 'rtl',
        lang: 'dv',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 24 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,svg,ttf,woff2,json}'],
      },
    }),
  ],
  worker: {
    format: 'es',
  },
});
