import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page, type Request } from '@playwright/test'

// The privacy and support site (site/, reply 0033 §ج and add-on 0033-add1 §5), served locally by site/scripts/serve.mjs
// with its real headers (so the page's CSP is enforced); the app's /api/report is stubbed, nothing is sent anywhere.
//   cd web && BASE_URL=http://localhost:8852 npx playwright test -c playwright.site.config.ts
const API = 'https://i-muslim-next.alkhammashtalal.workers.dev/api/report'
const SHOTS = process.env.SHOTS
const PAGES = [
  { path: '/', lang: 'ar', other: '/en/' },
  { path: '/privacy', lang: 'ar', other: '/en/privacy' },
  { path: '/support', lang: 'ar', other: '/en/support' },
  { path: '/en/', lang: 'en', other: '/' },
  { path: '/en/privacy', lang: 'en', other: '/privacy' },
  { path: '/en/support', lang: 'en', other: '/support' },
]
const AR = { send: 'أرسل', sent: 'وصلت رسالتك، شكرًا لك.', failed: 'لم تصل الرسالة. تحقق من الاتصال وحاول مرة ثانية.', limited: 'وصلنا منك اليوم ما يكفي من الرسائل، شكرًا لك. يمكنك أن تكتب غدًا.' }
const EN = { send: 'Send', sent: 'Your message arrived, thank you.' }

/** Every request the page makes, and every CSP violation or console error, while `run` goes. */
async function watch(page: Page) {
  const requests: Request[] = []
  const problems: string[] = []
  page.on('request', (r) => requests.push(r))
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(m.text())
  })
  page.on('pageerror', (e) => problems.push(String(e)))
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) => console.error(`CSP ${e.violatedDirective} ${e.blockedURI}`))
  })
  return { requests, problems }
}

/** The stubbed report endpoint: answers `status`, keeps each body; CORS as the app's server will give it to the site. */
async function stubReport(page: Page, status = 200) {
  const bodies: unknown[] = []
  const meta: { headers: Record<string, string>; url: string }[] = []
  const cors = { 'access-control-allow-origin': new URL(page.url() === 'about:blank' ? process.env.BASE_URL! : page.url()).origin, 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'POST' }
  await page.route(API, async (r) => {
    if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: cors })
    bodies.push(r.request().postDataJSON())
    meta.push({ headers: await r.request().allHeaders(), url: r.request().url() })
    await r.fulfill({ status, headers: { ...cors, 'content-type': 'application/json' }, body: status === 200 ? '{"ok":true}' : '{"ok":false,"error":"rate_limited"}' })
  })
  return { bodies, meta }
}

