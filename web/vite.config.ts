import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // Compile-time switch: demo data is only built in with VITE_ASK_MODE=mock (local development).
  define: { __ASK_MOCK__: JSON.stringify(process.env.VITE_ASK_MODE === 'mock') },
  // Fonts stay separate files: the CSP allows fonts from this origin only (no data: URLs).
  build: { assetsInlineLimit: (file: string) => (/\.(woff2?|ttf|otf)$/.test(file) ? false : undefined) },
  // `VITE_API_PROXY=https://… npm run dev` reads /api from a running Worker.
  server: process.env.VITE_API_PROXY ? { proxy: { '/api': { target: process.env.VITE_API_PROXY, changeOrigin: true } } } : undefined,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // Interface and self-hosted fonts work offline. /api/ask is a POST and is never cached.
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,webmanifest}'],
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // Library (Quran reader and aqeedah books): whatever was opened once stays readable offline.
            urlPattern: ({ url }) => /^\/api\/(suras$|sura\/\d+$|passage\/|books$|book\/[a-z]+$)/.test(url.pathname),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'reader-api',
              expiration: { maxEntries: 800, maxAgeSeconds: 60 * 60 * 24 * 60 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'i مسلم',
        short_name: 'i مسلم',
        description:
          'مساعد معرفي مقيّد بالمصادر للتعريف بالإسلام وأركانه وعباداته',
        lang: 'ar',
        dir: 'rtl',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#F6F0E1',
        theme_color: '#F6F0E1',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/icon-1024.png',
            sizes: '1024x1024',
            type: 'image/png',
          },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
})
