// GET /api/passage/:id — one passage with its context, read from D1 by key only.
// Ayah: two ayat before and after (within the sura), al-Muyassar and al-Saadi for this ayah only.
// Aqeedah: previous and next segment of the same book. Text is returned exactly as stored.
import type { PassageContext, PassageResponse, Quote, TafsirText } from '../../shared/api'
import type { Env } from './index'

export const MUYASSAR_NAME = 'التفسير الميسر'
export const SAADI_NAME = 'تفسير السعدي'
// No per-ayah page for al-Muyassar exists on quran.ksu.edu.sa; this is the official download page of
// the file it comes from (tarajem.ayt → ar_muyassar). See docs/SOURCES.md.
export const MUYASSAR_URL = 'https://quran.ksu.edu.sa/ayat/?pg=patches'
export const SAADI_EMPTY = 'لا يوجد تفسير للسعدي لهذه الآية في المصدر'

type Row = {
  id: string
  kind: string
  ref: string
  url: string
  text: string
  text_en: string | null
  sura: number | null
  aya: number | null
  page: number | null
  book?: string | null
  chapter?: string | null
  extra: string
}

const ID_RE = /^[a-z]+(:[a-z0-9_-]+){1,4}$/

export function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, '&')
}

/** Al-Saadi is stored as simple HTML (<p>…</p>). Turn it into plain-text paragraphs; nothing else changes. */
export function htmlParagraphs(html: string): string[] {
  return html
    .split(/<\/p>|<br\s*\/?>/i)
    .map((p) => decodeEntities(p.replace(/<[^>]*>/g, '')).trim())
    .filter((p) => p.length > 0)
}

/** "2:5-2:7" → { from: 5, to: 7 } when it spans more than one ayah of the same sura. */
export function parseRange(range: unknown): { from: number; to: number } | null {
  const m = typeof range === 'string' ? range.match(/^(\d+):(\d+)-(\d+):(\d+)$/) : null
  if (!m || m[1] !== m[3] || m[2] === m[4]) return null
  return { from: Number(m[2]), to: Number(m[4]) }
}

const ctx = (r: Pick<Row, 'id' | 'text' | 'text_en' | 'ref'>): PassageContext => ({
  id: r.id,
  text: r.text,
  ...(r.text_en ? { text_en: r.text_en } : {}),
  ref: r.ref,
})

function quoteOf(r: Row): Quote {
  return {
    id: r.id,
    kind: r.kind as Quote['kind'],
    text: r.text,
    ...(r.text_en ? { text_en: r.text_en } : {}),
    ref: r.ref,
    url: r.url,
    verified: true, // served straight from D1 by id
  }
}

export function ayahTafsir(r: Row, extra: Record<string, unknown>, suraName: string): TafsirText[] {
  const out: TafsirText[] = []
  const muyassar = typeof extra.muyassar === 'string' ? extra.muyassar : ''
  if (muyassar) {
    out.push({
      key: 'muyassar',
      name: MUYASSAR_NAME,
      text: muyassar,
      paragraphs: [muyassar],
      ref: `${MUYASSAR_NAME} – ${suraName}: ${r.aya}`,
      url: MUYASSAR_URL,
    })
  }
  const paragraphs = typeof extra.saadi === 'string' ? htmlParagraphs(extra.saadi) : []
  const range = parseRange(extra.saadi_range)
  const where = range ? `تفسير الآيات ${range.from}–${range.to}` : `${suraName}: ${r.aya}`
  out.push({
    key: 'saadi',
    name: SAADI_NAME,
    text: paragraphs.length ? paragraphs.join('\n\n') : SAADI_EMPTY,
    paragraphs,
    ...(paragraphs.length ? {} : { empty: true }),
    ref: `${SAADI_NAME} – ${where}`,
    url: r.url,
  })
  return out
}

export async function getPassage(env: Env, id: string): Promise<PassageResponse | null> {
  if (id.length > 64 || !ID_RE.test(id)) return null
  const one = env.DB.prepare(
    'SELECT id, kind, ref, url, text, text_en, sura, aya, page, book, chapter, extra FROM passages WHERE id = ?',
  ).bind(id)

  const ayah = id.match(/^quran:(\d{1,3}):(\d{1,3})$/)
  if (ayah) {
    const sura = Number(ayah[1])
    const aya = Number(ayah[2])
    const [main, near, meta] = await env.DB.batch([
      one,
      env.DB.prepare(
        'SELECT id, aya, text, text_en, ref FROM passages WHERE sura = ? AND aya BETWEEN ? AND ? ORDER BY aya',
      ).bind(sura, aya - 2, aya + 2),
      env.DB.prepare('SELECT name, ayat FROM suras WHERE n = ?').bind(sura),
    ])
    const r = (main.results as Row[])[0]
    if (!r) return null
    const extra = JSON.parse(r.extra || '{}') as Record<string, unknown>
    const s = (meta.results as { name: string; ayat: number }[])[0]
    const suraName = s?.name ?? String(extra.sura_name ?? '')
    const rows = near.results as (Pick<Row, 'id' | 'text' | 'text_en' | 'ref'> & { aya: number })[]
    return {
      ...quoteOf(r),
      before: rows.filter((x) => x.aya < aya).map(ctx),
      after: rows.filter((x) => x.aya > aya).map(ctx),
      tafsir: ayahTafsir(r, extra, suraName),
      ayah: {
        sura,
        aya,
        page: r.page ?? 0,
        suraName,
        suraAyat: s?.ayat ?? aya,
        ...(typeof extra.url_en === 'string' ? { urlEn: extra.url_en } : {}),
      },
    }
  }

  const seg = id.match(/^(aqeedah:[a-z]+):(\d{3})$/)
  if (seg) {
    const n = Number(seg[2])
    const pad = (k: number) => `${seg[1]}:${String(k).padStart(3, '0')}`
    const [main, near] = await env.DB.batch([
      one,
      env.DB.prepare('SELECT id, text, text_en, ref FROM passages WHERE id IN (?, ?)').bind(pad(n - 1), pad(n + 1)),
    ])
    const r = (main.results as Row[])[0]
    if (!r) return null
    const rows = near.results as Pick<Row, 'id' | 'text' | 'text_en' | 'ref'>[]
    const extra = JSON.parse(r.extra || '{}') as Record<string, unknown>
    return {
      ...quoteOf(r),
      before: rows.filter((x) => x.id === pad(n - 1)).map(ctx),
      after: rows.filter((x) => x.id === pad(n + 1)).map(ctx),
      segment: {
        book: r.book ?? '',
        bookKey: seg[1].slice('aqeedah:'.length),
        chapter: r.chapter ?? '',
        page: r.page ?? 0,
        pageEnd: typeof extra.page_end === 'number' ? extra.page_end : (r.page ?? 0),
        ...(typeof extra.footnotes === 'string' && extra.footnotes ? { footnotes: extra.footnotes } : {}),
      },
    }
  }

  const r = await one.first<Row>()
  return r ? quoteOf(r) : null
}
