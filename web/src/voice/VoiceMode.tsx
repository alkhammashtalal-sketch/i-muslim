import { useEffect, useRef, useState } from 'react'
import type { Lang } from '../../../shared/api'
import { useI18n } from '../i18n'
import type { Strings } from '../i18n/en'
import { arabicDigits, displayRef, fmt } from '../quran/format'
import { recitationSite } from '../quran/recitation'
import { RECITATION } from '../quran/recitation-strings'
import type { Heard } from '../trust/speakable'
import { onReply } from './bus'
import { Endpointer } from './endpoint'
import type { Recited } from './recite'
import { startReading } from './reply'
import { getMic, isIOS, setAudioSession, type VoiceSession } from './session'
import { loadVoices, pickVoice, voiceQuality, type Reading } from './speaker'
import { transcribe } from './useRecorder'
import { VOICE_MODE } from './voicemode-strings'
import { encodeWav, toMono16k } from './wav'
import './voicemode.css'

// The full-screen voice mode (command 18; hidden unless enabled, see session.ts). One press opens it; then it
// listens, notices the end of a sentence on the device (endpoint.ts), sends the recording to /api/transcribe as the
// microphone button does, shows «سمعت: …» for a second and a half (cancellable), sends the question through the same
// question box, reads the reply with the device voices by the rules of trust/speakable.ts, and listens again.
// The microphone is closed while a reply is read (on iOS an open microphone sends speech to the earpiece) and reopened
// after. Interrupting is by touch only (the shamsa), never by voice: the speaker's echo makes that unreliable.
// It closes on «إنهاء», Esc, leaving the page, a language change, or a minute without speech; every track is stopped.

type Phase = 'starting' | 'listening' | 'transcribing' | 'heard' | 'searching' | 'reading' | 'tap' | 'muted' | 'limit' | 'error'
type View = { phase: Phase; heard?: string; message?: string }
/** The source line under the shamsa: the passage's reference (Arabic, isolated so its page range keeps its order in
 *  any interface language) and a label. */
type RefLine = { ref: string | null; label: string }
type UI = {
  view: (v: View) => void
  note: (text: string | null) => void
  ref: (line: RefLine | null) => void
  level: (x: number) => void
  recite: (r: Recited | null) => void
}

const HEARD_MS = 1500

function refLine(h: Heard, lang: Lang, t: Strings): RefLine {
  if (h.type === 'answer') {
    const q = h.quotes[0]
    // Western digits inside the Arabic reference (left-to-right interfaces): the page range in its own left-to-right
    // isolate, so «ص 14–15» does not turn into «15–14».
    const ref = q ? displayRef(q.ref, lang).replace(/(\d+\s*[–-]\s*\d+)/g, '\u2066$1\u2069') : null
    return { ref, label: q && !q.verified ? '' : t.badgeVerified }
  }
  if (h.type === 'referral') return { ref: null, label: t.referralTitle }
  if (h.type === 'abstain') return { ref: null, label: t.abstainTitle }
  if (h.type === 'error') return { ref: null, label: h.message || t.voiceFailed }
  return { ref: null, label: t.voiceFailed }
}

/** The conversation, outside React: one instance per opening. */
class Conversation {
  private s: VoiceSession
  private ui: UI
  private lang: Lang
  private t: Strings
  private onText: (text: string) => void
  private onSend: () => void
  private onClosed: () => void
  private stream: MediaStream | null = null
  private first = true
  private ep: Endpointer | null = null
  private rec: MediaRecorder | null = null
  private chunks: Blob[] = []
  private reading: Reading | null = null
  private timer = 0
  private turn = 0
  muted = false
  phase: Phase = 'starting'
  closed = false

  constructor(s: VoiceSession, ui: UI, lang: Lang, t: Strings, onText: (text: string) => void, onSend: () => void, onClosed: () => void) {
    this.s = s
    this.ui = ui
    this.lang = lang
    this.t = t
    this.onText = onText
    this.onSend = onSend
    this.onClosed = onClosed
  }

  private set(v: View) {
    this.phase = v.phase
    this.ui.view(v)
  }