for (const p of PAGES) {
  test(`${p.path}: loads from this site alone, under its CSP, in ${p.lang}`, async ({ page, baseURL }) => {
    const { requests, problems } = await watch(page)
    const res = await page.goto(p.path)
    expect(res?.status()).toBe(200)
    await page.evaluate(() => document.fonts.ready)
    expect(await page.locator('html').getAttribute('lang')).toBe(p.lang)
    expect(await page.locator('html').getAttribute('dir')).toBe(p.lang === 'ar' ? 'rtl' : 'ltr')
    // Only this origin: no third-party script, style, font or image.
    const origin = new URL(baseURL!).origin
    expect(requests.map((r) => r.url()).filter((u) => !u.startsWith(origin) && !u.startsWith('data:'))).toEqual([])
    expect(problems).toEqual([])
    // The interface font is the self-hosted one, and it loaded.
    const sample = p.lang === 'ar' ? 'سياسة' : 'Privacy'
    expect(await page.evaluate((t) => document.fonts.check('16px "IBM Plex Sans Arabic"', t), sample)).toBe(true)
    expect(requests.some((r) => /\/fonts\/ibm-plex-sans-arabic-/.test(r.url()))).toBe(true)
    // No horizontal scroll at phone width.
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    // The other language's page is one tap away.
    await page.locator('a.lang').click()
    await expect(page).toHaveURL(new RegExp(`${p.other.replace(/\//g, '\\/')}$`))
    if (SHOTS) {
      fs.mkdirSync(SHOTS, { recursive: true })
      const name = p.path.replace(/^\/$/, '/home').replace(/\/$/, '/home').replace(/\//g, '-').replace(/^-/, '')
      for (const scheme of ['light', 'dark'] as const) {
        await page.emulateMedia({ colorScheme: scheme })
        await page.goto(p.path)
        await page.evaluate(() => document.fonts.ready)
        await page.screenshot({ path: path.join(SHOTS, `${name}-${scheme}-${test.info().project.name}.png`), fullPage: true })
      }
    }
  })
}

type Run = { text: string; color: string; large: boolean; rects: { x: number; y: number; w: number; h: number }[] }

/** Every text on the page whose contrast with the pixels behind it is below WCAG AA (CLAUDE.md §8): 4.5:1, or 3:1 for
 *  large text (24 px, or 18.66 px bold). The texts are listed with their colours and boxes, then made transparent, and
 *  the page's own pixels behind each line are measured, so the sky's gradient counts where it lies under the text. */
async function lowContrast(page: Page): Promise<string[]> {
  await page.evaluate(() => document.fonts.ready)
  const runs: Run[] = await page.evaluate(() => {
    // All that the page can show: every answer open, and every message of the form.
    for (const d of document.querySelectorAll('details')) d.open = true
    for (const m of document.querySelectorAll<HTMLElement>('.msg')) m.hidden = false
    const out: Run[] = []
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement!
      // A disabled control is exempt (WCAG 1.4.3); the screen-reader name is not drawn.
      if (!n.textContent!.trim() || el.closest('.sr-only, [disabled], noscript, [hidden]')) continue
      const cs = getComputedStyle(el)
      if (cs.visibility === 'hidden' || cs.display === 'none') continue
      const range = document.createRange()
      range.selectNodeContents(n)
      const rects = [...range.getClientRects()].filter((r) => r.width > 1 && r.height > 1).map((r) => ({ x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height }))
      if (!rects.length) continue
      const size = parseFloat(cs.fontSize)
      const weight = parseInt(cs.fontWeight, 10)
      out.push({ text: n.textContent!.trim().slice(0, 30), color: cs.color, large: size >= 24 || (size >= 18.66 && weight >= 700), rects })
    }
    // CSSOM, which the page's CSP allows: the text goes, its background stays.
    for (const el of [document.body, ...document.querySelectorAll<HTMLElement>('body *')]) {
      el.style.setProperty('color', 'transparent', 'important')
      el.style.setProperty('-webkit-text-fill-color', 'transparent', 'important')
    }
    return out
  })
  const png = (await page.screenshot({ fullPage: true, scale: 'css', animations: 'disabled' })).toString('base64')
  // The pixels are read on a blank page of the same browser (the site's CSP would rightly refuse a data: image).
  const blank = await page.context().newPage()
  try {
    return await blank.evaluate(
      async ({ png, runs }) => {
        const bytes = Uint8Array.from(atob(png), (c) => c.charCodeAt(0))
        const bmp = await createImageBitmap(new Blob([bytes], { type: 'image/png' }))
        const cx = new OffscreenCanvas(bmp.width, bmp.height).getContext('2d', { willReadFrequently: true })!
        cx.drawImage(bmp, 0, 0)
        const lin = (c: number) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
        const lum = (r: number, g: number, b: number) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
        const ratio = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
        const bad: string[] = []
        for (const run of runs) {
          const [r, g, b] = run.color.match(/[\d.]+/g)!.map(Number)
          const lt = lum(r, g, b)
          let worst = Infinity
          for (const rc of run.rects) {
            const x = Math.max(0, Math.floor(rc.x))
            const y = Math.max(0, Math.floor(rc.y))
            const w = Math.min(bmp.width - x, Math.ceil(rc.w))
            const h = Math.min(bmp.height - y, Math.ceil(rc.h))
            if (w < 1 || h < 1) continue
            const d = cx.getImageData(x, y, w, h).data
            for (let i = 0; i < d.length; i += 4) worst = Math.min(worst, ratio(lt, lum(d[i], d[i + 1], d[i + 2])))
          }
          if (worst < (run.large ? 3 : 4.5)) bad.push(`«${run.text}» ${run.color}: ${worst.toFixed(2)}:1`)
        }
        return bad
      },
      { png, runs },
    )
  } finally {
    await blank.close()
  }
}

