import { defineConfig } from '@playwright/test'

// End-to-end tests against the live link (or BASE_URL). Uses the installed Google Chrome: no browser download.
//   npx playwright test            # live link
//   BASE_URL=http://localhost:8787 npx playwright test
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
  },
  projects: [
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
  ],
})
