// Reply 0037 §3, the app's questions, items 3–8: sharing from the app (no link to our server; the App Store link), the
// Hijri offset and the reviewed al-Muyassar translations read through /api/ with the app's copy as the fallback, the
// line for al-Saʿdi without a connection, the meanings' download (size, progress, asking only above 20 MB), the portion
// reminder opening /quran/ward, and @capacitor/assets removed with its images kept.
import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import type { Lang, PassageResponse } from '../../shared/api'
import { appFileOf, REVIEWED_LANGS } from '../../shared/app-files'
import { pushMessage } from '../../web/src/daily/notify-text'
import { STRINGS } from '../../web/src/i18n'
import { planAlerts } from '../../web/src/native/bells'
import { toNotification } from '../../web/src/native/notify'
import { ASK_ABOVE_BYTES, createOffline, type Kv, type MeaningsStatus } from '../../web/src/native/offline'
import { ayahFrom, offlineRoute, saadiOffline, sizeLabel, type BundledSura, type SuraMeanings } from '../../web/src/native/offline-data'
import { APP_STORE_URL, appShareData, appShareText, SHARE_STRINGS } from '../../web/src/native/share-text'
import { reviewedHref } from '../../web/src/quran/reviewed'
import { parseRoute } from '../../web/src/quran/route'
import { hijriHref } from '../../web/src/v2/daily/store'
import { hadithShareText } from '../../web/src/v2/hadith/api'
import { HADITH } from '../../web/src/v2/hadith/strings'
import { meaningSizes } from '../../web/scripts/native-offline-gen'
import { APP_FILE_CACHE } from '../src/app-files'
import worker, { type Env } from '../src/index'
import { ayahTafsir } from '../src/passage'
import { handleReader } from '../src/reader'
import { SqliteD1 } from './d1-sqlite'

const ROOT = path.resolve(import.meta.dirname, '../..')
const WEB = path.join(ROOT, 'web')
const PUBLIC = path.join(WEB, 'public')
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8')
const LANGS: Lang[] = ['ar', 'en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi']

