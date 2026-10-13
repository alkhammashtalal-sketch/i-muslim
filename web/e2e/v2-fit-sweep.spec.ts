import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import kaaba from './fixtures/answer-kaaba.json' with { type: 'json' }

// Reply 0045 ج (Talal: «بعض اللغوات كذا كأنها مقصوصة … مع اني استعمل ايفون برو ماكس»): every screen, sheet and the
// settings, in the ten languages, at 375, 393, 430 and 440 wide, with the text at 100%, 115% and 135% (the app follows
// the phone's text size through rem). Each screen loads at each text size from the start, as on a phone set that way
// (the day card fits its text when it loads); the width then changes on the same page, and each state is checked.
// An error is:
//   - text wider than its box: a line of the element's own text runs past the element's edge (measured on the text
//     itself, so a decoration that overflows on purpose does not count), where the box does not scroll on purpose;
//   - text cut with an ellipsis (text-overflow);
//   - text cut at the bottom by a box that hides its overflow;
//   - an element out of its card or sheet, or out of the screen;
//   - a control cut by an ancestor that hides its overflow.
// Cut on purpose, and so not errors (each one shown whole one press away):
//   - the day card's hadith (.dc-hadith-text): a part of it, the whole text on its page (DayCard.tsx, board B4);
//   - a long explanation on the hadith page (.hd-ex.is-cut): folded under «الشرح كاملًا» (HadithPage.tsx, LONG).
//   FIT_SHOTS=dir also saves a picture of each finding's element.
//   SWEEP_LANGS=ar,en narrows the languages (the full sweep is the default).
//   FIT_SWEEP=1 BASE_URL=… npx playwright test e2e/v2-fit-sweep.spec.ts --project=mobile --workers=2   (before each build)
test.use({ serviceWorkers: 'block' })
test.describe.configure({ mode: 'parallel' })
const LANGS = (process.env.SWEEP_LANGS ?? 'ar,en,ur,id,ms,tr,fr,es,bn,hi').split(',')
const WIDTHS = [375, 393, 430, 440]
const SCALES = ['100%', '115%', '135%']
const RIYADH = {
  lat: 24.6877,
  lng: 46.7219,
  timeZone: 'Asia/Riyadh',
  name: 'الرياض',
  source: 'city',
}
const SHOTS = process.env.FIT_SHOTS

type Screen = {
  name: string
  url: string
  open?: (page: Page) => Promise<void>
}
const SCREENS: Screen[] = [
  { name: 'home', url: '/' },
  {
    name: 'settings',
    url: '/',
    open: async (p) => p.locator('header .v2-actions button[aria-haspopup="dialog"]').last().click(),
  },
  {
    name: 'starter-sheet',
    url: '/',
    open: async (p) =>
      p
        .locator('.home-starter, [class*="starter"] button, button:has-text("ابدأ")')
        .first()
        .click({ timeout: 3000 })
        .catch(() => {}),
  },
  {
    name: 'answer',
    url: '/',
    open: async (p) => {
      await p.locator('#q:visible').fill('لماذا يعبد المسلمون الكعبة؟')
      await p.locator('button.send:visible').click()
      await p.locator('.turn article.card .v2-tbox').first().waitFor({ timeout: 15000 })
    },
  },
  { name: 'language', url: '/language' },
  { name: 'library', url: '/quran' },
  { name: 'sura', url: '/quran/2' },
  { name: 'ayah', url: '/quran/2/255' },
  { name: 'reciters', url: '/quran/reciters' },
  { name: 'ward', url: '/quran/ward' },
  { name: 'saved', url: '/quran/saved' },
  { name: 'hadith', url: '/hadith/5503' },
  { name: 'today', url: '/today' },
  { name: 'times', url: '/today/times' },
  { name: 'qibla', url: '/today/qibla' },
  { name: 'adhkar', url: '/today/adhkar' },
  { name: 'tasbih', url: '/today/tasbih' },
  { name: 'calendar', url: '/today/calendar' },
  { name: 'mosques', url: '/today/mosques' },
  { name: 'names', url: '/today/names' },
  { name: 'goals', url: '/today/goals' },
  { name: 'sources', url: '/sources' },
  { name: 'about', url: '/#about' },
  { name: 'starter', url: '/start/salah' },
]

