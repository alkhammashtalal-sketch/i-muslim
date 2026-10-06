import type { Lang } from '../../../shared/api'
import { normalizeArabic } from '../../../worker/src/lib/normalize'
import { getAyah, getSuras } from '../quran/api'
import { arabicDigits, fmt } from '../quran/format'
import { hasRecitation, rangeMs, reciteRange } from '../quran/recitation'
import type { Speech } from '../trust/speakable'
import type { AyahOutcome, OnAyah } from './speaker'
import { VOICE_MODE } from './voicemode-strings'

// Talal's decision (6 October, 09:05): «ويفضل إذا كان فيه آية أو حديث بيقرأ يكون بصوت تسجيل معتمد وصحيح». In voice
// conversation, an ayah is heard in the chosen reciter's recorded voice (mp3quran.net, read 54) instead of the fixed
// line; never in a machine voice. Only when the ayah is known for certain: an ayah quote by its id, or an ayah inside
// a creed passage whose quoted text equals, after the engine's own normalisation, the ayat named by the reference
// written after it. Otherwise, or offline, or if the audio has not started within 4 s: the fixed line, and on.
// At most three ayat or 45 s of recitation per reply, checked before each one: a long ayah, or a quoted run of ayat,
// is finished, never cut. Then «وبقية الآيات على الشاشة». No audio source exists for hadith: its fixed line stays (rule 1).

export type Recited = { sura: number; from: number; to: number; name: string }
type Ayah = Extract<Speech, { kind: 'ayah' }>

export const MAX_AYAT = 3
export const MAX_MS = 45_000
const MAX_RANGE = 5

const letters = (s: string) =>
  normalizeArabic(s)
    .replace(/[^\p{L}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
const westernNumber = (s: string) => Number(s.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))))

let names: Promise<Map<string, { n: number; name: string }>> | null = null
function suraNames() {
  names ??= getSuras().then(
    (list) => new Map(list.map((s) => [letters(s.name).replace(/^سوره\s*/, ''), { n: s.n, name: s.name }])),
    (e) => {
      names = null
      throw e
    },
  )
  return names
}

/** The ayah (or the run of ayat) a part stands for, or null when it is not known for certain. */
export async function resolveAyah(part: Ayah): Promise<Recited | null> {
  const id = part.id?.match(/^quran:(\d{1,3}):(\d{1,3})$/)
  if (id) {
    const sura = Number(id[1])
    const aya = Number(id[2])
    return { sura, from: aya, to: aya, name: part.ref?.split(':')[0].trim() ?? '' }
  }
  if (!part.quoted || !part.cited) return null
  // «آل عمران: ١٨» or «الزخرف: ٢٦ - ٢٨», written after the ayah in the book.
  const m = part.cited.match(/^([^:]+):\s*([٠-٩0-9]+)(?:\s*[-–]\s*([٠-٩0-9]+))?$/)
  if (!m) return null
  const sura = (await suraNames()).get(letters(m[1]).replace(/^سوره\s*/, ''))
  if (!sura) return null
  const from = westernNumber(m[2])
  const to = m[3] ? westernNumber(m[3]) : from
  if (!(from >= 1 && to >= from && to - from < MAX_RANGE)) return null
  const texts = await Promise.all(Array.from({ length: to - from + 1 }, (_, k) => getAyah(sura.n, from + k)))
  if (texts.some((p) => !p)) return null
  // The match, not the reference alone, decides: the quoted words must be exactly those ayat.
  if (letters(texts.map((p) => p!.text).join(' ')) !== letters(part.quoted)) return null
  return { sura: sura.n, from, to, name: sura.name }
}

/** The ayah steps of one reply read aloud: plays what it can within the limits; `onRecite` shows what is playing. */
export function ayahPlayer(lang: Lang, onRecite?: (r: Recited | null) => void): OnAyah {
  const v = VOICE_MODE[lang]
  let count = 0
  let spent = 0
  let limitSaid = false
  return async (part, say): Promise<AyahOutcome> => {
    if (count >= MAX_AYAT || spent >= MAX_MS) {
      if (limitSaid) return 'skip'
      limitSaid = true
      await say(v.restOnScreen)
      return 'skip'
    }
    let r: Recited | null = null
    try {
      r = await resolveAyah(part)
    } catch {
      r = null
    }
    if (!r || !hasRecitation(r.sura)) return 'fallback'
    const ms = await rangeMs(r.sura, r.from, r.to)
    if (ms == null) return 'fallback'
    const aya = lang === 'ar' ? (r.from === r.to ? arabicDigits(r.from) : `${arabicDigits(r.from)}–${arabicDigits(r.to)}`) : r.from === r.to ? String(r.from) : `${r.from}–${r.to}`
    await say(fmt(r.from === r.to ? v.listenIntro : v.listenIntroRange, { a: aya, s: lang === 'ar' ? r.name : String(r.sura) }))
    onRecite?.(r)
    const end = await reciteRange(r.sura, r.from, r.to)
    onRecite?.(null)
    if (end === 'failed') {
      console.info(`recitation ${r.sura}:${r.from}-${r.to} did not start; the fixed line instead`)
      return 'fallback'
    }
    count += r.to - r.from + 1 // ayat, not recitations: a quoted run of three counts three
    spent += ms
    return 'played'
  }
}
