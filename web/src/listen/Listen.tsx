// The one listen button (add-on 0072-add14 §1): a small speaker under each text that can be heard, inside its card, at
// the bottom corner on the side where its lines start. Press: it plays; press again: it stops; a calm wave while it
// plays. One sound at a time in the whole app (engine.ts), and what it started stops when its screen goes.
//   <ListenAyah>  under an Arabic ayah: the reciter's recording (never a device voice); outside Arabic, beside it,
//                 «استمع للمعنى» for the meaning in the reader's language (§4).
//   <ListenText>  under any other text: the device voice in the text's own language, when guard.ts allows it, and only
//                 when the device has a voice for that language (else, once, «ثبّت صوت <اللغة> من الإعدادات»).
//   <NameListen>  the slot for the names card and page: «استمع» under the name, by the recitation of its ayah, only
//                 when the name is a word of that ayah (name-word.ts); otherwise nothing.
import { useEffect, useId, useMemo, useState, type ReactNode } from 'react'
import { STRINGS, isLang, useI18n } from '../i18n'
import { hasRecitation, parseAyahId, playableOffline, prime, stop as stopRecitation, useOnline, useRecitation } from '../quran/recitation'
import { RECITATION } from '../quran/recitation-strings'
import { RecitationCredit } from '../quran/Listen'
import { contentDir } from '../v2/lang/served'
import { ensureVoices, releaseKey, reciteNow, recitedKey, speakNow, stopSpeaking, useSpeaking, voiceFor, voicesNow } from './engine'
import { speakableText, type SpeakGuard, type SpeakRole } from './guard'
import { nameInAyah } from './name-word'
import { LISTEN } from './strings'
import './listen.css'

function IcSpeaker() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4Z" fill="currentColor" fillOpacity="0.16" />
      <path d="M15.5 9.2a4 4 0 0 1 0 5.6M18 6.8a7.4 7.4 0 0 1 0 10.4" />
    </svg>
  )
}
/** While it plays: four bars rising and falling slowly (still when the reader asks for less motion). */
function Wave() {
  return (
    <span className="hear-wave" aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
    </span>
  )
}

type Look = { label: string; aria: string; on: boolean; busy: boolean; disabled?: boolean; describedBy?: string; onPress: () => void; uiDir: 'rtl' | 'ltr' }

function Button({ label, aria, on, busy, disabled, describedBy, onPress, uiDir }: Look) {
  const { lang } = useI18n()
  const s = LISTEN[lang]
  return (
    <button
      type="button"
      className={`hear-btn${on ? ' is-on' : ''}`}
      dir={uiDir}
      aria-pressed={on}
      aria-busy={busy || undefined}
      aria-label={on ? s.stop : aria}
      aria-describedby={describedBy}
      disabled={disabled}
      onClick={onPress}
    >
      <span className="hear-in">
        <span className="hear-ico">{on ? <Wave /> : <IcSpeaker />}</span>
        <span className="hear-label">{on ? s.stop : label}</span>
      </span>
    </button>
  )
}

/** The row the buttons stand in: at the start of the lines of the text above (`dir`, the text's direction). */
export function ListenRow({ dir, children, className = '' }: { dir: 'rtl' | 'ltr'; children: ReactNode; className?: string }) {
  return (
    <div className={`hear-row ${className}`.trim()} dir={dir} data-listen-row="">
      {children}
    </div>
  )
}

// ---- the recitation ----

/** The recitation button's state for its range, from the one recitation of the app. */
function useRecite(sura: number, from: number, to: number) {
  const s = useRecitation()
  const online = useOnline()
  const mine = s.status !== 'idle' && s.sura === sura && s.from === from && s.to === to
  const status = mine ? s.status : 'idle'
  return { status, on: status === 'loading' || status === 'playing' || status === 'paused', offline: !online && !mine && !playableOffline(sura) }
}

