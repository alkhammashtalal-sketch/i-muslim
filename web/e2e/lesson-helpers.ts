// Shared by the «علّمني» lesson specs (add-on 0072): open a lesson under the app's own CSP, answer our server's routes
// the page asks (/api/hadith/:id and /api/passage/quran:S:A in the Worker's own shape, from data/processed; the QF
// route stubbed), and record console errors and requests outside the page's origin. data/processed is outside git:
// without it the lesson specs are skipped.
import fs from 'node:fs'
import path from 'node:path'
import { expect, type Page } from '@playwright/test'

export const SHOTS = process.env.SHOTS ?? ''
export const HEIGHT: Record<number, number> = { 390: 844, 320: 568 }

/** Is this lesson in the app (its folder in web/src/lessons)? The links between the two lessons depend on it. */
export const lessonHere = (id: string) => fs.existsSync(path.resolve(import.meta.dirname, `../src/lessons/${id}/meta.ts`))

/** The app's CSP as Cloudflare serves it (web/public/_headers), without upgrade-insecure-requests (the preview is http). */
const CSP = (fs.readFileSync(path.resolve(import.meta.dirname, '../public/_headers'), 'utf8').match(/Content-Security-Policy: (.*)/)?.[1] ?? '')
  .split(';')
  .map((x) => x.trim())
  .filter((x) => x && x !== 'upgrade-insecure-requests')
  .join('; ')

export type Watch = { errors: string[]; outside: string[]; qf: string[]; texts: string[] }