describe('3. sharing from the app: the text with its reference, the app’s line, the App Store link', () => {
  const ayah = '﴿اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ﴾ [البقرة: ٢٥٥]'
  it('Arabic: exactly the three parts, one per line, and no link to our server', () => {
    expect(appShareText(ayah, 'ar')).toBe(`${ayah}\nمن تطبيق مسلم\nhttps://apps.apple.com/app/id6822315551`)
    expect(APP_STORE_URL).toBe('https://apps.apple.com/app/id6822315551')
    // CLAUDE.md §8 and reply 0039: no letter i in the share text, in any language.
    expect(SHARE_STRINGS.ar.fromApp).toBe('من تطبيق مسلم')
    for (const l of LANGS) expect(SHARE_STRINGS[l].fromApp, l).not.toMatch(/(^|[^A-Za-z])i([^A-Za-z]|$)/)
    expect(read('web/src/native/share-text.ts')).toContain('Decided in reply 0039')
  })
  it('every interface language: its own line naming the app (no Latin inside the non-Latin ones), then the store', () => {
    for (const l of LANGS) {
      const out = appShareText(' text [ref] ', l).split('\n')
      expect(out, l).toEqual(['text [ref]', SHARE_STRINGS[l].fromApp, APP_STORE_URL])
      expect(SHARE_STRINGS[l].fromApp.trim(), l).not.toBe('')
      if (['ar', 'ur', 'bn', 'hi'].includes(l)) expect(SHARE_STRINGS[l].fromApp, l).not.toMatch(/[A-Za-z]/)
      else expect(SHARE_STRINGS[l].fromApp, l).toContain('Muslim')
    }
    expect(SHARE_STRINGS.en.fromApp).toBe('From the Muslim app')
    // A language outside the ten (never the interface's) reads the Arabic line.
    expect(appShareText('x', 'fa')).toBe(`x\nمن تطبيق مسلم\n${APP_STORE_URL}`)
  })
  it('the app hands the sheet a title and that text, never a URL', () => {
    expect(appShareData('البقرة: ٢٥٥', { text: ayah, lang: 'ar' })).toEqual({ title: 'البقرة: ٢٥٥', text: appShareText(ayah, 'ar') })
    expect(appShareData(undefined, { text: ayah, lang: 'en' })).toEqual({ text: appShareText(ayah, 'en') })
    // The native branch of shareLink builds its content from appShareData alone: no `url`, nothing of `web`'s link.
    const src = read('web/src/native/share.ts')
    const native = src.slice(src.indexOf('export async function shareLink'), src.indexOf("if (typeof navigator === 'undefined'"))
    expect(native).toContain('const d = appShareData(web.title, app)')
    expect(native).toContain('Share.share({ ...d, dialogTitle: d.title })')
    expect(native).not.toMatch(/\burl\b|web\.text|\.\.\.web/)
    // The web branch is as before: the caller's text and link.
    expect(src).toContain('await navigator.share(web)')
  })
  it('the three callers give the app its text with its reference; the web keeps its text and link (the day card shares nothing since reply 0043 ب)', () => {
    const calls = (f: string) => [...read(f).matchAll(/shareLink\((\{[^\n]*?\}), (\{[^\n]*?\})\)/g)].map((m) => [m[1], m[2]])
    expect(calls('web/src/quran/AyahSheet.tsx')).toEqual([['{ title: displayRef(p.ref, lang), text, url }', '{ text, lang }']])
    expect(read('web/src/quran/AyahSheet.tsx')).toContain('const text = `﴿${p.text}﴾ [${displayRef(p.ref, lang)}]`')
    expect(calls('web/src/library/SegmentSheet.tsx')).toEqual([['{ title: displayRef(p.ref, lang), url }', '{ text: quoted(p), lang }']])
    expect(read('web/src/library/SegmentSheet.tsx')).toContain('await navigator.clipboard.writeText(quoted(p))')
    expect(calls('web/src/v2/hadith/HadithPage.tsx')).toEqual([['{ text, url }', '{ text, lang }']])
    expect(read('web/src/v2/hadith/HadithPage.tsx')).toContain('const text = hadithShareText(h, s.sourceName)')
    expect(read('web/src/v2/home/DayCard.tsx')).not.toMatch(/shareLink|dc-share|navigator\.share/)
    // No other caller.
    const users: string[] = []
    const walk = (d: string) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name)
        if (e.isDirectory()) walk(p)
        else if (/\.tsx?$/.test(e.name) && /\bshareLink\(/.test(fs.readFileSync(p, 'utf8'))) users.push(path.relative(path.join(WEB, 'src'), p))
      }
    }
    walk(path.join(WEB, 'src'))
    expect(users.sort()).toEqual(['library/SegmentSheet.tsx', 'native/share.ts', 'quran/AyahSheet.tsx', 'v2/hadith/HadithPage.tsx'])
  })
  it('the hadith: its text as the page shows it, with its reference and source', () => {
    const h = { text: 'إنما الأعمال بالنيات', grade: 'صحيح', attribution: 'متفق عليه', url: 'https://hadeethenc.com/ar/browse/hadith/4196' }
    expect(hadithShareText(h, HADITH.ar.sourceName)).toBe('إنما الأعمال بالنيات\nصحيح · متفق عليه\nموسوعة الأحاديث النبوية · https://hadeethenc.com/ar/browse/hadith/4196')
    const shared = appShareText(hadithShareText(h, HADITH.ar.sourceName), 'ar')
    expect(shared).not.toMatch(/workers\.dev/)
    expect(shared.split('\n').slice(-2)).toEqual(['من تطبيق مسلم', APP_STORE_URL])
  })
})

/** The Worker's static assets as the asset layer serves them: a file of web/public, or the page itself for anything
 *  else (not_found_handling: single-page-application). */
const assets = {
  fetch: async (input: RequestInfo | URL) => {
    const u = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
    const f = path.join(PUBLIC, decodeURIComponent(u.pathname))
    if (f.startsWith(PUBLIC + path.sep) && fs.existsSync(f) && fs.statSync(f).isFile()) {
      return new Response(fs.readFileSync(f), { status: 200, headers: { 'content-type': f.endsWith('.json') ? 'application/json' : 'application/octet-stream' } })
    }
    return new Response('<!doctype html><title>مسلم</title>', { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } })
  },
}
const env = { ASSETS: assets } as unknown as Env
const call = (p: string, init: RequestInit = {}) => worker.fetch(new Request(`https://i-muslim-next.alkhammashtalal.workers.dev${p}`, init), env)
const published = () =>
  fs.readdirSync(path.join(PUBLIC, 'explain')).flatMap((l) => fs.readdirSync(path.join(PUBLIC, 'explain', l)).filter((f) => /^\d+_\d+\.json$/.test(f)).map((f) => [l, f] as const))

