import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { VitePWA, type ManifestOptions } from 'vite-plugin-pwa'
import { checkApiBase, NATIVE_API_DEFAULT, nativeCsp, withCspMeta } from './native-build.ts'
// The web app's manifest; capacitor.config.ts takes the app's name under the icon from its short_name.
import manifest from './pwa-manifest.json' with { type: 'json' }
import pkg from './package.json' with { type: 'json' }

const here = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // `npm run build:native` (vite build --mode native): the iOS/Android app (Capacitor; reply 0033 §ب). The interface is
  // inside the app, /api/* goes to the absolute VITE_API_BASE, the CSP travels in index.html, and there is no service
  // worker and no web manifest. Every other mode is the web build, unchanged: relative /api/*, vite-plugin-pwa.
  const native = mode === 'native'
  const env = loadEnv(mode, here, 'VITE_')
  const frozen = fs.existsSync(path.resolve(here, '../FREEZE'))
  const apiBase = native ? checkApiBase(env.VITE_API_BASE || process.env.VITE_API_BASE || NATIVE_API_DEFAULT, frozen) : ''

  const nativeShell: Plugin = {
    name: 'muslim-native-shell',
    transformIndexHtml: {
      order: 'post',
      handler: (html) => withCspMeta(html, nativeCsp(fs.readFileSync(path.resolve(here, 'public/_headers'), 'utf8'), apiBase)),
    },
  }

  return {
    define: {
      // Compile-time switch: demo data is only built in with VITE_ASK_MODE=mock (local development).
      __ASK_MOCK__: JSON.stringify(process.env.VITE_ASK_MODE === 'mock'),
      // '' on the web; the Worker's origin in the native build (web/src/api/base.ts).
      __API_BASE__: JSON.stringify(apiBase),
      // «الإصدار 1.0.0» in «عن التطبيق» and the settings (reply 0042), read from the build.
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
    // Fonts stay separate files: the CSP allows fonts from this origin only (no data: URLs).
    build: { assetsInlineLimit: (file: string) => (/\.(woff2?|ttf|otf)$/.test(file) ? false : undefined) },
    // `VITE_API_PROXY=https://… npm run dev` reads /api from a running Worker.
    server: process.env.VITE_API_PROXY ? { proxy: { '/api': { target: process.env.VITE_API_PROXY, changeOrigin: true } } } : undefined,
    plugins: [
      react(),
      native
        ? nativeShell
        : VitePWA({
            registerType: 'autoUpdate',
            workbox: {
              // Interface and self-hosted fonts work offline, the reciters' two photos too (jpg, 36 KB; reply 0047 §1).
              // /api/ask is a POST and is never cached.
              globPatterns: ['**/*.{js,css,html,woff2,png,jpg,svg,webmanifest}'],
              // The large icons are fetched by the browser when installing; precaching them would add ~650 KB to the first visit.
              globIgnores: ['**/icons/icon-1024.png', '**/icons/icon-512.png', '**/icons/icon-maskable-512.png'],
              navigateFallbackDenylist: [/^\/api\//],
              // Prayer bells and the portion reminder (reply 0032 part E): the push and notification-click handlers.
              importScripts: ['push-sw.js'],
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
            includeAssets: ['icons/icon-192.png', 'icons/apple-touch-icon.png'],
            includeManifestIcons: false,
            manifest: manifest as Partial<ManifestOptions>,
          }),
    ],
  }
})
