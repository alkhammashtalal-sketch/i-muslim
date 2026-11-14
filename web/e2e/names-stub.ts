import fs from 'node:fs'
import path from 'node:path'
import { test, type Page } from '@playwright/test'

// «اسم من أسماء الله» routes for the e2e specs (reply 0071 §4.2; add-ons 0071-add5, 0072-add1): GET /api/names/day,
// /api/names/entry/<n> and /api/names/list from the server under test; where it has none of them yet (404 on a server
// deployed before this branch), from this branch's data/names-daily.json as worker/src/names-day.ts sends them with
// NAMES_READINGS on, and the test says so in its annotations. Every other text (the ayat, the tafsir, the hadiths,
// their pages) is the server's. `readings: false` takes the readings and the appendix notes out, as the switch off does.

export type Readings = { meaning: string; easy: string; deep: string[] }
export type Entry = { n: number; name: string; quranOnly: boolean; hadith?: string | null; ayah?: string | null; meaningAyah?: string | null; duas?: { kind: string; id: string }[] }
export type Day = { entry: Entry; readings?: Readings }
type Data = { epoch: string; entries: (Entry & { readings: Readings })[]; appendix: { n: number; name: string; note: string }[] }

export const DATA = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, '../../data/names-daily.json'), 'utf8')) as Data

/** A reading as the card shows it: each link {{words|id}} as its words. */
export const shown = (t: string) => t.replace(/\{\{([^{}|]+)\|[^{}|]+\}\}/g, '$1')

