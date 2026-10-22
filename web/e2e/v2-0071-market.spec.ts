import { expect, test, type Page } from '@playwright/test'

// Add-on 0071-add13 (the competing app's ideas), items 3 and 7 as built; item 4 (the live countdown) was compared and
// left as it is, so its check here is that the next-prayer card stays still: no live region, no second ticking.
//   §3 the next occasion under the Hijri date: one line under the date card, outside the painting, to its evidence.
//   §7 the forbidden window of «now»: a line in the next-prayer card (the two short windows) and its row tagged.
// The place is Riyadh, set on the device; the clock is fixed. The hadith page reads the API the server proxies (v11).
//   VITE_API_PROXY=https://i-muslim-v11.alkhammashtalal.workers.dev npx vite --port 8852 --strictPort
//   BASE_URL=http://localhost:8852 npx playwright test e2e/v2-0071-market.spec.ts --project=mobile
test.use({ serviceWorkers: 'block' })
test.skip(!process.env.BASE_URL || /workers\.dev/.test(process.env.BASE_URL ?? ''), 'previews only, never a deployed link')

const RIYADH = { lat: 24.6877, lng: 46.7219, timeZone: 'Asia/Riyadh', name: 'الرياض', source: 'city' }
const frames = (page: Page) => page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))))

async function at(page: Page, iso: string, url: string) {
  await page.addInitScript((p) => localStorage.setItem('muslim.place.v1', JSON.stringify(p)), RIYADH)
  await page.clock.setFixedTime(new Date(iso))
  await page.goto(url)
}

