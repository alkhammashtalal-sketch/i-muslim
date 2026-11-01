import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { VitePWA, type ManifestOptions } from 'vite-plugin-pwa'
import { checkApiBase, NATIVE_API_DEFAULT, nativeCsp, nativeEntryHtml, serverOnly, withCspMeta } from './native-build.ts'
// The web app's manifest; capacitor.config.ts takes the app's name under the icon from its short_name.
import manifest from './pwa-manifest.json' with { type: 'json' }
import pkg from './package.json' with { type: 'json' }

const here = path.dirname(fileURLToPath(import.meta.url))
// The modules only a lesson page loads (web/src/lessons/registry.ts): each lesson's folder, the page host, and three.js.
const LESSON_CHUNK = /[\\/]src[\\/]lessons[\\/](?:[a-z]+[\\/]|lesson-host|chrome)|[\\/]node_modules[\\/]three[\\/]/

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // `npm run build:native` (vite build --mode native): the iOS/Android app (Capacitor; reply 0033 §ب). The interface is
  // inside the app, /api/* goes to the absolute VITE_API_BASE, the CSP travels in index.html, and there is no service
  // worker and no web manifest. Every other mode is the web build, unchanged: relative /api/*, vite-plugin-pwa.
  const native = mode === 'native'
  const env = loadEnv(mode, here, 'VITE_')
  const frozen = fs.existsSync(path.resolve(here, '../FREEZE'))
  const apiBase = native ? checkApiBase(env.VITE_API_BASE || process.env.VITE_API_BASE || NATIVE_API_DEFAULT, frozen) : ''

  // The native build's entry (add-on 0072-add25): src/main-native.tsx loads the device's storage, then main.tsx.
  const nativeEntry: Plugin = {
    name: 'muslim-native-entry',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => nativeEntryHtml(html),
    },
  }

  const nativeShell: Plugin = {
    name: 'muslim-native-shell',
    transformIndexHtml: {
      order: 'post',
      handler: (html) => withCspMeta(html, nativeCsp(fs.readFileSync(path.resolve(here, 'public/_headers'), 'utf8'), apiBase)),
    },
    // The alerts' recorded sounds stay on the server (native-build.ts serverOnly): out of the app's copy of public/.
    closeBundle() {
      const dir = path.resolve(here, 'dist/sounds')
      for (const f of fs.existsSync(dir) ? fs.readdirSync(dir) : []) if (serverOnly(`sounds/${f}`)) fs.rmSync(path.join(dir, f))
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
    build: {
      assetsInlineLimit: (file: string) => (/\.(woff2?|ttf|otf)$/.test(file) ? false : undefined),
      // The «علّمني» lessons' chunks (web/src/lessons: three.js, the companion and each lesson's texts) are named
      // lesson-*, so the service worker leaves them out of the first visit's precache and keeps them once opened.
      rolldownOptions: {
        output: {
          chunkFileNames: (chunk: { name: string; moduleIds: readonly string[] }) =>
            !chunk.name.startsWith('lesson-') && chunk.moduleIds.some((m) => LESSON_CHUNK.test(m)) ? 'assets/lesson-[name]-[hash].js' : 'assets/[name]-[hash].js',
        },
      },
    },
    // `VITE_API_PROXY=https://… npm run dev` reads /api from a running Worker.
    server: process.env.VITE_API_PROXY ? { proxy: { '/api': { target: process.env.VITE_API_PROXY, changeOrigin: true } } } : undefined,
    plugins: [
      react(),
      native && nativeEntry,
      native
        ? nativeShell
        : VitePWA({
            registerType: 'autoUpdate',
            workbox: {
              // Interface and self-hosted fonts work offline, the reciters' two photos too (jpg, 36 KB; reply 0047 §1).
              // /api/ask is a POST and is never cached.
              globPatterns: ['**/*.{js,css,html,woff2,png,jpg,svg,webmanifest}'],
              // The large icons are fetched by the browser when installing; precaching them would add ~650 KB to the first visit.
              // The shamsa of the share images (620 KB, add-on 0072-add10 §3) is fetched when a sheet opens.
              // The app icons' thumbnails (add-on 0072-add31 §2) are the iPhone app's settings only; the web never shows them.
              globIgnores: ['**/app-icons/*.png', '**/icons/icon-1024.png', '**/icons/icon-512.png', '**/icons/icon-maskable-512.png', '**/assets/lesson-*', '**/art/medallion.png'],
              navigateFallbackDenylist: [/^\/api\//],
              // Prayer bells and the portion reminder (reply 0032 part E): the push and notification-click handlers.
              importScripts: ['push-sw.js'],
              runtimeCaching: [
                {
                  // The Complex's mushafs and their fonts (add-on 0072-add65, about 1.8 MB each): fetched when chosen
                  // (their size shown first), then kept for offline reading.
                  urlPattern: ({ url }) => /^\/uthmani\/(fonts\/[^/]+\.ttf|[a-z]+\.json)$/.test(url.pathname),
                  handler: 'CacheFirst',
                  options: { cacheName: 'uthmani', expiration: { maxEntries: 20 }, cacheableResponse: { statuses: [200] } },
                },
                {
                  // «حفص العثماني» (add-on 0072-add62 §4, 230 KB): not precached; once chosen, it stays for offline.
                  urlPattern: ({ url }) => /^\/assets\/UthmanicHafs1-Ver13-[^/]+\.ttf$/.test(url.pathname),
                  handler: 'CacheFirst',
                  options: { cacheName: 'quran-fonts', expiration: { maxEntries: 2 }, cacheableResponse: { statuses: [200] } },
                },
                {
                  // A lesson opened once (its chunks, named lesson-* above) opens again offline.
                  urlPattern: ({ url }) => /^\/assets\/lesson-[^/]+\.(js|css)$/.test(url.pathname),
                  handler: 'CacheFirst',
                  options: { cacheName: 'lessons', expiration: { maxEntries: 20 }, cacheableResponse: { statuses: [200] } },
                },
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
