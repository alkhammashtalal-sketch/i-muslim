import fs from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { SUGGESTIONS } from '../src/config/suggestions'
import { TODAY } from '../src/v2/daily/strings-today'

// Reply 0070 step 3, item 3 (0069-add4 §1, 0069-add5). On build 16:
//  - the example turning in the home page's question box was cut on its second line («What are the pillars of
//    faith?»): the box was one line tall, and a placeholder does not count in its height;
//  - «Directions» and «Apple Maps» on the mosques page were mirrored in English: the arrow's flip (.dt-dir) also
//    named the buttons' group.
// The box must hold every suggestion of its language, at 390 and 320 px, in the ten languages; the buttons are never
// flipped, the arrow alone is, in left-to-right pages. Screenshots: out/shots/0070/.
//   BASE_URL=http://localhost:5173 npx playwright test e2e/v2-0070-fit.spec.ts --project=mobile

test.use({ serviceWorkers: 'block' })
const LANGS = ['ar', 'en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi'] as const
const SHOTS = path.resolve(import.meta.dirname, '../../out/shots/0070')

for (const width of [390, 320]) {
  test(`the question box holds every suggestion of its language at ${width} px, in the ten languages`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 })
    for (const lang of LANGS) {
      await page.goto(`/?lang=${lang}`)
      const box = page.locator('.ask-card textarea')
      await expect(box).toBeVisible()
      await page.evaluate(() => document.fonts.ready)
      const r = await page.evaluate((list) => {
        const el = document.querySelector<HTMLTextAreaElement>('.ask-card textarea')!
        const probe = el.cloneNode() as HTMLTextAreaElement
        probe.removeAttribute('id')
        probe.style.cssText = `position:absolute;visibility:hidden;height:auto;min-height:0;max-height:none;width:${el.clientWidth}px`
        el.parentElement!.appendChild(probe)
        const need = list.map((text) => {
          probe.value = text
          return probe.scrollHeight
        })
        probe.remove()
        return { height: el.clientHeight, need, overflowX: document.documentElement.scrollWidth > window.innerWidth + 1 }
      }, SUGGESTIONS[lang])
      expect(r.overflowX, `${lang}: horizontal scroll`).toBe(false)
      for (const [k, need] of r.need.entries()) expect(r.height, `${lang} «${SUGGESTIONS[lang][k]}» needs ${need}px`).toBeGreaterThanOrEqual(need - 1)
      // The height does not move while the examples turn (one height for all of them).
      const h0 = await box.evaluate((el) => el.clientHeight)
      await page.waitForTimeout(4300)
      expect(await box.evaluate((el) => el.clientHeight), `${lang}: the box jumped`).toBe(h0)
      if (lang === 'en' || lang === 'ar') {
        fs.mkdirSync(SHOTS, { recursive: true })
        await page.locator('.ask-card').screenshot({ path: path.join(SHOTS, `ask-card-${lang}-${width}.png`) })
      }
    }
  })
}

test('the box still grows with what is written, and comes back to the examples\' height when emptied', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 })
  await page.goto('/?lang=en')
  const box = page.locator('.ask-card textarea')
  const empty = await box.evaluate((el) => el.clientHeight)
  await box.fill('What is Islam? '.repeat(8))
  expect(await box.evaluate((el) => el.clientHeight)).toBeGreaterThan(empty)
  await box.fill('')
  expect(await box.evaluate((el) => el.clientHeight)).toBe(empty)
  // A larger text size (the root's --phone-scale, src/text-size.ts) makes the examples taller: the box follows.
  await page.evaluate(() => document.documentElement.style.setProperty('--phone-scale', '1.35'))
  await expect.poll(() => box.evaluate((el) => el.clientHeight)).toBeGreaterThanOrEqual(empty)
  const r = await box.evaluate((el) => {
    const probe = el.cloneNode() as HTMLTextAreaElement
    probe.style.cssText = `position:absolute;visibility:hidden;height:auto;min-height:0;max-height:none;width:${el.clientWidth}px`
    el.parentElement!.appendChild(probe)
    probe.value = 'Why did God create human beings?'
    const need = probe.scrollHeight
    probe.remove()
    return { height: el.clientHeight, need }
  })
  expect(r.height).toBeGreaterThanOrEqual(Math.min(r.need, 140) - 1)
})

