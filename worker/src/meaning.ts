// The meaning of an ayah in the reader's language (command 22; reply 0032 A): human translations in
// ayah_translations (migrations 0005, 0007): 27 languages from QuranEnc (source ط) with version, footnotes and key,
// Bengali and Malay from the Ayat archive. Read by primary key only: (lang, sura, aya), or the (lang, sura) prefix for
// a whole sura. English stays Sahih International (text_en); Arabic has no row.
import type { Meaning } from '../../shared/api'
import type { Env } from './index'

export const MEANING_LANGS = [
  'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi', 'fa', 'ps', 'ug', 'ku', 'zh', 'ta', 'ml', 'ff', 'ja', 'vi', 'th', 'km', 'tl', 'bs', 'sr', 'az', 'uz', 'ky', 'si', 'te', 'as',
] as const
export const meaningLang = (v: string | null | undefined): string | null => ((MEANING_LANGS as readonly string[]).includes(v ?? '') ? (v as string) : null)
type Row = { text: string; translator: string; version?: string | null; footnotes?: string | null; source_key?: string | null }
// Rows from before migration 0007 have none of these; QuranEnc rows have all three.
const extra = (r: Row) => (r.source_key ? { version: r.version ?? null, footnotes: r.footnotes ?? null, source_key: r.source_key } : {})
const ayahOf = (id: string) => /^quran:(\d{1,3}):(\d{1,3})$/.exec(id)

/** The meanings of some ayat (at most a card's worth) in one language, in one batch of primary-key reads. */
export async function meaningsOf(env: Env, ids: string[], lang: string | null): Promise<Map<string, Meaning>> {
  const out = new Map<string, Meaning>()
  const ml = meaningLang(lang)
  const ayat = ids.map((id) => [id, ayahOf(id)] as const).filter((x): x is [string, RegExpExecArray] => !!x[1])
  if (!ml || !ayat.length) return out
  const res = await env.DB.batch(
    ayat.map(([, m]) => env.DB.prepare('SELECT text, translator, version, footnotes, source_key FROM ayah_translations WHERE lang = ? AND sura = ? AND aya = ?').bind(ml, Number(m[1]), Number(m[2]))),
  )
  ayat.forEach(([id], i) => {
    const r = (res[i].results as Row[])[0]
    if (r) out.set(id, { lang: ml, text: r.text, translator: r.translator, ...extra(r) })
  })
  return out
}

/** A whole sura's meanings in one language: aya → text, and the translator, version and key. */
export async function suraMeanings(env: Env, sura: number, lang: string | null): Promise<{ translator: string; version: string | null; source_key: string | null; byAya: Map<number, string> } | null> {
  const ml = meaningLang(lang)
  if (!ml) return null
  const { results } = await env.DB.prepare('SELECT aya, text, translator, version, source_key FROM ayah_translations WHERE lang = ? AND sura = ? ORDER BY aya')
    .bind(ml, sura)
    .all<{ aya: number; text: string; translator: string; version: string | null; source_key: string | null }>()
  if (!results.length) return null
  return { translator: results[0].translator, version: results[0].version ?? null, source_key: results[0].source_key ?? null, byAya: new Map(results.map((r) => [r.aya, r.text])) }
}

/** A whole sura's meanings in one language as the ayah panel shows them (footnotes, version and key included), for the
 *  app to keep on the device once the reader chooses the language (reply 0033 §ب3: «ترجمة لغة المستخدم تُحمَّل عند
 *  اختيارها، وتبقى على الجهاز»). One read by the (lang, sura) prefix of the primary key. Each entry is exactly what
 *  meaningsOf returns for that ayah. */
export async function suraMeaningEntries(env: Env, sura: number, lang: string | null): Promise<{ lang: string; sura: number; meanings: Record<number, Meaning> } | null> {
  const ml = meaningLang(lang)
  if (!ml || !Number.isInteger(sura) || sura < 1 || sura > 114) return null
  const { results } = await env.DB.prepare('SELECT aya, text, translator, version, footnotes, source_key FROM ayah_translations WHERE lang = ? AND sura = ? ORDER BY aya')
    .bind(ml, sura)
    .all<Row & { aya: number }>()
  if (!results.length) return null
  return { lang: ml, sura, meanings: Object.fromEntries(results.map((r) => [r.aya, { lang: ml, text: r.text, translator: r.translator, ...extra(r) }])) }
}
