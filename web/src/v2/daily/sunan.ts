// The fard and the regular sunnahs (السنن الرواتب) under each prayer's name (add-on 0072-add59, Talal's choice of 1
// November 05:38, «النسخة الواضحة»): one small line, the sunnah before, the fard and the sunnah after, in the large
// «مواقيت اليوم» widget on iOS and Android and on the times page (PrayerTimes.tsx), the same words in both.
//   الفجر «٢ قبلها · الفرض ٢»، الظهر «٤ قبلها · الفرض ٤ · ٢ بعدها»، العصر «الفرض ٤»، المغرب «الفرض ٣ · ٢ بعدها»،
//   العشاء «الفرض ٤ · ٢ بعدها». No line for sunrise, the middle of the night or the last third. Friday: nothing
//   changes and nothing of its own is written. No sunnah for Asr, none before Maghrib (11253 is not a ratiba).
// The counts and their evidence (docs/SUNAN.md, from our data): Umm Habiba's twelve (HadeethEnc 65715, Muslim, its
// explanation names them), Aisha's four before Dhuhr and two before Fajr (11249, al-Bukhari), Ibn Umar's ten (3062,
// agreed upon), and Ibn Baz's fatwa 1432: «فالرواتب في الظهر ست أربعًا قبلها، وثنتين بعدها», «وصلاة أربع قبل العصر
// مستحبة، وليست راتبة». The numbers are written in the language's digits (num), the words from widget-strings.ts.
import type { Lang } from '../../../../shared/api'
import { WIDGET_STRINGS } from '../../native/widget-strings'
import { fill, num } from './format'

export type SunanPrayer = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'
export type SunanCount = { before: 0 | 2 | 4; fard: 2 | 3 | 4; after: 0 | 2 }

export const SUNAN: Record<SunanPrayer, SunanCount> = {
  fajr: { before: 2, fard: 2, after: 0 },
  dhuhr: { before: 4, fard: 4, after: 2 },
  asr: { before: 0, fard: 4, after: 0 },
  maghrib: { before: 0, fard: 3, after: 2 },
  isha: { before: 0, fard: 4, after: 2 },
}

/** The line's colours on the widgets' paper (add-on 0072-add59 §2), measured on the rendered paper's own pixels
 *  (worker/test/sunan-0072.test.ts; relay/w1/0072-review-queue/sunan.html): the fard in lapis #1e3a6b, 8.9:1 on the
 *  paper's mean. The dark gold #8c6d2a asked for «قبلها/بعدها» gave 3.9:1 there (3.6:1 on its darkest 1%), under
 *  4.5:1, so the same gold a little deeper is used: #795d24, the app's own AA dark gold (--gold-dark), 4.9:1 on the
 *  mean and 4.6:1 on the darkest 1%. The times page uses the same two through --primary and --gold-dark. */
export const SUNAN_COLORS = { fard: '#1e3a6b', side: '#795d24', asked: '#8c6d2a' } as const

export type SunanPart = { kind: 'before' | 'fard' | 'after'; text: string }
/** The line as its parts in reading order, the separator between them, the whole as one string, and the spoken words. */
export type SunanLine = { parts: SunanPart[]; sep: string; text: string; spoken: string }

export const SUNAN_SEP = ' · '

export const isSunanPrayer = (key: string): key is SunanPrayer => Object.prototype.hasOwnProperty.call(SUNAN, key)

/** The line under a prayer's name, or null for sunrise, the middle of the night and the last third. */
export function sunanLine(key: string, lang: Lang): SunanLine | null {
  if (!isSunanPrayer(key)) return null
  const c = SUNAN[key]
  const w = WIDGET_STRINGS[lang].sunan
  const parts: SunanPart[] = []
  const spoken: string[] = []
  if (c.before) {
    parts.push({ kind: 'before', text: fill(w.before, { n: num(c.before, lang) }) })
    spoken.push(w.spoken.before[c.before])
  }
  parts.push({ kind: 'fard', text: fill(w.fard, { n: num(c.fard, lang) }) })
  spoken.push(w.spoken.fard[c.fard])
  if (c.after) {
    parts.push({ kind: 'after', text: fill(w.after, { n: num(c.after, lang) }) })
    spoken.push(w.spoken.after[c.after])
  }
  return { parts, sep: SUNAN_SEP, text: parts.map((p) => p.text).join(SUNAN_SEP), spoken: spoken.join(w.comma) }
}

/** What VoiceOver and TalkBack read for a prayer's row: «الظهر، ١٢:٠٢ م، أربع ركعات قبلها، الفرض أربع، ركعتان بعدها». */
export function sunanRowLabel(key: string, name: string, time: string, lang: Lang): string {
  const line = sunanLine(key, lang)
  const comma = WIDGET_STRINGS[lang].sunan.comma
  return line ? [name, time, line.spoken].join(comma) : [name, time].join(comma)
}

/** The evidence, as our data has it (data/processed/hadith.jsonl and fatwas.jsonl; checked by sunan-0072.test.ts): each
 *  hadith's number, attribution and grade (HadeethEnc's own fields, Arabic) and the fatwa's number, title and link.
 *  The texts themselves are shown by the hadith page and the fatwa's site, never retyped here. */
export const SUNAN_SOURCES = {
  hadiths: [
    { id: '65715', attribution: 'رواه مسلم', grade: 'صحيح' },
    { id: '11249', attribution: 'رواه البخاري', grade: 'صحيح' },
    { id: '3062', attribution: 'متفق عليه بجميع رواياته', grade: 'صحيح' },
  ],
  fatwa: {
    number: '1432',
    title: 'درجة حديث: «رحم الله رجلاً صلى قبل الظهر أربعاً»',
    url: 'https://binbaz.org.sa/fatwas/1432/%D8%AF%D8%B1%D8%AC%D8%A9-%D8%AD%D8%AF%D9%8A%D8%AB-%D8%B1%D8%AD%D9%85-%D8%A7%D9%84%D9%84%D9%87-%D8%B1%D8%AC%D9%84%D8%A7-%D8%B5%D9%84%D9%89-%D9%82%D8%A8%D9%84-%D8%A7%D9%84%D8%B8%D9%87%D8%B1-%D8%A7%D8%B1%D8%A8%D8%B9%D8%A7',
  },
} as const