  private async mic(): Promise<MediaStream> {
    if (this.stream?.getAudioTracks().some((x) => x.readyState === 'live')) return this.stream
    this.stream = this.first ? await this.s.stream : await getMic()
    this.first = false
    return this.stream
  }

  private releaseMic() {
    this.ep?.dispose()
    this.ep = null
    if (this.rec && this.rec.state !== 'inactive') {
      this.rec.ondataavailable = null
      this.rec.onstop = null
      this.rec.stop()
    }
    this.rec = null
    this.chunks = []
    this.stream?.getTracks().forEach((x) => x.stop())
    this.stream = null
    this.ui.level(0)
  }

  private stopReading() {
    this.ui.recite(null)
    if (!this.reading) return
    this.turn++
    this.reading.stop() // also ends a recitation the reading started
    this.reading = null
  }

  async listen() {
    if (this.closed) return
    window.clearTimeout(this.timer)
    this.timer = 0
    this.stopReading()
    if (this.muted) return this.set({ phase: 'muted' })
    if (!this.s.ctx) return this.set({ phase: 'error', message: this.t.voiceUnsupported })
    let stream: MediaStream
    try {
      stream = await this.mic()
    } catch (e) {
      const name = (e as DOMException)?.name
      const message =
        name === 'NotAllowedError' || name === 'SecurityError' ? this.t.voiceDenied : name === 'NotFoundError' ? this.t.voiceNoMic : this.t.voiceUnsupported
      return this.set({ phase: 'error', message })
    }
    if (this.closed) return stream.getTracks().forEach((x) => x.stop())
    setAudioSession('play-and-record')
    void this.s.ctx.resume()
    let rec: MediaRecorder
    try {
      rec = new MediaRecorder(stream)
    } catch {
      return this.set({ phase: 'error', message: this.t.voiceUnsupported })
    }
    this.chunks = []
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data)
    }
    rec.start(250)
    this.rec = rec
    this.ep?.dispose()
    this.ep = new Endpointer(this.s.ctx, stream, {
      onLevel: (x) => this.ui.level(x),
      onSpeechStart: () => this.ui.note(null),
      onSpeechEnd: (startMs) => void this.ended(startMs),
      onIdle: () => this.close(),
    })
    this.ep.start()
    this.set({ phase: 'listening' })
  }

  private async ended(startMs: number) {
    const rec = this.rec
    this.rec = null
    this.ep?.stop()
    this.ui.level(0)
    if (!rec) return
    this.set({ phase: 'transcribing' })
    const chunks = await new Promise<Blob[]>((resolve) => {
      rec.onstop = () => resolve(this.chunks)
      rec.stop()
    })
    this.chunks = []
    const my = ++this.turn
    try {
      // The recording starts when listening starts: keep it from just before the speech began.
      const samples = await toMono16k(new Blob(chunks, { type: rec.mimeType || chunks[0]?.type }))
      const r = await transcribe(encodeWav(samples.subarray(Math.floor((startMs / 1000) * 16000))))
      if (my !== this.turn || this.closed) return
      if ('text' in r && /[\p{L}\p{N}]/u.test(r.text)) {
        const text = r.text.trim()
        this.onText(text)
        this.set({ phase: 'heard', heard: text })
        this.timer = window.setTimeout(() => {
          this.timer = 0
          if (this.closed) return
          this.set({ phase: 'searching' })
          this.onSend()
        }, HEARD_MS)
      } else if ('error' in r && r.error === 'limit') {
        this.releaseMic()
        this.set({ phase: 'limit', message: this.t.voiceLimit })
      } else if ('error' in r && (r.error === 'network' || r.error === 'failed')) {
        // Nothing to send: the line says why, and touching the shamsa tries again.
        this.ui.note(this.t.voiceFailed)
        this.set({ phase: 'tap' })
      } else {
        this.ui.note('error' in r && r.error === 'toolong' ? this.t.voiceTooLong : this.t.voiceUnclear)
        void this.listen()
      }
    } catch {
      if (my !== this.turn || this.closed) return
      this.ui.note(this.t.voiceUnclear)
      void this.listen()
    }
  }

  /** «إلغاء» under «سمعت: …»: nothing is sent; listen again. */
  cancelHeard() {
    window.clearTimeout(this.timer)
    this.timer = 0
    void this.listen()
  }

  async reply(heard: Heard) {
    if (this.closed || this.phase === 'limit') return
    this.ui.ref(refLine(heard, this.lang, this.t))
    this.releaseMic()
    setAudioSession('playback')
    const my = ++this.turn
    this.set({ phase: 'reading' })
    const r = await startReading(heard, this.lang, this.t, () => my === this.turn && !this.closed, (x) => this.ui.recite(x))
    if (r === undefined) return
    if (!r) {
      this.ui.note(this.t.voiceNoVoice)
      return void this.listen()
    }
    this.reading = r
    const end = await r.done
    if (my !== this.turn || this.closed) return
    this.reading = null
    if (end === 'ended') void this.listen()
  }

  /** The shamsa: during a reading it stops it and listens (interruption by touch); otherwise it starts listening. */
  tap() {
    if (this.closed || this.phase === 'limit' || this.phase === 'transcribing' || this.phase === 'heard' || this.phase === 'searching') return
    if (this.phase === 'listening') return
    void this.listen()
  }

  toggleMute() {
    this.muted = !this.muted
    if (this.muted) {
      window.clearTimeout(this.timer)
      this.timer = 0
      this.stopReading()
      this.releaseMic()
      this.set({ phase: 'muted' })
    } else void this.listen()
  }

  close() {
    if (this.closed) return
    this.closed = true
    window.clearTimeout(this.timer)
    this.stopReading()
    this.releaseMic()
    // The press that opened the mode may still be waiting for permission: stop that stream too when it arrives.
    if (this.first) this.s.stream.then((x) => x.getTracks().forEach((tr) => tr.stop())).catch(() => undefined)
    setAudioSession('auto')
    void this.s.ctx?.close().catch(() => undefined)
    this.onClosed()
  }
}

