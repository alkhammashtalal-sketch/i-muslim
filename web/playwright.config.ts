import { defineConfig } from '@playwright/test'

// End-to-end tests against the live link (or BASE_URL). Uses the installed Google Chrome: no browser download.
//   npx playwright test            # live link
//   BASE_URL=http://localhost:8787 npx playwright test
//   ADMIN_TOKEN=… npx playwright test   # skips the daily limit only while the admin routes are open
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.BASE_URL ?? 'https://i-muslim.alkhammashtalal.workers.dev',
    channel: 'chrome',
    locale: 'ar',
    colorScheme: 'light',
    serviceWorkers: 'allow',
    // Optional: with ADMIN_TOKEN set, questions skip the daily limit, but only while the Worker runs with
    // ADMIN_ENABLED=true (worker/src/ask.ts; unit-tested). Against the normal production build it changes nothing.
    ...(process.env.ADMIN_TOKEN ? { extraHTTPHeaders: { authorization: `Bearer ${process.env.ADMIN_TOKEN}` } } : {}),
  },
  projects: [
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
  ],
})