/** The checks, in the page. Returns one line per problem: kind, a short path to the element, and its text. */
function check(): string[] {
  const out: string[] = []
  const vw = window.innerWidth
  const label = (e: Element) => {
    const cls = typeof e.className === 'string' ? e.className.split(/\s+/).filter(Boolean).slice(0, 2).join('.') : ''
    const own = (e.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40)
    return `${e.tagName.toLowerCase()}${cls ? '.' + cls : ''} «${own}»`
  }
  const shown = (e: Element) => {
    const r = e.getBoundingClientRect()
    if (r.width < 2 || r.height < 2) return false
    for (let a: Element | null = e; a; a = a.parentElement) {
      const cs = getComputedStyle(a)
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false
      if (a.getAttribute('aria-hidden') === 'true' && a !== document.body) return false
      if (a.tagName === 'DIALOG' && !(a as HTMLDialogElement).open) return false
    }
    return true
  }
  const ownText = (e: Element) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim())
  const scrolls = (cs: CSSStyleDeclaration) => cs.overflowX === 'auto' || cs.overflowX === 'scroll'
  const scrollsAny = (cs: CSSStyleDeclaration) => scrolls(cs) || cs.overflowY === 'auto' || cs.overflowY === 'scroll'
  const ON_PURPOSE = '.dc-hadith-text, .hd-ex.is-cut'
  const root = document.querySelector('dialog[open]') ?? document.body
  for (const e of root.querySelectorAll('*')) {
    if (e.closest('svg') && e.tagName.toLowerCase() !== 'svg') continue
    if (e.closest('.sr-only')) continue
    if (!shown(e)) continue
    const cs = getComputedStyle(e)
    const r = e.getBoundingClientRect()
    const he = e as HTMLElement
    // 1. Wider than its box: its own text's lines against its content edges (or, inline, its parent block's).
    if (ownText(e) && !scrolls(cs)) {
      let box = e as Element
      while (getComputedStyle(box).display === 'inline' && box.parentElement) box = box.parentElement
      const b = box.getBoundingClientRect()
      const bcs = getComputedStyle(box)
      const inL = b.left + parseFloat(bcs.borderLeftWidth) - 1
      const inR = b.right - parseFloat(bcs.borderRightWidth) + 1
      for (const n of e.childNodes) {
        if (n.nodeType !== 3 || !n.textContent!.trim()) continue
        const range = document.createRange()
        range.selectNodeContents(n)
        for (const q of range.getClientRects()) {
          if (q.width < 1) continue
          if (q.left < inL || q.right > inR) {
            out.push(`wider-than-box ${Math.round(q.left)}..${Math.round(q.right)} in ${Math.round(inL)}..${Math.round(inR)} ${label(e)}`)
            break
          }
        }
      }
    }
    // 2. Ellipsis.
    if (cs.textOverflow === 'ellipsis' && he.scrollWidth > he.clientWidth + 1) out.push(`ellipsis ${label(e)}`)
    // 3. Cut at the bottom.
    if (ownText(e) && (cs.overflowY === 'hidden' || cs.overflowY === 'clip') && he.scrollHeight > he.clientHeight + 2 && cs.webkitLineClamp === 'none')
      out.push(`cut-bottom ${he.scrollHeight}>${he.clientHeight} ${label(e)}`)
    if (cs.webkitLineClamp && cs.webkitLineClamp !== 'none' && he.scrollHeight > he.clientHeight + 2 && !e.matches(ON_PURPOSE))
      out.push(`line-clamp ${label(e)}`)
    // 4. Out of the screen (sideways), and out of its card or sheet.
    if ((ownText(e) || e.matches('button, a, input, select')) && (r.left < -1 || r.right > vw + 1))
      out.push(`off-screen ${Math.round(r.left)}..${Math.round(r.right)} of ${vw} ${label(e)}`)
    // The day card's disc and paper are frames in its drawing: a text that spills out of them counts too.
    const card = e.parentElement?.closest('.dc-disc, .dc-paper, .dt-card, .v2-card, .card, .v2-sheet, dialog, .v2-set-section, .v2-set-group')
    if (card && (ownText(e) || e.matches('button, a, input, select'))) {
      // Its content box: a tap area that reaches past the frame on purpose (padding) is not content.
      const c = card.getBoundingClientRect()
      const l = r.left + parseFloat(cs.paddingLeft)
      const rr = r.right - parseFloat(cs.paddingRight)
      if (l < c.left - 1 || rr > c.right + 1) out.push(`out-of-card ${Math.round(l)}..${Math.round(rr)} in ${Math.round(c.left)}..${Math.round(c.right)} ${label(e)}`)
    }
    // 5. A control whose content (its box less its padding: a tap area may reach past on purpose) is cut by an ancestor
    //    that hides its overflow; an ancestor that scrolls shows the rest by scrolling.
    if (e.matches('button, a, input, select, [role="button"], [role="radio"], [role="switch"]')) {
      const c = {
        l: r.left + parseFloat(cs.paddingLeft),
        r: r.right - parseFloat(cs.paddingRight),
        t: r.top + parseFloat(cs.paddingTop),
        b: r.bottom - parseFloat(cs.paddingBottom),
      }
      for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) {
        const acs = getComputedStyle(a)
        if (acs.overflowX === 'visible' && acs.overflowY === 'visible') continue
        if (scrollsAny(acs)) break
        const ar = a.getBoundingClientRect()
        if (c.l < ar.left - 1 || c.r > ar.right + 1 || c.t < ar.top - 1 || c.b > ar.bottom + 1) out.push(`control-cut by ${label(a).split(' ')[0]} ${label(e)}`)
        break
      }
    }
  }
  return [...new Set(out)]
}

