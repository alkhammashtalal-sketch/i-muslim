import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import kaaba from './fixtures/answer-kaaba.json' with { type: 'json' }

// The small rosette and the ayah marker (0048-add1 §أ; Talal 09:23: «شوف كيف مقصوص من الأطراف»). Every use is
// checked: its drawing box holds the whole shape with its outline, and the gilt filter's region covers the outline
// (a filter region of exactly the fill box cut the outline's outer half at the four outermost lobes).
//   cd web && BASE_URL=… npx playwright test e2e/v2-0048-rosette.spec.ts --project=mobile --workers=2
// SHOTS=dir PHASE=before|after saves every use at 3× (out/v2-shots/0048/rosette/).
test.skip(!process.env.BASE_URL || /workers\.dev/.test(process.env.BASE_URL ?? ''), 'previews only, never the live link')
test.use({ serviceWorkers: 'block', deviceScaleFactor: 3 })

const SHOTS = process.env.SHOTS
const PHASE = process.env.PHASE ?? 'after'
const PAGES: { name: string; url: string; prepare?: (p: Page) => Promise<void> }[] = [
  { name: 'home', url: '/?lang=ar' },
  { name: 'sura', url: '/quran/2?lang=ar' },
  {
    name: 'answer',
    url: '/?lang=ar',
    prepare: async (p) => {
      await p.route('**/api/ask', (r) => r.fulfill({ json: kaaba }))
      await p.locator('#q').fill('ما هي الكعبة؟')
      await p.locator('button.send').click()
      await p.locator('.v2-quote').first().waitFor()
    },
  },
]
const USES = 'svg:has(> use[href="#rose"]), svg:has(> use[href="#mkp"])'

/** Every rosette and ayah marker on the page: its own box against the shape with its outline, and the filter region. */
const measure = (page: Page) =>
  page.evaluate((sel) => {
    const shape = (id: string) => {
      const g = document.getElementById(id) as unknown as SVGGElement
      const box = g.getBBox()
      let stroke = 0
      for (const el of g.querySelectorAll<SVGElement>('[stroke-width]')) stroke = Math.max(stroke, Number(el.getAttribute('stroke-width')))
      const gilt = g.querySelector<SVGGElement>('g[filter]')
      return { box, half: stroke / 2, gilt: gilt?.getBBox() ?? null }
    }
    const f = document.getElementById('gilt')!
    const pct = (a: string, d: number) => {
      const v = f.getAttribute(a)
      return v === null ? d : v.endsWith('%') ? Number(v.slice(0, -1)) / 100 : Number(v)
    }
    const region = { x: pct('x', -0.1), y: pct('y', -0.1), w: pct('width', 1.2), h: pct('height', 1.2) }
    const out: { use: string; ok: boolean; why: string }[] = []
    for (const svg of document.querySelectorAll<SVGSVGElement>(sel)) {
      const id = svg.querySelector('use')!.getAttribute('href')!.slice(1)
      const s = shape(id)
      const vb = svg.viewBox.baseVal
      const need = { x0: s.box.x - s.half, y0: s.box.y - s.half, x1: s.box.x + s.box.width + s.half, y1: s.box.y + s.box.height + s.half }
      const inBox = vb.x <= need.x0 && vb.y <= need.y0 && vb.x + vb.width >= need.x1 && vb.y + vb.height >= need.y1
      // The filter region in the filtered group's own box: it must reach the outline's outer edge on every side.
      const gb = s.gilt
      const inFilter =
        !gb ||
        (gb.x + region.x * gb.width <= gb.x - s.half &&
          gb.y + region.y * gb.height <= gb.y - s.half &&
          gb.x + (region.x + region.w) * gb.width >= gb.x + gb.width + s.half &&
          gb.y + (region.y + region.h) * gb.height >= gb.y + gb.height + s.half)
      out.push({
        use: `${id} in ${svg.closest('[class]')?.className || svg.parentElement?.tagName}`,
        ok: inBox && inFilter,
        why: `viewBox ${vb.x} ${vb.y} ${vb.width} ${vb.height} for ${need.x0.toFixed(2)}…${need.x1.toFixed(2)}; filter ${inFilter ? 'covers' : 'cuts'} the outline`,
      })
    }
    return out
  }, USES)

for (const p of PAGES)
  test(`${p.name}: every rosette and ayah marker is drawn whole`, async ({ page }) => {
    await page.goto(p.url)
    await page.evaluate(() => document.fonts.ready)
    if (p.prepare) await p.prepare(page)
    await page.waitForTimeout(300)
    const uses = await measure(page)
    expect(uses.length, 'uses on the page').toBeGreaterThan(0)
    if (SHOTS) {
      const dir = path.join(SHOTS, PHASE)
      fs.mkdirSync(dir, { recursive: true })
      const svgs = page.locator(USES)
      const n = Math.min(await svgs.count(), 12)
      for (let i = 0; i < n; i++) {
        const el = svgs.nth(i)
        if (!(await el.isVisible())) continue
        await el.scrollIntoViewIfNeeded()
        const b = (await el.boundingBox())!
        const pad = 6
        await page.screenshot({ path: path.join(dir, `${p.name}-${i + 1}.png`), clip: { x: b.x - pad, y: b.y - pad, width: b.width + 2 * pad, height: b.height + 2 * pad } })
      }
    }
    if (PHASE !== 'before') for (const u of uses) expect(u.ok, `${u.use}: ${u.why}`).toBe(true)
  })