function ReciteButton({ sura, from, to, label, aria, uiDir, noteId }: { sura: number; from: number; to: number; label: string; aria: string; uiDir: 'rtl' | 'ltr'; noteId: string }) {
  const key = useId()
  const { status, on, offline } = useRecite(sura, from, to)
  // Our own small timing file, so the press can start the audio at once (iOS plays only inside the press).
  useEffect(() => {
    if (!offline && hasRecitation(sura)) prime(sura).catch(() => undefined)
  }, [offline, sura])
  // Leaving the screen (or this button showing another ayah): what it started stops.
  useEffect(() => () => releaseKey(key, recitedKey() === key), [key, sura, from, to])
  return (
    <Button
      label={label}
      aria={aria}
      on={on && status !== 'paused'}
      busy={status === 'loading'}
      disabled={offline}
      describedBy={offline || status === 'error' ? noteId : undefined}
      uiDir={uiDir}
      onPress={() => (on && status !== 'paused' ? stopRecitation() : reciteNow(key, sura, from, to))}
    />
  )
}

/** The recitation's attribution while it plays, and the offline or failure line. */
function ReciteNotes({ sura, from, to, id }: { sura: number; from: number; to: number; id: string }) {
  const { lang } = useI18n()
  const t = RECITATION[lang]
  const { status, on, offline } = useRecite(sura, from, to)
  if (!on && !offline && status !== 'error') return null
  const uiDir = lang === 'ar' || lang === 'ur' ? 'rtl' : 'ltr'
  // At the same corner as the button (the ayah's lines start on the right), in the interface's own direction.
  return (
    <div className="hear-notes" dir="rtl">
      {(offline || status === 'error') && (
        <p className="hear-note" id={id} role="status" dir={uiDir}>
          {offline ? t.offline : t.failed}
        </p>
      )}
      {on && (
        <p className="hear-note listen-credit" dir={uiDir}>
          <RecitationCredit />
        </p>
      )}
    </div>
  )
}

// ---- the device voice ----

// The line instead of a missing voice shows once per language in a visit: the first button without a voice says it.
const missingSaid = new Set<string>()

/** The device's voice for a language tag: unknown until the voices are listed. */
function useHasVoice(tag: string): boolean | null {
  const [has, setHas] = useState<boolean | null>(() => (voicesNow().length ? !!voiceFor(voicesNow(), tag) : null))
  useEffect(() => {
    let alive = true
    ensureVoices().then((v) => alive && setHas(!!voiceFor(v, tag)))
    return () => {
      alive = false
    }
  }, [tag])
  return has
}

function langName(tag: string, ui: string): string {
  try {
    return new Intl.DisplayNames([ui], { type: 'language' }).of(tag.split('-')[0]) ?? tag
  } catch {
    return tag
  }
}

/** The missing-voice line, once per language (and nothing in place of the others). */
function MissingVoice({ tag }: { tag: string }) {
  const { lang } = useI18n()
  const [mine] = useState(() => {
    const b = tag.split('-')[0]
    if (missingSaid.has(b)) return false
    missingSaid.add(b)
    return true
  })
  if (!mine) return null
  return <p className="hear-missing">{LISTEN[lang].installVoice.replace('{lang}', langName(tag, lang))}</p>
}

type SpeakProps = {
  /** The text as shown. */
  text: string
  /** Its language (BCP-47): the voice reads it in that language. */
  lang: string
  role: SpeakRole
  guard?: SpeakGuard
  label?: string
}

