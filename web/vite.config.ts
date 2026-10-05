import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // `VITE_API_PROXY=https://… npm run dev` reads /api from a running Worker.
  server: process.env.VITE_API_PROXY ? { proxy: { '/api': { target: process.env.VITE_API_PROXY, changeOrigin: true } } } : undefined,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // Quran reader: whatever was opened once stays readable offline.
            urlPattern: ({ url }) => /^\/api\/(suras$|sura\/\d+$|passage\/)/.test(url.pathname),
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
