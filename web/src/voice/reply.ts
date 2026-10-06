import type { Lang } from '../../../shared/api'
import { STRINGS } from '../i18n'
import type { Strings } from '../i18n/en'
import { getExplainStatus, postExplain } from '../quran/api'
import { speakable, type Heard } from '../trust/speakable'
import { fmt } from '../quran/format'
import { ayahPlayer, type Recited } from './recite'
import { VOICE_MODE } from './voicemode-strings'
import { loadVoices, pickVoice, speak, type Reading } from './speaker'

/** Starts reading a reply aloud with the device voices, by the rules of trust/speakable.ts (no ayah or hadith text is
 *  ever read by a machine voice). Outside Arabic, the first passage's machine explanation is asked for first (cached
 *  on the server per passage and language). Returns null when the device has no voice for the language, and
 *  undefined when `alive()` turned false meanwhile (the user moved on). Shared by VoiceChat and VoiceMode.
 *  An ayah known for certain is heard in the reciter's recorded voice instead of its fixed line (command 19, voice/recite.ts);
 *  `onRecite` is told what plays. */
export async function startReading(
  heard: Heard,
  lang: Lang,
  t: Strings,
  alive: () => boolean,
  onRecite?: (r: Recited | null) => void,
): Promise<Reading | null | undefined> {
  let explanation: string | undefined
  // Whether the machine explanation is on (/api/explain): off, nothing is asked for and nothing «machine» is read.
  const explainOn = heard.type === 'answer' && lang !== 'ar' ? (await getExplainStatus()).enabled : false
  if (heard.type === 'answer' && lang !== 'ar' && !heard.direct && heard.explanation.length === 0) {
    const q = heard.quotes[0]
    if (q && (q.kind === 'ayah' || q.kind === 'aqeedah') && explainOn) {
      const r = await postExplain(q.id, lang)
      if ('text' in r) explanation = r.text
    }
  }
  if (!alive()) return undefined
  const voices = await loadVoices()
  if (!alive()) return undefined
  if (!pickVoice(voices, lang)) return null
  const parts = speakable({ res: heard, lang, t, ar: STRINGS.ar, explanation, meaningEn: explainOn })
  // The first source is read; the others stay on screen, and the reading says how many (command 20).
  const others = heard.type === 'answer' ? heard.quotes.length - 1 : 0
  if (others > 0 && parts.length) {
    const forms = VOICE_MODE[lang].more
    const line = forms[new Intl.PluralRules(lang).select(others)] ?? forms.other
    parts.splice(parts.length - 1, 0, { kind: 'say', text: fmt(line, { n: new Intl.NumberFormat(lang === 'ar' ? 'ar-SA-u-nu-arab' : lang).format(others) }), lang })
  }
  return speak(parts, voices, { onAyah: ayahPlayer(lang, onRecite) })
}