/** A device-voice button, or the missing-voice line, or nothing (a text guard.ts does not allow). */
function SpeakButton({ text, lang: tag, role, guard, label, uiDir }: SpeakProps & { uiDir: 'rtl' | 'ltr' }) {
  const { lang } = useI18n()
  const s = LISTEN[lang]
  const key = useId()
  const speaking = useSpeaking()
  const slot = STRINGS[isLang(tag.split('-')[0]) ? (tag.split('-')[0] as keyof typeof STRINGS) : lang].speakAyahSlot
  const g = JSON.stringify(guard ?? {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const say = useMemo(() => speakableText(text, tag, role, guard ?? {}, slot), [text, tag, role, g, slot])
  const has = useHasVoice(tag)
  useEffect(() => () => releaseKey(key, false), [key, say])
  if (!say || has === null) return null
  if (!has) return <MissingVoice tag={tag} />
  const on = speaking?.key === key
  return (
    <Button
      label={label ?? s.listen}
      aria={label ?? s.ariaSpeak}
      on={on}
      busy={on && speaking?.status === 'loading'}
      uiDir={uiDir}
      onPress={() => (on ? stopSpeaking() : void speakNow(key, say, tag))}
    />
  )
}

/** «استمع» under a text that is not an ayah: the device voice, in the text's own language. */
export function ListenText(p: SpeakProps & { className?: string }) {
  const { lang } = useI18n()
  const uiDir = lang === 'ar' || lang === 'ur' ? 'rtl' : 'ltr'
  return (
    <ListenRow dir={contentDir(p.lang)} className={p.className}>
      <SpeakButton {...p} uiDir={uiDir} />
    </ListenRow>
  )
}

/** Under an Arabic ayah (or a run of ayat by number): its recitation; outside Arabic, with `meaning`, «استمع للمعنى»
 *  beside it (§4). `id` is the ayah's passage id (quran:S:A); `to` the last ayah of a run. */
export function ListenAyah({ id, to, meaning, className }: { id: string; to?: number; meaning?: { text: string; lang: string; ayah?: string } | null; className?: string }) {
  const { lang } = useI18n()
  const s = LISTEN[lang]
  const noteId = useId()
  const a = parseAyahId(id)
  const uiDir = lang === 'ar' || lang === 'ur' ? 'rtl' : 'ltr'
  if (!a) return null
  const last = to && to >= a.aya ? to : a.aya
  const recite = hasRecitation(a.sura)
  const both = lang !== 'ar' && !!meaning?.text
  if (!recite && !both) return null
  return (
    <div className={`hear-block ${className ?? ''}`.trim()}>
      <ListenRow dir="rtl">
        {recite && <ReciteButton sura={a.sura} from={a.aya} to={last} label={both ? s.listenAyah : s.listen} aria={s.ariaRecite} uiDir={uiDir} noteId={noteId} />}
        {both && <SpeakButton text={meaning!.text} lang={meaning!.lang} role="meaning" guard={{ ayat: meaning!.ayah ? [meaning!.ayah] : [] }} label={s.listenMeaning} uiDir={uiDir} />}
      </ListenRow>
      {recite && <ReciteNotes sura={a.sura} from={a.aya} to={last} id={noteId} />}
    </div>
  )
}

/** The names' slot (§4): «استمع» under the name, by the recitation of the ayah shown with it, when the name is a word of
 *  that ayah; otherwise nothing. The names card and page place it where their design puts it. */
export function NameListen({ name, ayahId, ayahText, className }: { name: string; ayahId: string | null | undefined; ayahText: string | null | undefined; className?: string }) {
  const { lang } = useI18n()
  const s = LISTEN[lang]
  const noteId = useId()
  const a = parseAyahId(ayahId ?? undefined)
  const uiDir = lang === 'ar' || lang === 'ur' ? 'rtl' : 'ltr'
  if (!a || !ayahText || !hasRecitation(a.sura) || !nameInAyah(name, ayahText)) return null
  // The ayah's own timings are by ayah (mp3quran's files): the name is heard in its ayah, recited whole.
  return (
    <div className={`hear-block ${className ?? ''}`.trim()}>
      <ListenRow dir="rtl">
        <ReciteButton sura={a.sura} from={a.aya} to={a.aya} label={s.listenName} aria={s.ariaRecite} uiDir={uiDir} noteId={noteId} />
      </ListenRow>
      <ReciteNotes sura={a.sura} from={a.aya} to={a.aya} id={noteId} />
    </div>
  )
}