/** WCAG contrast of an element's text against the page under it (its own and its ancestors' backgrounds). */
const contrast = (page: Page, sel: string) =>
  page.locator(sel).first().evaluate((el) => {
    const parse = (c: string) => (c.match(/[\d.]+/g) ?? []).map(Number)
    const lin = (v: number) => {
      const c = v / 255
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    }
    const lum = ([r, g, b]: number[]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
    let bg = [255, 255, 255]
    const layers: number[][] = []
    for (let e: Element | null = el; e; e = e.parentElement) {
      const c = parse(getComputedStyle(e).backgroundColor)
      if (c.length >= 3 && (c[3] ?? 1) > 0) {
        layers.push(c)
        if ((c[3] ?? 1) >= 1) break
      }
    }
    for (const l of layers.reverse()) bg = [0, 1, 2].map((k) => l[k] * (l[3] ?? 1) + bg[k] * (1 - (l[3] ?? 1)))
    const fg = parse(getComputedStyle(el).color)
    const [hi, lo] = [lum(fg), lum(bg)].sort((a, b) => b - a)
    return (hi + 0.05) / (lo + 0.05)
  })

test.describe('§3 the next occasion under the date card', () => {
  test('11 Jumada I 1448: «الأيام البيض · بعد يومين», under the card, outside the sky, to its hadith', async ({ page }) => {
    await at(page, '2026-10-22T09:00:00Z', '/?lang=ar&theme=light')
    const line = page.locator('a.dc-occasion')
    await expect(line.locator('.dc-occ-text')).toHaveText('الأيام البيض · بعد يومين')
    await expect(line).toHaveAttribute('href', '/hadith/10108')
    await expect(line).toHaveAttribute('data-occasion', 'white_days')
    // Its name for a screen reader: what it is, what it shows, where it goes.
    // (The line's parts are flex items, so a space may come before the full stop.)
    await expect(line).toHaveAccessibleName(/^المناسبة: الأيام البيض · بعد يومين ?\. يفتح دليلها من الحديث$/)
    await expect(page.locator('.dc-ayah-card')).toBeVisible()
    const box = await page.evaluate(() => {
      const r = (q: string) => document.querySelector(q)!.getBoundingClientRect()
      return { card: r('.day-date'), line: r('a.dc-occasion'), ayah: r('.dc-ayah-card') }
    })
    expect(box.line.top).toBeGreaterThanOrEqual(box.card.bottom - 0.5)
    expect(box.line.bottom).toBeLessThanOrEqual(box.ayah.top + 0.5)
    expect(box.line.height).toBeGreaterThanOrEqual(44)
    // The sky holds what it held: the shamsa's three lines and the two corners, nothing more.
    expect(await page.locator('.day-date').evaluate((el) => el.textContent)).not.toContain('البيض')
    expect(await contrast(page, 'a.dc-occasion .dc-occ-text')).toBeGreaterThanOrEqual(4.5)
  })

  test('English, and other days: Rajab, Ramadan, Arafah «today», the 15th of Sha‘ban (never marked) looks to Ramadan', async ({ page }) => {
    await at(page, '2026-10-22T09:00:00Z', '/?lang=en&theme=light')
    await expect(page.locator('.dc-occ-text')).toHaveText('The white days · in 2 days')
    for (const [iso, text, id] of [
      ['2026-11-30T09:00:00Z', 'رجب، من الأشهر الحرم · بعد ١٠ أيام', '10104'],
      ['2027-01-28T09:00:00Z', 'رمضان · بعد ١١ يومًا', '4196'],
      ['2027-05-15T09:00:00Z', 'يوم عرفة · اليوم', '65874'],
      ['2027-01-23T09:00:00Z', 'رمضان · بعد ١٦ يومًا', '4196'],
      // Talal's wording (add-on 0071-add15 §3).
      ['2027-03-28T09:00:00Z', 'بداية الأشهر الحرم الثلاثة المتتابعة · بعد ١١ يومًا', '10104'],
    ] as const) {
      await page.clock.setFixedTime(new Date(iso))
      await page.goto('/?lang=ar&theme=light')
      await expect(page.locator('.dc-occ-text'), iso).toHaveText(text)
      await expect(page.locator('a.dc-occasion'), iso).toHaveAttribute('href', `/hadith/${id}`)
    }
  })

  test('add-on 0071-add15 §3: the disc takes the line’s offset, the user’s and the global one', async ({ page }) => {
    // 12 Jumada I 1448 by Umm al-Qura. No offset: the disc says 12, the line «غدًا».
    await at(page, '2026-10-23T09:00:00Z', '/?lang=ar&theme=light')
    await expect(page.locator('.dc-disc .dc-day')).toHaveText('١٢')
    await expect(page.locator('.dc-occ-text')).toHaveText('الأيام البيض · غدًا')
    // The user's +1 (the calendar's own setting): 13 on the disc, «اليوم» under it, and the card's label says 13.
    await page.evaluate(() => localStorage.setItem('muslim.hijri.offset.v1', '1'))
    await page.reload()
    await expect(page.locator('.dc-disc .dc-day')).toHaveText('١٣')
    await expect(page.locator('.dc-occ-text')).toHaveText('الأيام البيض · اليوم')
    await expect(page.locator('.day-date')).toHaveAttribute('aria-label', /١٣ جمادى الأولى/)
    // The global offset from the server's file (after the Supreme Court's announcement): −1 on top of the user's +1.
    await page.route('**/config/hijri.json', (r) => r.fulfill({ json: { offset: -1 } }))
    await page.route('**/api/config/hijri', (r) => r.fulfill({ json: { offset: -1 } }))
    await page.reload()
    await expect(page.locator('.dc-disc .dc-day')).toHaveText('١٢')
    await expect(page.locator('.dc-occ-text')).toHaveText('الأيام البيض · غدًا')
  })

  test('the tap opens the evidence: the hadith page with its grade as received', async ({ page }) => {
    await at(page, '2026-11-30T09:00:00Z', '/?lang=ar&theme=light')
    await page.locator('a.dc-occasion').click()
    await expect(page).toHaveURL(/\/hadith\/10104(\?|$)/)
    await expect(page.getByText('متفق عليه').first()).toBeVisible()
    await expect(page.locator('.grade-badge').first()).toContainText('صحيح')
  })

  test('320 and 390 px, 100% and 130% text, Arabic and English: no sideways scroll; the corners stay in the sky; the line stays one tidy block under the card', async ({ page }) => {
    await at(page, '2026-11-30T09:00:00Z', '/?lang=ar&theme=light')
    for (const width of [320, 390])
      for (const lang of ['ar', 'en'])
        for (const scale of ['100%', '130%']) {
          await page.setViewportSize({ width, height: 844 })
          await page.goto(`/?lang=${lang}&theme=light`)
          await expect(page.locator('a.dc-occasion')).toBeVisible()
          await page.evaluate((s) => document.documentElement.style.setProperty('font-size', s), scale)
          await frames(page)
          await frames(page)
          const r = await page.evaluate(() => {
            const c = document.querySelector('.day-date')!.getBoundingClientRect()
            const sky = { l: c.left + (84 / 1200) * c.width, r: c.left + (1116 / 1200) * c.width, t: c.top + (76 / 865) * c.height, b: c.top + (786 / 865) * c.height }
            const corners = [...document.querySelectorAll<HTMLElement>('.dd-corner')].map((el) => {
              const range = document.createRange()
              range.selectNodeContents(el)
              const b = range.getBoundingClientRect()
              return b.left >= sky.l - 0.5 && b.right <= sky.r + 0.5 && b.top >= sky.t - 0.5 && b.bottom <= sky.b + 0.5
            })
            const line = document.querySelector('a.dc-occasion')!.getBoundingClientRect()
            const ayah = document.querySelector('.dc-ayah-card')?.getBoundingClientRect()
            const s = document.querySelector<HTMLElement>('.scroll')!
            return {
              page: document.documentElement.scrollWidth - document.documentElement.clientWidth,
              scroll: s.scrollWidth - s.clientWidth,
              corners,
              below: line.top >= c.bottom - 0.5 && (!ayah || line.bottom <= ayah.top + 0.5),
              inside: line.left >= 0 && line.right <= window.innerWidth,
            }
          })
          const at = `${width} ${lang} ${scale}`
          expect(r.page, at).toBeLessThanOrEqual(0)
          expect(r.scroll, at).toBeLessThanOrEqual(0)
          expect(r.corners, at).toEqual([true, true])
          expect(r.below, at).toBe(true)
          expect(r.inside, at).toBe(true)
        }
  })
})

test.describe('§7 the forbidden window of «now», calmly', () => {
  test('11:30 in Riyadh (before the zawal): one line in the next-prayer card, and that row alone tagged «الآن»', async ({ page }) => {
    await at(page, '2026-10-22T08:30:00Z', '/today/times?lang=ar&theme=light')
    const line = page.locator('.dt-next .dt-next-forbidden')
    await expect(line).toHaveText('الآن من أوقات النهي عن صلاة النافلة، حتى ١١:٣٨ ص')
    await expect(line).toHaveAttribute('data-forbidden', 'before_zawal')
    const rows = page.locator('.dt-row.is-now')
    await expect(rows).toHaveCount(1)
    await expect(rows.locator('.dt-row-title')).toContainText('قبيل الزوال')
    await expect(rows.locator('.dt-now-tag')).toHaveText('الآن')
    expect(await contrast(page, '.dt-next-forbidden')).toBeGreaterThanOrEqual(4.5)
    expect(await contrast(page, '.dt-now-tag')).toBeGreaterThanOrEqual(4.5)
    // Still: no live region and no animation on any of it.
    expect(await page.locator('.dt-next [aria-live], .dt-next-forbidden[aria-live], .dt-row.is-now [aria-live]').count()).toBe(0)
    for (const q of ['.dt-next-forbidden', '.dt-row.is-now', '.dt-now-tag'])
      expect(await page.locator(q).first().evaluate((el) => [getComputedStyle(el).animationName, getComputedStyle(el).transitionDuration]), q).toEqual(['none', '0s'])
  })

  test('6:00 (after sunrise) in English; noon: nothing; 16:00 (after Asr): the row only, for whoever has prayed Asr', async ({ page }) => {
    await at(page, '2026-10-22T03:00:00Z', '/today/times?lang=en&theme=light')
    await expect(page.locator('.dt-next-forbidden')).toHaveAttribute('data-forbidden', 'after_sunrise')
    await expect(page.locator('.dt-next-forbidden')).toContainText('Voluntary prayer is not prayed now, until')
    await expect(page.locator('.dt-row.is-now .dt-now-tag')).toHaveText('Now')
    await page.clock.setFixedTime(new Date('2026-10-22T09:00:00Z'))
    await page.goto('/today/times?lang=ar&theme=light')
    await expect(page.locator('.dt-next')).toBeVisible()
    await expect(page.locator('.dt-next-forbidden')).toHaveCount(0)
    await expect(page.locator('.dt-row.is-now')).toHaveCount(0)
    await page.clock.setFixedTime(new Date('2026-10-22T13:00:00Z'))
    await page.goto('/today/times?lang=ar&theme=light')
    await expect(page.locator('.dt-next')).toBeVisible()
    await expect(page.locator('.dt-next-forbidden')).toHaveCount(0)
    await expect(page.locator('.dt-row.is-now .dt-row-title')).toContainText('بعد صلاة العصر')
    await expect(page.locator('.dt-row.is-now .dt-now-tag')).toHaveText('الآن، لمن صلّى العصر')
  })
})

test('§4 (compared, unchanged): the next-prayer card and the home line say «بعد …» in words, with no live region', async ({ page }) => {
  await at(page, '2026-10-22T09:03:05Z', '/today/times?lang=ar&theme=light')
  await expect(page.locator('.dt-next-in')).toHaveText('بعد ساعتين و٥١ دقيقة')
  expect(await page.locator('.dt-next [aria-live]').count()).toBe(0)
  await page.goto('/?lang=ar&theme=light')
  await expect(page.locator('.dt-nextline-sub')).toContainText('بعد ساعتين و٥١ دقيقة')
})