for (const scheme of ['light', 'dark'] as const) {
  test(`every text is at least WCAG AA against what lies behind it, ${scheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme })
    const bad: string[] = []
    for (const p of [...PAGES.map((x) => x.path), '/nope', '/en/nope']) {
      await page.goto(p)
      for (const b of await lowContrast(page)) bad.push(`${p} ${b}`)
    }
    expect(bad).toEqual([])
  })
}

test('every link inside the site leads to a page, and the store links stay hidden until they exist', async ({ page, request, baseURL }) => {
  const origin = new URL(baseURL!).origin
  for (const p of PAGES) {
    await page.goto(p.path)
    const hrefs = await page.locator('a[href]').evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).href))
    for (const href of hrefs.filter((h) => h.startsWith(origin))) {
      const r = await request.get(href)
      expect(r.status(), `${p.path} → ${href}`).toBe(200)
    }
    // External links open without a referrer.
    for (const a of await page.locator('a[href^="http"]').all()) {
      const href = (await a.getAttribute('href'))!
      if (!href.startsWith(origin)) expect(await a.getAttribute('rel'), href).toContain('noreferrer')
    }
    for (const a of await page.locator('[data-store]').all()) await expect(a).toBeHidden()
  }
  expect((await request.get('/nope')).status()).toBe(404)
  expect((await request.get('/_headers')).status()).toBe(404)
})

test('support: the form sends {kind: "support", note} to the app server and thanks', async ({ page }) => {
  const { requests, problems } = await watch(page)
  await page.goto('/support')
  const { bodies, meta } = await stubReport(page)
  const box = page.getByLabel('رسالتك')
  const send = page.getByRole('button', { name: AR.send })
  await expect(send).toBeDisabled()
  await box.fill('   ')
  await expect(send).toBeDisabled()
  const typed = '  أقترح أن تضيفوا تذكيرًا لقراءة سورة الكهف يوم الجمعة.  '
  await box.fill(typed)
  await expect(page.locator('#note-count')).toHaveText(`${[...typed].length.toLocaleString('ar-u-nu-arab')} من ٥٠٠`)
  await expect(send).toBeEnabled()
  await send.click()
  await expect(page.getByRole('status')).toHaveText(AR.sent)
  await expect(page.locator('#contact')).toBeHidden()
  expect(bodies).toEqual([{ kind: 'support', note: 'أقترح أن تضيفوا تذكيرًا لقراءة سورة الكهف يوم الجمعة.' }])
  expect(meta[0].url).toBe(API)
  expect(meta[0].headers['content-type']).toBe('application/json')
  expect(meta[0].headers.cookie).toBeUndefined()
  expect(meta[0].headers.referer).toBeUndefined()
  expect(requests.filter((r) => r.url() === API && r.method() === 'POST')).toHaveLength(1)
  expect(problems).toEqual([])
})

test('support: 500 characters at most, counted as the server counts them', async ({ page }) => {
  await page.goto('/en/support')
  const box = page.getByLabel('Your message')
  await box.fill('ب'.repeat(620))
  expect((await box.inputValue()).length).toBe(500)
  await expect(page.locator('#note-count')).toHaveText('500 of 500')
  await expect(page.getByRole('button', { name: EN.send })).toBeEnabled()
})

test('support: the daily limit and a failed connection are said kindly, and the note stays', async ({ page }) => {
  await page.goto('/support')
  await stubReport(page, 429)
  const box = page.getByLabel('رسالتك')
  await box.fill('سؤال عن التطبيق')
  await page.getByRole('button', { name: AR.send }).click()
  await expect(page.getByRole('status')).toHaveText(AR.limited)
  await expect(box).toHaveValue('سؤال عن التطبيق')

  await page.unroute(API)
  await page.route(API, (r) => r.abort('internetdisconnected'))
  await page.getByRole('button', { name: AR.send }).click()
  await expect(page.getByRole('alert')).toHaveText(AR.failed)
  await expect(page.locator('#contact')).toBeVisible()
})

test('support in English sends the same shape', async ({ page }) => {
  await page.goto('/en/support')
  const { bodies } = await stubReport(page)
  await page.getByLabel('Your message').fill('Thank you for the app.')
  await page.getByRole('button', { name: EN.send }).click()
  await expect(page.getByRole('status')).toHaveText(EN.sent)
  expect(bodies).toEqual([{ kind: 'support', note: 'Thank you for the app.' }])
})
