import type { Lang } from '../../../shared/api'
import { STRINGS } from '../i18n'
import type { Strings } from '../i18n/en'
import { getExplainStatus, postExplain } from '../quran/api'
import { speakable, type Heard } from '../trust/speakable'
import { loadVoices, pickVoice, speak, type Reading } from './speaker'

/** Starts reading a reply aloud with the device voices, by the rules of trust/speakable.ts (no ayah or hadith text is
 *  ever read by a machine voice). Outside Arabic, the first passage's machine explanation is asked for first (cached
 *  on the server per passage and language). Returns null when the device has no voice for the language, and
 *  undefined when `alive()` turned false meanwhile (the user moved on). Shared by VoiceChat and VoiceMode. */
export async function startReading(heard: Heard, lang: Lang, t: Strings, alive: () => boolean): Promise<Reading | null | undefined> {
  let explanation: string | undefined
  if (heard.type === 'answer' && lang !== 'ar' && !heard.direct && heard.explanation.length === 0) {
    const q = heard.quotes[0]
    if (q && (q.kind === 'ayah' || q.kind === 'aqeedah') && (await getExplainStatus()).enabled) {
      const r = await postExplain(q.id, lang)
      if ('text' in r) explanation = r.text
    }
  }
  if (!alive()) return undefined
  const voices = await loadVoices()
  if (!alive()) return undefined
  return pickVoice(voices, lang) ? speak(speakable({ res: heard, lang, t, ar: STRINGS.ar, explanation }), voices) : null
}