export function VoiceMode({
  session,
  onText,
  onSend,
  onClose,
}: {
  session: VoiceSession
  onText: (text: string) => void
  onSend: () => void
  onClose: () => void
}) {
  const { t, lang } = useI18n()
  const v = VOICE_MODE[lang]
  const dlg = useRef<HTMLDialogElement>(null)
  const art = useRef<HTMLSpanElement>(null)
  const ring = useRef<SVGCircleElement>(null)
  const [view, setView] = useState<View>({ phase: 'starting' })
  const [note, setNote] = useState<string | null>(null)
  const [ref, setRef] = useState<RefLine | null>(null)
  const [recite, setRecite] = useState<Recited | null>(null)
  const [muted, setMuted] = useState(false)
  const [tip, setTip] = useState(false)
  const conv = useRef<Conversation | null>(null)
  const props = useRef({ onText, onSend, onClose })
  useEffect(() => {
    props.current = { onText, onSend, onClose }
  })
  const openLang = useRef(lang)

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const level = (x: number) => {
      // The shamsa breathes with the voice; with reduced motion only the thin ring shows the level.
      if (art.current && !reduce) art.current.style.transform = `scale(${(1 + 0.06 * x).toFixed(3)})`
      if (ring.current) {
        ring.current.style.opacity = (0.25 + 0.75 * x).toFixed(2)
        if (reduce) ring.current.style.strokeDasharray = `${(x * 301.6).toFixed(1)} 301.6`
      }
    }
    const c = new Conversation(
      session,
      { view: setView, note: setNote, ref: setRef, level, recite: setRecite },
      lang,
      t,
      (text) => props.current.onText(text),
      () => props.current.onSend(),
      () => {
        dlg.current?.close()
        props.current.onClose()
      },
    )
    conv.current = c
    dlg.current?.showModal()
    void c.listen()
    const off = onReply((heard) => void c.reply(heard))
    const hidden = () => {
      if (document.visibilityState === 'hidden') c.close()
    }
    const leave = () => c.close()
    document.addEventListener('visibilitychange', hidden)
    window.addEventListener('pagehide', leave)
    return () => {
      off()
      document.removeEventListener('visibilitychange', hidden)
      window.removeEventListener('pagehide', leave)
      c.close()
    }
    // One conversation per opening; the language is checked below.
  }, [session]) // eslint-disable-line react-hooks/exhaustive-deps

  // A language change ends the mode (its voice and strings belong to the language it opened in).
  useEffect(() => {
    if (lang !== openLang.current) conv.current?.close()
  }, [lang])

  // The tip for a clearer voice: on iOS, when this language has no enhanced voice installed.
  useEffect(() => {
    if (!isIOS()) return
    let alive = true
    void loadVoices().then((voices) => {
      const chosen = pickVoice(voices, lang)
      if (alive) setTip(!chosen || voiceQuality(chosen) < 2)
    })
    return () => {
      alive = false
    }
  }, [lang])

  const status =
    view.phase === 'listening' || view.phase === 'starting'
      ? v.listening
      : view.phase === 'transcribing'
        ? v.transcribing
        : view.phase === 'heard'
          ? fmt(v.heard, { text: view.heard ?? '' })
          : view.phase === 'searching'
            ? v.searching
            : view.phase === 'reading'
              ? v.reading
              : view.phase === 'muted'
                ? v.muted
                : view.phase === 'limit' || view.phase === 'error'
                  ? (view.message ?? t.voiceFailed)
                  : v.tap

  const digits = (x: number) => (lang === 'ar' ? arabicDigits(x) : String(x))
  const end = () => conv.current?.close()
  return (
    <dialog
      ref={dlg}
      className="voicemode"
      aria-labelledby="vm-title"
      data-phase={view.phase}
      onCancel={(e) => {
        e.preventDefault()
        end()
      }}
    >
      <h2 id="vm-title" className="sr-only">
        {v.title}
      </h2>
      <div className="vm-center">
        <button
          type="button"
          className="vm-shamsa"
          onClick={() => conv.current?.tap()}
          aria-label={view.phase === 'reading' ? v.stopAndTalk : v.talk}
          aria-describedby="vm-status"
          disabled={view.phase === 'limit'}
          autoFocus
        >
          <span className="vm-art" ref={art} aria-hidden="true">
            <span className="vm-name wordmark" lang="ar">
              مسلم
            </span>
          </span>
          <svg className="vm-ring" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
            <circle ref={ring} cx="50" cy="50" r="48" />
          </svg>
        </button>
        <p id="vm-status" className="vm-status" role="status">
          {status}
        </p>
        {view.phase === 'heard' && (
          <button type="button" className="vm-btn vm-cancel" onClick={() => conv.current?.cancelHeard()}>
            {t.voiceSendCancel}
          </button>
        )}
        {recite && view.phase === 'reading' && (
          <div className="vm-recite">
            <p>
              {fmt(v.recited, { ref: '\u0000' }).split('\u0000')[0]}
              <bdi lang="ar" dir="rtl">
                {recite.name}: {recite.from === recite.to ? digits(recite.from) : `\u2066${digits(recite.from)}–${digits(recite.to)}\u2069`}
              </bdi>
            </p>
            <a className="vm-credit" href={recitationSite} target="_blank" rel="noopener noreferrer">
              {RECITATION[lang].credit}
            </a>
          </div>
        )}
        {note && <p className="vm-note">{note}</p>}
        {ref && (
          <p className="vm-ref">
            {ref.ref && (
              <bdi lang="ar" dir="rtl">
                {ref.ref}
              </bdi>
            )}
            {ref.ref && ref.label && ' · '}
            {ref.label}
          </p>
        )}
        {tip && <p className="vm-tip">{v.iosTip}</p>}
      </div>
      <div className="vm-actions">
        <button type="button" className="vm-btn" onClick={end}>
          <span aria-hidden="true">×</span> {v.end}
        </button>
        <button
          type="button"
          className="vm-btn"
          aria-pressed={muted}
          onClick={() => {
            conv.current?.toggleMute()
            setMuted(conv.current?.muted ?? false)
          }}
        >
          {muted ? v.unmute : v.mute}
        </button>
        <button
          type="button"
          className="vm-btn"
          onClick={() => {
            end()
            requestAnimationFrame(() => document.querySelector('.turn:last-child')?.scrollIntoView({ block: 'start' }))
          }}
        >
          {v.show}
        </button>
      </div>
    </dialog>
  )
}