describe('4. /config/hijri.json and the reviewed translations through /api/, the app’s copy as the fallback', () => {
  it('the routes stand for exactly these files, and nothing else', () => {
    expect(appFileOf('/api/config/hijri')).toBe('config/hijri.json')
    expect(appFileOf('/api/reviewed/en/2/255')).toBe('explain/en/2_255.json')
    expect(appFileOf('/api/reviewed/hi/114/6')).toBe('explain/hi/114_6.json')
    for (const p of ['/api/config/hijri.json', '/api/config/other', '/api/reviewed/ar/2/255', '/api/reviewed/de/2/255', '/api/reviewed/en/0/1', '/api/reviewed/en/115/1', '/api/reviewed/en/2/287', '/api/reviewed/en/02/255', '/api/reviewed/en/2/255.json', '/api/reviewed/en/..%2F..%2Fx/1', '/api/reviewed/en/2', '/api/explain']) {
      expect(appFileOf(p), p).toBeNull()
    }
    expect([...REVIEWED_LANGS].sort()).toEqual(LANGS.filter((l) => l !== 'ar').sort())
    // Every published file has its route.
    for (const [l, f] of published()) {
      const [s, a] = f.replace('.json', '').split('_')
      expect(appFileOf(`/api/reviewed/${l}/${s}/${a}`), `${l}/${f}`).toBe(`explain/${l}/${f}`)
    }
  })
  it('GET /api/config/hijri: the static file’s bytes, JSON, a short cache, CORS for the app', async () => {
    const res = await call('/api/config/hijri', { headers: { origin: 'capacitor://localhost' } })
    expect(res.status).toBe(200)
    expect(Buffer.from(await res.arrayBuffer()).equals(fs.readFileSync(path.join(PUBLIC, 'config/hijri.json')))).toBe(true)
    expect(res.headers.get('content-type')).toBe('application/json; charset=utf-8')
    expect(res.headers.get('cache-control')).toBe(APP_FILE_CACHE)
    expect(APP_FILE_CACHE).toBe('public, max-age=300')
    expect(res.headers.get('access-control-allow-origin')).toBe('capacitor://localhost')
  })
  it('GET /api/reviewed/:lang/:sura/:aya: every published file byte for byte; an unpublished one is 404, never the page', async () => {
    const files = published()
    expect(files.length).toBeGreaterThan(300)
    for (const [l, f] of files) {
      const [s, a] = f.replace('.json', '').split('_')
      const res = await call(`/api/reviewed/${l}/${s}/${a}`)
      expect(res.status, `${l}/${f}`).toBe(200)
      expect(Buffer.from(await res.arrayBuffer()).equals(fs.readFileSync(path.join(PUBLIC, 'explain', l, f))), `${l}/${f}`).toBe(true)
    }
    const missing = await call('/api/reviewed/en/1/1')
    expect(fs.existsSync(path.join(PUBLIC, 'explain/en/1_1.json'))).toBe(false)
    expect(missing.status).toBe(404)
    expect(await missing.json()).toEqual({ ok: false, error: 'not_found' })
    expect((await call('/api/reviewed/de/2/255')).status).toBe(404)
    expect((await call('/api/config/hijri', { method: 'POST' })).status).toBe(404)
  })
  it('the web reads the static files as before; the app (API_BASE set) the routes through api()', () => {
    // The worker's tests run without the build's define: API_BASE is '' as in the web build.
    expect(hijriHref()).toBe('/config/hijri.json')
    expect(reviewedHref('en', '2', '255')).toBe('/explain/en/2_255.json')
    expect(read('web/src/v2/daily/store.ts')).toContain("export const hijriHref = () => (API_BASE ? api('/api/config/hijri') : '/config/hijri.json')")
    expect(read('web/src/v2/daily/store.ts')).toContain('fetch(hijriHref())')
    expect(read('web/src/quran/reviewed.ts')).toContain('API_BASE ? api(`/api/reviewed/${lang}/${sura}/${aya}`) : `/explain/${lang}/${sura}_${aya}.json`')
    expect(read('web/src/quran/reviewed.ts')).toContain('fetch(reviewedHref(lang, m[1], m[2]))')
    // The app's offline layer reads its own copy of the file (dist/<rel>), JSON only.
    expect(read('web/src/native/boot.ts')).toMatch(/appFile: async \(rel\) => \{\s*const r = await net\(`\/\$\{rel\}`\)/)
    expect(offlineRoute(new URL('https://api.test/api/config/hijri'), [])).toEqual({ kind: 'file', rel: 'config/hijri.json' })
    expect(offlineRoute(new URL('https://api.test/api/reviewed/ur/2/255'), [])).toEqual({ kind: 'file', rel: 'explain/ur/2_255.json' })
  })
  it('in the app: the server’s file with the connection (and kept); without it what was kept, then the app’s copy', async () => {
    const h = mini({ app: { 'config/hijri.json': '{"offset":0}', 'explain/en/2_255.json': '{"text":"app copy"}' } })
    h.net.answers.set('/api/config/hijri', { status: 200, body: '{"offset":1}' })
    expect(await h.get('/api/config/hijri')).toEqual({ status: 200, body: { offset: 1 } })
    await new Promise((r) => setTimeout(r, 10))
    h.net.online = false
    // Kept from the last read with the connection: the newer offset, not the app's.
    expect(await h.get('/api/config/hijri')).toEqual({ status: 200, body: { offset: 1 } })
    // Never read with the connection: the app's own copy, as JSON.
    const res = (await h.offline.answer('https://api.test/api/reviewed/en/2/255'))!
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('json')
    expect(await res.json()).toEqual({ text: 'app copy' })
    // Not in the app either: the network's failure, as fetch gives it (reviewed.ts then shows no translation).
    await expect(h.offline.answer('https://api.test/api/reviewed/fr/2/255')).rejects.toThrow('Failed to fetch')
    // With the connection, a file the server no longer publishes stays withdrawn: 404, not the app's copy.
    const w = mini({ app: { 'explain/en/2_255.json': '{"text":"app copy"}' } })
    expect((await w.get('/api/reviewed/en/2/255')).status).toBe(404)
  })
})

describe('5. al-Saʿdi without a connection: one line, only then', () => {
  const sura1: BundledSura = {
    n: 1,
    name: 'الفاتحة',
    ayatCount: 1,
    basmala: null,
    ayat: [{ aya: 1, id: 'quran:1:1', text: 'نص', page: 1, ref: 'الفاتحة: 1', url: 'https://u/1', muyassar: 'ميسر' }],
  }
  it('the app’s copy has no al-Saʿdi entry; the Worker always sends one (text or empty)', () => {
    const app = ayahFrom(sura1, 1, null)!
    expect(saadiOffline(app)).toBe(true)
    const row = { id: 'quran:1:1', kind: 'ayah', ref: 'الفاتحة: 1', url: 'https://u/1', text: 'نص', text_en: null, sura: 1, aya: 1, page: 1, extra: '{}' }
    for (const extra of [{ muyassar: 'ميسر' }, { muyassar: 'ميسر', saadi: '<p>تفسير</p>' }, {}]) {
      const online = { ...app, tafsir: ayahTafsir(row, extra, 'الفاتحة') } as PassageResponse
      expect(online.tafsir!.some((t) => t.key === 'saadi')).toBe(true)
      expect(saadiOffline(online)).toBe(false)
    }
    expect(saadiOffline({ kind: 'passage', tafsir: [] } as unknown as PassageResponse)).toBe(false)
    expect(saadiOffline(null)).toBe(false)
  })
  it('the panel shows «تفسير السعدي يظهر مع الاتصال» under the tafsir heading, in the ten languages', () => {
    expect(STRINGS.ar.saadiOnline).toBe('تفسير السعدي يظهر مع الاتصال')
    for (const l of LANGS) expect(STRINGS[l].saadiOnline.trim(), l).not.toBe('')
    const sheet = read('web/src/quran/AyahSheet.tsx')
    expect(sheet).toContain('const saadiLater = saadiOffline(p)')
    expect(sheet).toMatch(/\{saadiLater && \(\s*<p className="small saadi-later" role="note">\s*\{t\.saadiOnline\}/)
  })
})

describe('6. the content language’s meanings: any network, size and progress, asking only above 20 MB', () => {
  it('20 MB as the build counts (10^6 bytes); the size in the interface’s digits, the unit in its script', () => {
    expect(ASK_ABOVE_BYTES).toBe(20_000_000)
    expect(sizeLabel(6_612_345, 'ar-u-nu-arab')).toBe('٦٫٦ ميغابايت')
    expect(sizeLabel(6_612_345, 'en')).toBe('6.6 MB')
    expect(sizeLabel(6_612_345, 'fr')).toBe('6,6 Mo') // French: a narrow no-break space
    for (const l of ['ur', 'bn', 'hi']) expect(sizeLabel(6_612_345, l), l).not.toMatch(/[A-Za-z]/)
  })
  it('under 20 MB: starts by itself, tells the size and each sura saved, then done', async () => {
    const h = mini({ sizes: { ur: 6_612_345 } })
    expect(await h.offline.ensureMeanings('ur')).toBe('done')
    const told = h.told.filter((s) => s.lang === 'ur')
    expect(told[0]).toEqual({ lang: 'ur', state: 'saving', saved: 1, total: 114, bytes: 6_612_345 })
    expect(told.at(-1)).toEqual({ lang: 'ur', state: 'done', saved: 114, total: 114, bytes: 6_612_345 })
    expect(told.filter((s) => s.state === 'saving').map((s) => s.saved)).toEqual(Array.from({ length: 114 }, (_, i) => i + 1))
    expect(told.some((s) => s.state === 'ask')).toBe(false)
    expect(h.offline.meaningsStatus('ur')).toEqual(told.at(-1))
    // A week later the same edition: one read, nothing told.
    h.files.set('meanings/ur/meta.json', JSON.stringify({ ...JSON.parse(h.files.get('meanings/ur/meta.json')!), checked: 0 }))
    h.told.length = 0
    h.net.calls.length = 0
    expect(await h.offline.ensureMeanings('ur')).toBe('done')
    expect(h.net.calls).toHaveLength(1)
    expect(h.told).toEqual([])
  })
  it('over 20 MB: asks first, with nothing downloaded; «Save» starts it; a download begun goes on without asking', async () => {
    const h = mini({ sizes: { fr: 25_000_000 } })
    expect(await h.offline.ensureMeanings('fr')).toBe('ask')
    expect(h.net.calls).toEqual([])
    expect(h.told).toEqual([{ lang: 'fr', state: 'ask', saved: 0, total: 114, bytes: 25_000_000 }])
    // Every return to the app asks the same, still without the network (the line keeps «Not now» for the run).
    expect(await h.offline.ensureMeanings('fr')).toBe('ask')
    expect(h.net.calls).toEqual([])
    h.net.failAfter = 30
    expect(await h.offline.ensureMeanings('fr', { approved: true })).toBe('partial')
    expect(h.told.at(-1)).toMatchObject({ state: 'partial', saved: 30 })
    h.net.failAfter = Infinity
    h.told.length = 0
    expect(await h.offline.ensureMeanings('fr')).toBe('done')
    expect(h.told.some((s) => s.state === 'ask')).toBe(false)
    expect(h.told.at(-1)).toMatchObject({ state: 'done', saved: 114 })
  })
  it('without a connection at the start nothing is told; with no size recorded it never asks and tells no size', async () => {
    const off = mini({ sizes: { ur: 6_000_000 } })
    off.net.online = false
    expect(await off.offline.ensureMeanings('ur')).toBe('partial')
    expect(off.told).toEqual([])
    const none = mini({})
    expect(await none.offline.ensureMeanings('ur')).toBe('done')
    expect(none.told.at(-1)).toMatchObject({ state: 'done', bytes: null })
  })
  it('the build records each language’s size: its 114 /api/meanings answers as the Worker gives them', async () => {
    const db = new DatabaseSync(':memory:')
    for (const f of ['0005_ayah_translations.sql', '0007_meaning_versions.sql']) db.exec(read(`worker/migrations/${f}`))
    const ins = db.prepare('INSERT INTO ayah_translations (lang, sura, aya, text, translator, version, footnotes, source_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    for (const [s, a] of [[1, 1], [1, 2], [2, 255], [114, 6]]) ins.run('ur', s, a, `معنی ${s}:${a} — «ٹیسٹ»`, 'مترجم', '1.0.4', a === 2 ? 'حاشیہ' : null, 'urdu_test')
    ins.run('fr', 1, 1, 'Au nom d’Allah', 'T', '1', null, 'fr_k')
    const e = { DB: new SqliteD1(db) } as unknown as Env
    // What the app downloads: the bodies of the Worker's own route, sura by sura.
    const routeBytes = async (lang: string) => {
      let bytes = 0
      for (let n = 1; n <= 114; n++) {
        const url = new URL(`https://x.test/api/meanings/${lang}/${n}`)
        const res = (await handleReader(new Request(url), e, url))!
        if (res.status === 200) bytes += Buffer.byteLength(await res.text())
      }
      return bytes
    }
    // Turkish has no rows here: left out, so the app shows no size for it.
    expect(await meaningSizes(e, ['ur', 'fr', 'tr'])).toEqual({ ur: await routeBytes('ur'), fr: await routeBytes('fr') })
    expect(await routeBytes('tr')).toBe(0)
    const gen = read('web/scripts/native-offline-gen.ts')
    expect(gen).toContain('const meanings = await meaningSizes(env, MEANING_LANGS)')
    expect(gen).toMatch(/langs: \[\.\.\.ADHKAR_LANGS\],( asbab: asbab\.langs,)? meanings \}/)
  })
  it('the quiet line: mounted by NativeDevice in the app, its texts in the ten languages, no other figure', () => {
    for (const k of ['meaningsSaving', 'meaningsAsk', 'meaningsSaveNow', 'meaningsNotNow', 'meaningsSaved', 'meaningsLater', 'meaningsProgress'] as const) {
      for (const l of LANGS) expect(STRINGS[l][k].trim(), `${l}.${k}`).not.toBe('')
      expect(STRINGS.ar[k], k).not.toMatch(/[A-Za-z!]/)
    }
    expect(read('web/src/native/NativeDevice.tsx')).toContain('return offline ? <MeaningsStrip offline={offline} content={content} /> : null')
    const strip = read('web/src/native/MeaningsStrip.tsx')
    expect(strip).toContain('role="progressbar"')
    expect(strip).toContain('offline.ensureMeanings(st.lang, { approved: true })')
    // The bar is the only progress shown: no «n of 114», no percentage written out.
    expect(strip).not.toMatch(/\{st\.saved\}|\{st\.total\}|>\s*\{pct\}/)
    const css = read('web/src/native/meanings-strip.css')
    expect(css).toMatch(/animation: ml-strip-in 200ms/)
    expect(css).toMatch(/prefers-reduced-motion: reduce/)
  })
})

describe('7. the portion reminder opens /quran/ward', () => {
  it('Web Push and the local notification: /quran/ward, a page of the app; the bells still open the times', () => {
    for (const l of [...LANGS, 'xx']) expect(pushMessage(l, 'ward').url, l).toBe('/quran/ward')
    expect(parseRoute('/quran/ward')).toEqual({ view: 'quran', page: 'ward' })
    const place = { lat: 24.7136, lng: 46.6753, timeZone: 'Asia/Riyadh' }
    const ward = planAlerts({ place, bells: [], ward: true, method: 'UmmAlQura', asr: 'shafi', lang: 'ar', now: new Date('2026-10-13T09:00:00Z') })
    expect(ward.length).toBeGreaterThan(30)
    for (const a of ward) expect(a.url).toBe('/quran/ward')
    expect(toNotification(ward[0], false).extra).toEqual({ url: '/quran/ward', kind: 'ward' })
    const bells = planAlerts({ place, bells: ['fajr', 'sunrise'], ward: false, method: 'UmmAlQura', asr: 'shafi', lang: 'en', now: new Date('2026-10-13T09:00:00Z') })
    for (const a of bells) expect(a.url).toBe('/today/times')
  })
})

describe('8. @capacitor/assets removed; the images it made stay', () => {
  it('no dependency, no lockfile entry, no npm script; the script says how to run it again with npx', () => {
    const pkg = JSON.parse(read('web/package.json')) as { dependencies: Record<string, string>; devDependencies: Record<string, string>; scripts: Record<string, string> }
    expect({ ...pkg.dependencies, ...pkg.devDependencies }).not.toHaveProperty('@capacitor/assets')
    expect(pkg.scripts['cap:assets']).toBeUndefined()
    expect(Object.values(pkg.scripts).join('\n')).not.toMatch(/capacitor-assets/)
    const lock = JSON.parse(read('web/package-lock.json')) as { packages: Record<string, unknown> }
    expect(Object.keys(lock.packages).filter((k) => /node_modules\/(@capacitor\/assets|sharp|@trapezedev\/project)$/.test(k))).toEqual([])
    expect(lock.packages['']).not.toMatchObject({ devDependencies: { '@capacitor/assets': expect.anything() } })
    const script = read('web/scripts/native-assets.mjs')
    expect(script).toContain('cd web && npx -y -p @capacitor/assets@3.0.5 node scripts/native-assets.mjs')
    expect(script).not.toMatch(/^import .* from 'sharp'/m)
    expect(read('docs/COMPONENTS.csv')).toMatch(/^tool,@capacitor\/assets 3\.0\.5 \(REMOVED 2026-10-13;/m)
  })
  it('the generated icons and launch images are in the repository, the App Store icon still icon-1024.png', () => {
    const ios = 'web/ios/App/App/Assets.xcassets'
    const splash = JSON.parse(read(`${ios}/Splash.imageset/Contents.json`)) as { images: { filename?: string }[] }
    const files = splash.images.map((i) => i.filename).filter((f): f is string => !!f)
    expect(files.length).toBe(6)
    for (const f of files) expect(fs.existsSync(path.join(ROOT, ios, 'Splash.imageset', f)), f).toBe(true)
    expect(fs.readFileSync(path.join(ROOT, ios, 'AppIcon.appiconset/AppIcon-512@2x.png')).equals(fs.readFileSync(path.join(PUBLIC, 'icons/icon-1024.png')))).toBe(true)
    // Android: the adaptive icon's background is a colour since reply 0066 (web/scripts/android-assets.mjs), so its
    // background images are gone; the foreground is that script's, the legacy icons @capacitor/assets'.
    for (const d of ['hdpi', 'mdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi']) {
      for (const f of ['ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png']) {
        expect(fs.existsSync(path.join(WEB, `android/app/src/main/res/mipmap-${d}/${f}`)), `${d}/${f}`).toBe(true)
      }
      expect(fs.existsSync(path.join(WEB, `android/app/src/main/res/mipmap-${d}/ic_launcher_background.png`)), `${d}/ic_launcher_background.png`).toBe(false)
    }
  })
})

/** A memory store, a scripted network, the app's files and the build's manifest, for the offline layer. */
function mini(o: { app?: Record<string, string>; sizes?: Record<string, number> }) {
  const files = new Map<string, string>()
  const kv: Kv = {
    get: async (p) => files.get(p) ?? null,
    put: async (p, d) => void files.set(p, d),
    remove: async (p) => void files.delete(p),
    list: async (dir) => [...files.keys()].filter((k) => k.startsWith(`${dir}/`)).map((k) => k.slice(dir.length + 1)),
  }
  const net = { online: true, calls: [] as string[], answers: new Map<string, { status: number; body: string }>(), meaningCalls: 0, failAfter: Infinity }
  const meanings = (lang: string, n: number): SuraMeanings => ({ lang, sura: n, meanings: { '1': { lang, text: `${lang} ${n}`, translator: 'T', version: '1', source_key: `${lang}_k` } } })
  const manifest = JSON.stringify({ built: '', suras: 114, adhkar: { categories: [], langs: ['ar'] }, hadiths: [], langs: ['ar'], ...(o.sizes ? { meanings: o.sizes } : {}) })
  const told: MeaningsStatus[] = []
  const offline = createOffline({
    kv,
    apiBase: 'https://api.test',
    meaningLangs: ['ur', 'fr', 'tr'],
    timeoutMs: 50,
    bundle: async (rel) => (rel === 'manifest.json' ? manifest : null),
    appFile: async (rel) => o.app?.[rel] ?? null,
    net: async (href) => {
      net.calls.push(href)
      if (!net.online) throw new TypeError('Failed to fetch')
      const u = new URL(href)
      const mm = u.pathname.match(/^\/api\/meanings\/(\w+)\/(\d+)$/)
      if (mm && ++net.meaningCalls > net.failAfter) throw new TypeError('Failed to fetch')
      if (mm) return new Response(JSON.stringify(meanings(mm[1], Number(mm[2]))), { status: 200 })
      const a = net.answers.get(u.pathname + u.search)
      return a ? new Response(a.body, { status: a.status, headers: { 'content-type': 'application/json; charset=utf-8' } }) : new Response('{"ok":false,"error":"not_found"}', { status: 404 })
    },
  })
  offline.onMeanings((s) => told.push(s))
  const get = async (p: string) => {
    const res = (await offline.answer(`https://api.test${p}`))!
    return { status: res.status, body: await res.json() }
  }
  return { files, net, offline, get, told }
}