export function fromData(u: URL): { status: number; body: Record<string, unknown> } {
  const n = DATA.entries.length
  const ref = (k: number) => {
    const e = DATA.entries[(k + n) % n]
    return { n: e.n, name: e.name }
  }
  const one = (index: number) => {
    const { readings, ...entry } = DATA.entries[index]
    return { entry, readings }
  }
  if (u.pathname === '/api/names/list')
    return { status: 200, body: { count: n, entries: DATA.entries.map((e) => ({ n: e.n, name: e.name })), appendix: DATA.appendix } }
  const m = u.pathname.match(/^\/api\/names\/entry\/(\d{1,3})$/)
  if (m) {
    const k = Number(m[1])
    if (k < 1 || k > n) return { status: 404, body: { ok: false, error: 'not_found' } }
    return { status: 200, body: { index: k - 1, count: n, ...one(k - 1), prev: ref(k - 2), next: ref(k) } }
  }
  const day = u.searchParams.get('day')!
  const d = Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${DATA.epoch}T00:00:00Z`)) / 86_400_000)
  const index = ((d % n) + n) % n
  return { status: 200, body: { day, index, count: n, ...one(index) } }
}

// Add-on 0072-add11 §2–3: the fields the server adds while NAMES_ENRICHED is on (worker/src/names-day.ts on the content
// branch, data/names-enriched.json), `meaning`, `salaf` and `heart`, as the card reads them (name-day-api.ts NameQuote).
// - With NAMES_ENRICHED_FILE set to that file (outside this branch), an entry it has gets its reviewed texts, as the
//   server will send them: the design's screenshots show the real batch.
// - Otherwise, and for an entry it does not have, PLACEHOLDERS shaped like them, for the tests alone: their words say
//   what they are, and no scholar or book is named. Never in the app or on a server.
export const PLACEHOLDER_MEANINGS = [
  { text: '[نص تجريبي لشكل القسم: هنا يُنقل كلام العالم في معنى الاسم بحروفه من كتابه، ويحل محله النص المنقول حين يصل من الخادم]', by: '(اسم العالم)', attribution: 'qala', author: '(المؤلف)', book: '(اسم الكتاب)', ref: 'ج1 - ص1', url: 'https://shamela.ws/', context: '(سطر السياق: الآية التي يفسرها)', ayah: 'quran:11:57' },
  { text: '[نص تجريبي ثانٍ لشكل القسم: قول آخر في معنى الاسم بحروفه]', by: '(اسم العالم)', attribution: 'qala', author: '(المؤلف)', book: '(اسم الكتاب)', ref: 'ص2', url: 'https://shamela.ws/' },
]
export const PLACEHOLDER_SALAF = [
  { text: '[نص تجريبي لشكل القسم: هنا يُنقل قول من أقوال السلف في الاسم بحروفه، بإسناده المتصل في كتابه]', by: '(اسم القائل)', attribution: 'qala', via: '(من رواه في كتابه)', author: '(المؤلف)', book: '(اسم الكتاب)', ref: 'ج1 - ص1', url: 'https://shamela.ws/', context: '(سطر السياق)', context_required: true },
  { text: '[نص تجريبي ثانٍ لشكل القسم: قول بلا إسناد متصل، فيُنسب بـ«يُروى عن»]', by: '(اسم القائل)', attribution: 'yurwa', author: '(المؤلف)', book: '(اسم الكتاب)', ref: 'ص3', url: 'https://shamela.ws/' },
]
export const PLACEHOLDER_HEART = '[نص تجريبي لشكل «أثره في قلبك»: فقرة بخطاب قريب إلى القارئ، كل معنى فيها يرجع إلى نص معروض فوقها.]'
type Enriched = { meaning?: unknown[]; meaningHadith?: unknown; salaf?: unknown[]; heart?: string }
/** The content branch's reviewed batch, when given (NAMES_ENRICHED_FILE). */
export const ENRICHED: Record<string, Enriched> | null = process.env.NAMES_ENRICHED_FILE
  ? (JSON.parse(fs.readFileSync(process.env.NAMES_ENRICHED_FILE, 'utf8')) as { entries: Record<string, Enriched> }).entries
  : null

export async function namesRoute(page: Page, { readings = true, enriched = false, heart = false } = {}) {
  await page.route('**/api/names/**', async (route) => {
    const u = new URL(route.request().url())
    // A request still in flight when the test ends has nowhere to go.
    const res = await route.fetch().catch(() => null)
    if (!res) return
    let r: { status: number; body: Record<string, unknown> } | null = null
    // A 404 on one of these paths: the server has no such route (an entry out of range is a 404 in the data too).
    if (res.status() === 404 && /^\/api\/names\/(day|list|entry\/\d+)$/.test(u.pathname)) {
      test.info().annotations.push({ type: 'stub', description: `${u.pathname} from data/names-daily.json of this branch (the server has no such route yet)` })
      r = fromData(u)
    } else if (res.ok()) {
      // The same when the page moved on while the body was read («Response has been disposed», item gatefix r3).
      const body = (await res.json().catch(() => null)) as Record<string, unknown> | null
      if (!body) return
      r = { status: 200, body }
    }
    if (!r) return route.fulfill({ response: res })
    const n = (r.body.entry as { n?: number } | undefined)?.n
    const real = n != null ? ENRICHED?.[String(n)] : undefined
    if (enriched && r.status === 200 && n != null) {
      if (real) {
        for (const k of ['meaning', 'meaningHadith', 'salaf', 'heart'] as const) if (real[k]) r.body[k] = real[k]
        test.info().annotations.push({ type: 'enriched', description: `entry ${n}: the content branch's reviewed batch (NAMES_ENRICHED_FILE)` })
      } else Object.assign(r.body, { meaning: PLACEHOLDER_MEANINGS, salaf: PLACEHOLDER_SALAF })
    }
    if (heart && r.status === 200 && n != null && !real) r.body.heart = PLACEHOLDER_HEART
    if (!readings) {
      delete r.body.readings
      if (Array.isArray(r.body.appendix)) r.body.appendix = (r.body.appendix as { n: number; name: string }[]).map(({ n, name }) => ({ n, name }))
    }
    await route.fulfill({ status: r.status, contentType: 'application/json', headers: { 'cache-control': 'no-store' }, body: JSON.stringify(r.body) }).catch(() => undefined)
  })
}
