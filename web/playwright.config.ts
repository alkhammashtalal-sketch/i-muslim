import { defineConfig } from '@playwright/test'

// End-to-end tests against BASE_URL, which must be given. Uses the installed Google Chrome: no browser download.
//   BASE_URL=http://localhost:8787 npx playwright test
// Never the live link (CLAUDE.md §13: no request to the live worker, no smoke tests on it): it used to be the default,
// and on 13 October a run without BASE_URL opened its pages (reply 0043 ج; STATUS 21:15). Refused here.
const BASE_URL = process.env.BASE_URL ?? ''
if (!/^https?:\/\//.test(BASE_URL) || /\/\/i-muslim\.alkhammashtalal\.workers\.dev/.test(BASE_URL)) {
  throw new Error('BASE_URL: give a local or next address; the live link is refused (CLAUDE.md §13)')
}
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
    baseURL: BASE_URL,
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
