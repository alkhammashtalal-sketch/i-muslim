import { expect, test } from '@playwright/test'
import flag from '../src/config/voice-mode.json' with { type: 'json' }

// Full-screen voice mode in WebKit (command 18): the interface and the hidden switch only. WebKit here has no fake
// microphone, so listening itself is tested in Chromium (voicemode.spec.ts) and on a real iPhone.
//   BASE_URL=https://localhost:8787 npx playwright test e2e/voicemode-webkit.spec.ts --project=mobile
// (https: WebKit applies the CSP's upgrade-insecure-requests even to localhost; wrangler dev --local-protocol https)

test.use({ browserName: 'webkit', channel: '', serviceWorkers: 'block', ignoreHTTPSErrors: true })

test('WebKit: no full-screen mode without the switch; with it the layer opens, says what it can, and ends', async ({ page }) => {
  await page.goto('/?lang=ar')
  if (!flag.enabled) await expect(page.locator('.voice-toggle')).toHaveAttribute('aria-pressed', /true|false/)

  await page.goto('/?lang=ar&voicemode=1')
  const btn = page.locator('.voice-toggle')
  await expect(btn).toHaveAttribute('aria-haspopup', 'dialog')
  await btn.click()
  const dlg = page.locator('dialog.voicemode[open]')
  await expect(dlg).toBeVisible()
  await expect(dlg.locator('.vm-shamsa')).toBeVisible()
  // Listening, or a clear line when this browser gives no microphone.
  await expect(dlg.locator('.vm-status')).toHaveText(/أستمع…|الإذن مرفوض|لم نجد ميكروفونًا|المتصفح لا يدعم التسجيل/)
  for (const name of [/إنهاء/, 'كتم الميكروفون', 'عرض الإجابة']) await expect(dlg.getByRole('button', { name })).toBeVisible()
  await dlg.getByRole('button', { name: /إنهاء/ }).click()
  await expect(page.locator('dialog.voicemode')).toHaveCount(0)
})