for (const lang of LANGS) {
  test(`fit (0045 ج): ${lang}, every screen at 375–440 wide and 100–135% text`, async ({ page }) => {
    test.skip(test.info().project.name !== 'mobile', 'one project: the widths are set here')
    // About 25 minutes for the ten languages: run before each build (FIT_SWEEP=1), not in every full run (reply 0043-add4).
    test.skip(!process.env.FIT_SWEEP, 'FIT_SWEEP=1 runs the sweep')
    test.setTimeout(900_000)
    await page.addInitScript((p) => localStorage.setItem('muslim.place.v1', JSON.stringify(p)), RIYADH)
    await page.route('**/api/ask', (r) => r.fulfill({ json: { ...kaaba, answer_lang: lang } }))
    await page.route('**/api/explain', (r) => r.fulfill({ status: 404, json: { error: 'not_found' } }))
    await page.route('**/api/mosques**', (r) =>
      r.fulfill({
        json: {
          cell: '24.69,46.72',
          mosques: [
            {
              id: 'node/1',
              name: 'جامع الإمام تركي بن عبدالله',
              lat: 24.6312,
              lng: 46.7135,
            },
            {
              id: 'node/2',
              name: null,
              street: 'طريق الملك فهد',
              lat: 24.69,
              lng: 46.723,
            },
          ],
          attribution: { text: '© OpenStreetMap contributors' },
        },
      }),
    )
    const found: string[] = []
    const seen = new Set<string>()
    // The text size from the start of each load, as on a phone set that way.
    // (Before the page's <html> exists document.documentElement is null, so the size is set as soon as it appears.)
    await page.addInitScript(() => {
      const x = sessionStorage.getItem('fit.scale')
      const apply = () => {
        if (!document.documentElement) return false
        document.documentElement.style.setProperty('font-size', x, 'important')
        return true
      }
      if (x && !apply()) {
        const mo = new MutationObserver(() => apply() && mo.disconnect())
        mo.observe(document, { childList: true, subtree: true })
      }
    })
    await page.goto('/sources?lang=' + lang).catch(() => {})
    try {
      for (const s of SCREENS)
        for (const scale of SCALES) {
          await page.setViewportSize({ width: 393, height: 852 })
          await page.evaluate((x) => sessionStorage.setItem('fit.scale', x), scale)
          // A new document each time (fit=…): the same address with a #hash would only move within the page, and keep
          // the size of the load before.
          const q = `lang=${lang}&fit=${scale.replace('%', '')}`
          await page
            .goto(s.url.includes('#') ? s.url.replace('#', `?${q}#`) : `${s.url}${s.url.includes('?') ? '&' : '?'}${q}`, { waitUntil: 'networkidle' })
            .catch(() => {})
          await page.evaluate(() => document.fonts.ready)
          expect(await page.evaluate(() => document.documentElement.style.fontSize), `${s.name}: the text size applied`).toBe(scale)
          if (s.open) await s.open(page).catch(() => {})
          await page.waitForTimeout(400)
          for (const w of WIDTHS) {
            await page.setViewportSize({ width: w, height: 900 })
            await page.waitForTimeout(120)
            for (const f of await page.evaluate(check)) {
              found.push(`${s.name} ${w} ${scale}: ${f}`)
              // One picture per distinct finding (the same element across widths and sizes counts once).
              const key = `${s.name}|${f.replace(/-?\d+(\.\d+)?/g, '#')}`
              if (SHOTS && !seen.has(key)) {
                seen.add(key)
                await page
                  .screenshot({
                    path: path.join(SHOTS, `${lang}-${s.name}-${w}-${scale.replace('%', '')}-${seen.size}.png`),
                  })
                  .catch(() => {})
              }
            }
          }
        }
    } finally {
      if (SHOTS) fs.writeFileSync(path.join(SHOTS, `findings-${lang}.txt`), found.join('\n'))
    }
    expect(found, found.slice(0, 40).join('\n')).toEqual([])
  })
}