const RIYADH = { lat: 24.6877, lng: 46.7219, timeZone: 'Asia/Riyadh', name: 'الرياض', source: 'city' }
for (const lang of ['ar', 'en'] as const) {
  test(`mosques (${lang}): «${TODAY[lang].directions}» and «${TODAY[lang].appleMapsLink}» are not mirrored; the arrow turns in left-to-right pages only`, async ({ page }) => {
    await page.addInitScript((place) => localStorage.setItem('muslim.place.v1', JSON.stringify(place)), RIYADH)
    await page.route(/\/api\/mosques/, (r) => r.fulfill({ json: { cell: '24.69,46.72', mosques: [{ id: 'node/1', name: 'جامع الحي', lat: 24.69, lng: 46.723 }] } }))
    await page.goto(`/today/mosques?lang=${lang}`)
    const btn = page.locator('.dt-mosque a.dt-dir-btn').first()
    await expect(btn).toHaveText(TODAY[lang].directions)
    // The Apple Maps link shows on Apple devices; the tests run on a Mac.
    await expect(page.locator('.dt-mosque a.dt-dir-apple').first()).toHaveText(TODAY[lang].appleMapsLink)
    // Nothing between the page and the buttons' text is flipped.
    const flipped = await page.evaluate(() => {
      const out: string[] = []
      for (const a of document.querySelectorAll('.dt-mosque a')) {
        for (let e: Element | null = a; e && e !== document.body; e = e.parentElement) {
          const t = getComputedStyle(e).transform
          if (t !== 'none' && t.startsWith('matrix(-1')) out.push(`${e.tagName}.${e.className}`)
        }
      }
      return out
    })
    expect(flipped).toEqual([])
    const arrow = await page.locator('.dt-mosque a.dt-dir-btn svg').first().evaluate((e) => getComputedStyle(e).transform)
    expect(arrow.startsWith('matrix(-1')).toBe(lang === 'en')
    fs.mkdirSync(SHOTS, { recursive: true })
    await page.locator('.dt-mosque').first().screenshot({ path: path.join(SHOTS, `mosque-directions-${lang}.png`) })
  })
}

// The rest of the interface (0069-add5 §2): every flip in the CSS sits on an icon, never on a box with text.
test('no flip anywhere falls on text: every scaleX(-1) in the stylesheets targets an svg', async () => {
  const root = path.resolve(import.meta.dirname, '../src')
  const files = fs.readdirSync(root, { recursive: true }).map(String).filter((f) => f.endsWith('.css'))
  const bad: string[] = []
  for (const f of files) {
    const css = fs.readFileSync(path.join(root, f), 'utf8')
    for (const m of css.matchAll(/([^{}]+)\{[^}]*scaleX\(-1\)[^}]*\}/g)) {
      const sel = m[1].replace(/\/\*[\s\S]*?\*\//g, '').trim()
      // An svg selector, or a class only svgs carry (checked in the components below).
      if (!/\bsvg\b/.test(sel) && !/\.(dt-chev|icon-end|icon-back)(?![\w-])/.test(sel)) bad.push(`${f}: ${sel}`)
    }
  }
  expect(bad).toEqual([])
  // Those classes are on <svg> (or the Svg component) only.
  const tsx = fs.readdirSync(root, { recursive: true }).map(String).filter((f) => f.endsWith('.tsx'))
  const onOther: string[] = []
  for (const f of tsx) {
    const src = fs.readFileSync(path.join(root, f), 'utf8')
    for (const m of src.matchAll(/<(\w+)[^>]*className="(?:[^"]*\s)?(dt-chev|icon-end|icon-back|dt-dir)(?:\s[^"]*)?"/g)) if (!/^(svg|Svg)$/.test(m[1])) onOther.push(`${f}: <${m[1]}> .${m[2]}`)
  }
  expect(onOther).toEqual([])
})
