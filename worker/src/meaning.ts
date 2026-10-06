// The meaning of an ayah in the reader's language (command 22): human translations from the same Ayat archive as
// Sahih International, in seven of our languages (ayah_translations, migration 0005). Read by primary key only:
// (lang, sura, aya), or the (lang, sura) prefix for a whole sura. English stays Sahih International (text_en);
// Arabic and Hindi have no row.
import type { Meaning } from '../../shared/api'
import type { Env } from './index'

export const MEANING_LANGS = ['ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn'] as const
export const meaningLang = (v: string | null | undefined): string | null => ((MEANING_LANGS as readonly string[]).includes(v ?? '') ? (v as string) : null)
const ayahOf = (id: string) => /^quran:(\d{1,3}):(\d{1,3})$/.exec(id)

/** The meanings of some ayat (at most a card's worth) in one language, in one batch of primary-key reads. */
export async function meaningsOf(env: Env, ids: string[], lang: string | null): Promise<Map<string, Meaning>> {
  const out = new Map<string, Meaning>()
  const ml = meaningLang(lang)
  const ayat = ids.map((id) => [id, ayahOf(id)] as const).filter((x): x is [string, RegExpExecArray] => !!x[1])
  if (!ml || !ayat.length) return out
  const res = await env.DB.batch(
    ayat.map(([, m]) => env.DB.prepare('SELECT text, translator FROM ayah_translations WHERE lang = ? AND sura = ? AND aya = ?').bind(ml, Number(m[1]), Number(m[2]))),
  )
  ayat.forEach(([id], i) => {
    const r = (res[i].results as { text: string; translator: string }[])[0]
    if (r) out.set(id, { lang: ml, text: r.text, translator: r.translator })
  })
  return out
}

/** A whole sura's meanings in one language: aya → text, and the translator. */
export async function suraMeanings(env: Env, sura: number, lang: string | null): Promise<{ translator: string; byAya: Map<number, string> } | null> {
  const ml = meaningLang(lang)
  if (!ml) return null
  const { results } = await env.DB.prepare('SELECT aya, text, translator FROM ayah_translations WHERE lang = ? AND sura = ? ORDER BY aya')
    .bind(ml, sura)
    .all<{ aya: number; text: string; translator: string }>()
  if (!results.length) return null
  return { translator: results[0].translator, byAya: new Map(results.map((r) => [r.aya, r.text])) }
}
