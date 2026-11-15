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
      includeAssets: ['icon.svg', 'fonts/Faruma.ttf'],
      manifest: {
        name: 'ދިވެހި ބަހުގެ މަރުކަޒު | Dhivehi Language Hub',
        short_name: 'ބަސްފޮތް',
        description: 'RTL Dhivehi Language Hub, Hyperlinked Radheef Reverse-Dictionary, Daily Words FSRS & Word Games',
        theme_color: '#0D6E6E',
        background_color: '#FAF7F2',
        display: 'standalone',
        dir: 'rtl',
        lang: 'dv',
        icons: [
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
