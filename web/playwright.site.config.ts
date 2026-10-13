import { defineConfig } from '@playwright/test'

// The privacy and support site (site/, reply 0033 §ج) on a local static server only, never a deployed link:
//   cd web && BASE_URL=http://localhost:8852 npx playwright test -c playwright.site.config.ts
// The server is site/scripts/serve.mjs (Workers Static Assets' URL rules and site/public/_headers, so the real CSP
// applies). The app's API is stubbed in the tests; nothing leaves the machine. SHOTS=dir saves each page, day and night.
const BASE_URL = process.env.BASE_URL ?? ''
const local = /^http:\/\/(localhost|127\.0\.0\.1):(\d+)\/?$/.exec(BASE_URL)
if (!local) throw new Error('Set BASE_URL to the local site server, e.g. BASE_URL=http://localhost:8852')

export default defineConfig({
  testDir: './e2e-site',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  webServer: { command: `node ../site/scripts/serve.mjs ${local[2]}`, url: `http://127.0.0.1:${local[2]}/`, reuseExistingServer: true },
  use: { baseURL: BASE_URL, channel: 'chrome', serviceWorkers: 'block' },
  projects: [
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
    { name: 'desktop', use: { viewport: { width: 1280, height: 900 } } },
  ],
})
