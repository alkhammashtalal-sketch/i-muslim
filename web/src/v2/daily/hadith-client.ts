// A hadith for the calendar, from our D1 copy of HadeethEnc through the hadith route of part B
// (GET /api/hadith/:id?lang=, built by the hadith-page fork; reply 0032 B). Read as received: the Arabic text, its
// grade and attribution, and the translation in the interface language when the source has one. Until that route's
// exact shape is merged, the reader accepts { ar: {...}, tr?: {...} } or a flat row with text_ar/grade_ar.
// `lang` is the reader's content language (reply 0033 §أ1): one of HadeethEnc's, or any other (the Arabic alone).
export type HadithView = { id: string; text: string; grade: string; attribution: string; translation?: { lang: string; text: string } }

type Row = { id?: string; lang?: string; text?: string; hadeeth?: string; grade?: string; attribution?: string; text_ar?: string; grade_ar?: string; attribution_ar?: string }

export function readHadith(j: unknown, id: string, lang: string): HadithView | null {
  const o = (j ?? {}) as Record<string, unknown>
  const arRow = (o.ar ?? o.arabic ?? (o.hadith as Record<string, unknown> | undefined)?.ar ?? null) as Row | null
  const flat = o as Row
  const trRow = (o.tr ?? o.translation ?? (o.lang && o.lang !== 'ar' ? o : null)) as Row | null
  const text = arRow?.text ?? arRow?.hadeeth ?? (flat.lang === 'ar' || !flat.lang ? (flat.text ?? flat.hadeeth) : flat.text_ar)
  const grade = arRow?.grade ?? (flat.lang === 'ar' || !flat.lang ? flat.grade : flat.grade_ar)
  const attribution = arRow?.attribution ?? (flat.lang === 'ar' || !flat.lang ? flat.attribution : flat.attribution_ar)
  if (!text || !grade) return null
  const trText = trRow && trRow !== arRow ? (trRow.text ?? trRow.hadeeth) : undefined
  return {
    id,
    text,
    grade,
    attribution: attribution ?? '',
    ...(lang !== 'ar' && trText && trText !== text ? { translation: { lang, text: trText } } : {}),
  }
}

const memo = new Map<string, Promise<HadithView | null>>()
export function getHadith(id: string, lang: string): Promise<HadithView | null> {
  const key = `${id}|${lang}`
  let p = memo.get(key)
  if (!p) {
    p = fetch(`/api/hadith/${encodeURIComponent(id)}?lang=${lang}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => (j ? readHadith(j, id, lang) : null))
      .catch(() => null)
    p.then((v) => v ?? memo.delete(key))
    memo.set(key, p)
  }
  return p
}

/** The hadith's page on HadeethEnc, in the interface language when the site has it. */
export const hadeethEncUrl = (id: string, lang: string) => `https://hadeethenc.com/${lang}/browse/hadith/${id}`