const PROCESSED = path.resolve(import.meta.dirname, '../../data/processed')
export const HAVE_DATA = fs.existsSync(path.join(PROCESSED, 'hadith.jsonl')) && fs.existsSync(path.join(PROCESSED, 'quran.jsonl'))
type Row = Record<string, unknown>
const rows = new Map<string, Row>()
/** The rows a lesson's data names (its hadith in Arabic and English, its ayat), read once. */
export function loadRows(data: { hadith: Record<string, unknown>; quran?: Record<string, unknown> }) {
  const want = new Set(Object.keys(data.hadith))
  if (![...want].some((id) => !rows.has(`${id}:ar`))) return
  const text = fs.readFileSync(path.join(PROCESSED, 'hadith.jsonl'), 'utf8')
  let at = 0
  while (at < text.length) {
    let nl = text.indexOf('\n', at)
    if (nl < 0) nl = text.length
    const m = text.slice(at, Math.min(nl, at + 120)).match(/"lang": ?"(ar|en)".*?"id": ?"(\d+)"/)
    if (m && want.has(m[2])) rows.set(`${m[2]}:${m[1]}`, JSON.parse(text.slice(at, nl)))
    at = nl + 1
  }
  const qs = new Set(Object.keys(data.quran ?? {}))
  for (const line of fs.readFileSync(path.join(PROCESSED, 'quran.jsonl'), 'utf8').split('\n')) {
    const m = line.match(/^\{"id": ?"(quran:\d+:\d+)"/)
    if (m && qs.has(m[1])) rows.set(m[1], JSON.parse(line))
  }
}
/** A row as the Worker sends it (worker/src/hadith.ts toHadith; worker/src/passage.ts). */
const hadithOut = (r: Row) => ({
  id: r.id, lang: r.lang, title: r.title, text: r.hadeeth, intro: r.hadeeth_intro, attribution: r.attribution, grade: r.grade, explanation: r.explanation,
  hints: ((r.hints as string[]) ?? []).filter((h) => typeof h === 'string' && h.trim()),
  words: ((r.words_meanings as Row[]) ?? []).filter((w) => w && typeof w.word === 'string'),
  reference: r.reference, categories: r.categories, class: r.class, tier: r.tier, version: r.version, mawquf: !!r.mawquf,
  url: `https://hadeethenc.com/${r.lang}/browse/hadith/${r.id}`,
})
const passageOut = (r: Row) => ({
  id: r.id, kind: 'ayah', text: r.text, text_en: r.text_en, ref: r.ref, url: r.url, verified: true,
  tafsir: [{ key: 'muyassar', name: 'التفسير الميسر', text: r.muyassar, paragraphs: [r.muyassar], ref: '', url: '' }],
})
/** A text the page shows, from its row: the field (a benefit or a word meaning by its index), cut [start, end). */
export function rowText(id: string, lang: string, field: string, idx: number | null, start: number | null, end: number | null) {
  const r = rows.get(id.startsWith('quran:') ? id : `${id}:${lang}`)
  if (!r) return null
  let v = r[field] as unknown
  if (idx != null) v = (v as unknown[])[idx]
  if (field === 'words_meanings' && v && typeof v === 'object') v = (v as Row).meaning
  if (typeof v !== 'string') return null
  return start == null ? v : Array.from(v).slice(start, end ?? undefined).join('')
}

export const TRANSLIT = {
  sura: 1,
  ayat: [1, 2, 3, 4, 5, 6, 7].map((aya) => ({ aya, text: `Stub transliteration ${aya}` })),
  resource: { id: 57, name: 'Transliteration' },
  source: { name: 'Quran Foundation', url: 'https://quran.foundation' },
}

/** Open a lesson at `step` (1-based). `qf`: our server's answer to /api/qf/translit/1. `noGL`: a device without WebGL. */
export async function openLesson(
  page: Page,
  id: string,
  {
    lang = 'ar',
    width = 390,
    step = 1,
    still = true,
    qf = 'ok',
    noGL = false,
    texts = 'ok',
    data,
  }: { lang?: string; width?: number; step?: number; still?: boolean; qf?: 'ok' | 'none'; noGL?: boolean; texts?: 'ok' | 'none' | 'slow'; data?: Parameters<typeof loadRows>[0] } = {},
): Promise<Watch> {
  const w: Watch = { errors: [], outside: [], qf: [], texts: [] }
  if (data) loadRows(data)
  // our server's hadith and ayah routes, as the Worker answers them; 'none': it does not answer; 'slow': it answers late
  const answer = (body: () => unknown) => async (r: import('@playwright/test').Route) => {
    w.texts.push(new URL(r.request().url()).pathname)
    if (texts === 'slow') await new Promise((ok) => setTimeout(ok, 1500))
    const b = texts === 'none' ? null : body()
    return b ? r.fulfill({ json: b }) : r.fulfill({ status: 503, json: { ok: false } })
  }
  await page.route('**/api/hadith/*', (r) => {
    const u = new URL(r.request().url())
    const id = u.pathname.split('/').pop()!
    const l = u.searchParams.get('lang') ?? 'ar'
    return answer(() => {
      const ar = rows.get(`${id}:ar`)
      const tr = l !== 'ar' ? rows.get(`${id}:${l}`) : undefined
      return ar ? { ar: hadithOut(ar), ...(tr ? { tr: hadithOut(tr) } : {}) } : null
    })(r)
  })
  await page.route('**/api/passage/*', (r) => {
    const id = decodeURIComponent(new URL(r.request().url()).pathname.split('/').pop()!)
    return answer(() => (rows.get(id) ? passageOut(rows.get(id)!) : null))(r)
  })
  await page.setViewportSize({ width, height: HEIGHT[width] ?? 844 })
  page.on('console', (m) => {
    if (m.type() === 'error') w.errors.push(m.text())
  })
  page.on('pageerror', (e) => w.errors.push(e.message))
  const origin = new URL(process.env.BASE_URL ?? 'http://localhost').origin
  page.on('request', (r) => {
    const u = r.url()
    if (!u.startsWith(origin) && !/^(data|blob):/.test(u)) w.outside.push(u)
  })
  if (noGL)
    await page.addInitScript(() => {
      const get = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, kind: string, ...rest: unknown[]) {
        if (/webgl/i.test(kind)) return null
        return (get as (...a: unknown[]) => unknown).call(this, kind, ...rest)
      } as typeof get
    })
  await page.route('**/api/qf/translit/**', (r) => {
    w.qf.push(r.request().url())
    return qf === 'ok' ? r.fulfill({ json: TRANSLIT }) : r.fulfill({ status: 404, json: { ok: false, error: 'not_configured' } })
  })
  // the page under the CSP the app is served with: an inline style or an outside script would be refused and logged
  await page.route(
    (u) => u.pathname.startsWith('/today/lesson/'),
    async (r) => {
      const res = await r.fetch()
      await r.fulfill({ response: res, headers: { ...res.headers(), 'content-security-policy': CSP } })
    },
  )
  await page.goto(`/today/lesson/${id}?lang=${lang}&theme=light&step=${step}${still ? '&still=1' : ''}`)
  await expect(page.locator(`#lsn-${id}[data-ready="1"]`)).toBeAttached({ timeout: 20_000 })
  if (texts === 'ok') await expect(page.locator(`#lsn-${id} .lsn-pending`)).toHaveCount(0)
  await page.evaluate(() => document.fonts.ready)
  return w
}

