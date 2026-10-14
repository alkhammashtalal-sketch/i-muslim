import MiniSearch from 'minisearch'

// «اسأل» with no connection (reply 0056 ب): a search by words, never an answer. It looks only in what the app carries:
// the Mushaf's text, al-Muyassar and Sahih International (offline/sura/<n>.json, the build's copy of what the Worker
// serves), the reader's downloaded meanings, the adhkar (offline/adhkar/<cat>.<lang>.json) and «أذكار المواقف»
// (data/mawaqif.json). MiniSearch (MIT) keeps the index; it is built on the device at the first offline search, from
// files the app has already, so nothing is added to the app's size. No model, and no text of ours: each result is a
// row of those files, shown with its reference.

export type Doc = {
  id: string
  kind: 'ayah' | 'dhikr' | 'mawaqif'
  /** Shown as it is in its file. */
  text: string
  ref: string
  /** Where the result opens in the app. */
  path: string
  /** Searched, not shown. */
  muyassar?: string
  en?: string
  meaning?: string
  title?: string
}
export type Result = Doc & { score: number }
export type SuraName = { n: number; name: string }
/** A place the question names: a sura by its name, or ayat a small written map knows. */
export type Place = { label: string; path: string; ref: string }

// ---- Arabic as the reply asks: no marks or tatweel; one alef, one yaa, the taa marbuta as haa; «ال», «و», «ب» dropped
// at a word's start.
const MARKS = /[ؐ-ًؚ-ٟۖ-ۭـ]/g
export function foldAr(s: string): string {
  return s
    .replace(/ٰ/g, '') // the dagger alef, a mark here; the Uthmani spelling is matched by its second form (forms())
    .replace(MARKS, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
}
function stripPrefix(w: string): string {
  let x = w
  if (x.length > 3 && (x.startsWith('و') || x.startsWith('ب'))) x = x.slice(1)
  if (x.length > 3 && x.startsWith('ال')) x = x.slice(2)
  return x
}
const AR = /[؀-ۿ]/
const STOP_EN = new Set(['the', 'a', 'an', 'of', 'and', 'or', 'in', 'on', 'to', 'is', 'are', 'what', 'who', 'how', 'why', 'does', 'do', 'about', 'for', 'with', 'that', 'this', 'it', 'be', 'say', 'says', 'quran', 'verse', 'ayah'])
const STOP_AR = new Set(['ما', 'ماذا', 'من', 'في', 'عن', 'علي', 'الي', 'هل', 'كيف', 'لماذا', 'هو', 'هي', 'ان', 'او', 'ثم', 'قال', 'قول', 'يقول', 'ايه', 'ايات', 'القران', 'قران', 'اللهم'])

/** The words of a text, as both the index and the question see them. */
export function terms(s: string): string[] {
  const out: string[] = []
  for (const raw of s.split(/[^\p{L}\p{N}ً-ٰٟ]+/u)) {
    if (!raw) continue
    if (AR.test(raw)) {
      const w = stripPrefix(foldAr(raw))
      if (w.length > 1 && !STOP_AR.has(w)) out.push(w)
    } else {
      const w = raw.toLowerCase()
      if (w.length > 1 && !STOP_EN.has(w)) out.push(w)
    }
  }
  return out
}
/** An Uthmani word with a dagger alef is indexed also with the alef written («الرحمٰن» as «الرحمن» and «الرحمان»),
 *  so a question in the usual spelling finds it either way. */
function forms(s: string): string[] {
  const plain = terms(s)
  if (!/ٰ/.test(s)) return plain
  const withAlef = terms(s.replace(/ٰ/g, 'ا'))
  return [...plain, ...withAlef.filter((w) => !plain.includes(w))]
}

// ---- Names the question may give ----------------------------------------------------------------------------------
const PLACES: { keys: string[]; label: string; path: string; ref: string }[] = [
  { keys: ['اية الكرسي', 'ايه الكرسي', 'ayat al kursi', 'ayatul kursi', 'ayat ul kursi', 'ayat alkursi', 'verse of the throne'], label: 'آية الكرسي', path: '/quran/2/255', ref: 'البقرة: 255' },
  { keys: ['المعوذتين', 'المعوذتان', 'المعوذات', 'muawwidhatayn', 'muawwidhat', 'muawwidhatain'], label: 'المعوذتان', path: '/quran/113', ref: 'الفلق، والناس' },
  { keys: ['الفاتحه', 'فاتحه الكتاب', 'fatiha', 'fatihah', 'al fatiha', 'al fatihah'], label: 'الفاتحة', path: '/quran/1', ref: 'الفاتحة' },
]
const flat = (s: string) => (AR.test(s) ? foldAr(s) : s.toLowerCase()).replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
/** The places the question names: the map above first, then the suras by their name in the app's list («سورة الكهف»,
 *  «الكهف»). */
export function placesIn(q: string, suras: SuraName[]): Place[] {
  const f = ` ${flat(q)} `
  const out: Place[] = []
  for (const p of PLACES) if (p.keys.some((k) => f.includes(` ${flat(k)} `))) out.push({ label: p.label, path: p.path, ref: p.ref })
  for (const s of suras) {
    const n = flat(s.name)
    const bare = n.replace(/^ال/, '')
    const hit = f.includes(` ${n} `) || f.includes(` سوره ${n} `) || f.includes(` سوره ${bare} `)
    if (hit && !out.some((p) => p.path === `/quran/${s.n}` || p.label === s.name)) out.push({ label: `سورة ${s.name}`, path: `/quran/${s.n}`, ref: s.name })
  }
  return out
}

// ---- The index ------------------------------------------------------------------------------------------------------
export type Weights = { text: number; title: number; en: number; meaning: number; muyassar: number }
export const WEIGHTS: Weights = { text: 3, title: 2, en: 1.5, meaning: 1.5, muyassar: 1 }
export function buildIndex(docs: Doc[], boost: Weights = WEIGHTS): MiniSearch<Doc> {
  const ms = new MiniSearch<Doc>({
    fields: ['text', 'muyassar', 'en', 'meaning', 'title'],
    storeFields: ['id', 'kind', 'text', 'ref', 'path'],
    tokenize: (s, field) => (field === 'text' ? forms(s) : terms(s)),
    processTerm: (t) => t,
    searchOptions: {
      boost,
      prefix: (t) => t.length > 3,
      fuzzy: (t) => (t.length > 4 ? 0.2 : false),
      combineWith: 'OR',
      tokenize: terms,
      processTerm: (t) => t,
    },
  })
  ms.addAll(docs)
  return ms
}

/** The best `limit` rows for a question. */
export function searchIndex(ms: MiniSearch<Doc>, q: string, limit = 10): Result[] {
  if (!terms(q).length) return []
  return ms.search(q).slice(0, limit) as unknown as Result[]
}

// ---- The corpus from the app's files ------------------------------------------------------------------------------
type BundledSura = { n: number; name: string; ayat: { aya: number; id: string; text: string; text_en?: string; ref: string; muyassar?: string }[] }
type AdhkarFile = { category: string; items: { id: string; title?: string; text: string; attribution?: string }[] }
export type Sources = {
  /** A file of the app's copy (offline/<rel>), or null. */
  bundle: (rel: string) => Promise<string | null>
  /** The reader's downloaded meanings of a sura, by ayah, or null. */
  meanings?: (n: number) => Promise<Record<string, string> | null>
  /** «أذكار المواقف»: each dhikr's words and where it opens. */
  mawaqif?: () => { id: string; text: string; ref: string; path: string }[]
  adhkarCategories?: string[]
}
const parse = <T,>(s: string | null): T | null => {
  try {
    return s ? (JSON.parse(s) as T) : null
  } catch {
    return null
  }
}
export async function loadCorpus(src: Sources): Promise<{ docs: Doc[]; suras: SuraName[] }> {
  const docs: Doc[] = []
  const suras = parse<SuraName[]>(await src.bundle('suras.json')) ?? []
  const files = await Promise.all(Array.from({ length: 114 }, (_, i) => src.bundle(`sura/${i + 1}.json`).then((s) => parse<BundledSura>(s))))
  const meanings = src.meanings ? await Promise.all(Array.from({ length: 114 }, (_, i) => src.meanings!(i + 1).catch(() => null))) : []
  files.forEach((f, i) => {
    if (!f) return
    for (const a of f.ayat) docs.push({ id: a.id, kind: 'ayah', text: a.text, ref: a.ref, path: `/quran/${f.n}/${a.aya}`, muyassar: a.muyassar, en: a.text_en, meaning: meanings[i]?.[String(a.aya)] ?? undefined })
  })
  for (const cat of src.adhkarCategories ?? []) {
    const f = parse<AdhkarFile>(await src.bundle(`adhkar/${cat}.ar.json`))
    for (const it of f?.items ?? []) {
      const id = `hadith:${it.id}`
      if (docs.some((d) => d.id === id)) continue
      docs.push({ id, kind: 'dhikr', text: it.text, ref: it.attribution ?? '', path: `/hadith/${it.id}`, title: it.title })
    }
  }
  for (const m of src.mawaqif?.() ?? []) docs.push({ id: `mawaqif:${m.id}`, kind: 'mawaqif', text: m.text, ref: m.ref, path: m.path })
  return { docs, suras }
}