/** Every hadith and ayah text on the page is its row's own bytes, cut where the review page cut it. */
export async function textsAreTheRows(page: Page, id: string) {
  const shown = await page.locator(`#lsn-${id} [data-ref^="hadith:"][data-field], #lsn-${id} [data-ref^="quran:"][data-field]`).evaluateAll((els) =>
    els.map((e) => {
      const d = (e as HTMLElement).dataset
      return { ref: d.ref!, lang: d.lang ?? 'ar', field: d.field!, index: d.index ?? null, start: d.start ?? null, end: d.end ?? null, kind: d.kind, text: e.textContent ?? '' }
    }),
  )
  let n = 0
  for (const t of shown) {
    if (t.field === 'translit') continue // Quran Foundation's, through our server's QF route (stubbed in the specs)
    const rid = t.ref.startsWith('hadith:') ? t.ref.slice(7) : t.ref
    const field = t.ref.startsWith('hadith:') && t.field === 'hadeeth' ? 'hadeeth' : t.field
    const want = rowText(rid, t.lang, field, t.index == null ? null : Number(t.index), t.kind === 'excerpt' ? Number(t.start) : null, t.kind === 'excerpt' ? Number(t.end) : null)
    expect(Buffer.from(t.text), `${t.ref} ${t.lang} ${t.field} ${t.start ?? ''}`).toEqual(Buffer.from(want ?? '\u0000missing'))
    n++
  }
  return n
}

/** The 404 and 503 a stubbed «none» answer logs are the test's own, not the page's. */
export const pageErrors = (w: Watch) => w.errors.filter((e) => !/status of (404|503)/.test(e))

/** A close-up's canvas has drawn something (not a blank or single-colour frame). */
export async function canvasDrawn(page: Page, selector: string) {
  return page.locator(selector).first().evaluate((c: HTMLCanvasElement) => {
    if (!c.width || !c.height) return false
    const t = document.createElement('canvas')
    t.width = 48
    t.height = 30
    const g = t.getContext('2d')!
    g.drawImage(c, 0, 0, 48, 30)
    const d = g.getImageData(0, 0, 48, 30).data
    const seen = new Set<string>()
    for (let i = 0; i < d.length; i += 4) seen.add(`${d[i] >> 4},${d[i + 1] >> 4},${d[i + 2] >> 4},${d[i + 3] >> 4}`)
    return seen.size > 12
  })
}

/** Nothing on the page wider than the screen. */
export async function noSideScroll(page: Page) {
  const r = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, screen: document.querySelector('.dt-screen')?.scrollWidth ?? 0, w: window.innerWidth }))
  expect(r.doc).toBeLessThanOrEqual(r.w)
  expect(r.screen).toBeLessThanOrEqual(r.w)
}

/** A screenshot of the whole lesson page at its width: the window made as tall as the daily screen's content. */
export async function shotWhole(page: Page, file: string) {
  const vp = page.viewportSize()!
  const h = await page.evaluate(() => document.querySelector('.dt-screen')?.scrollHeight ?? document.documentElement.scrollHeight)
  await page.setViewportSize({ width: vp.width, height: Math.min(h + 8, 14_000) })
  await page.waitForTimeout(600)
  await page.screenshot({ path: file })
  await page.setViewportSize(vp)
}
