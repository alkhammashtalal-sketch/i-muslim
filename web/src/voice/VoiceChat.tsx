import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '../i18n'
import type { Heard } from '../trust/speakable'
import { onReply } from './bus'
import { MicButton } from './MicButton'
import { startReading } from './reply'
import { primeSpeech, type Reading } from './speaker'
import { openSession, voiceModeEnabled, type VoiceSession } from './session'
import { VoiceMode } from './VoiceMode'
import { VOICE_MODE } from './voicemode-strings'
import './voice.css'

// «محادثة صوتية» (command 12). Off by default; the user turns it on, and the choice stays on this device.
// When on: a transcribed question is sent after a visible 3-second delay that can be cancelled; the reply is read
// aloud with the device voices (what may be read: trust/speakable.ts); then a quiet «تكلّم» invites the next
// question, and the microphone opens only when pressed. Reading stops on the stop button, the microphone,
// navigation, a closed sheet, a new question, a language change, or leaving the page.

const KEY = 'imuslim.voiceChat.v1'
export const SEND_DELAY_MS = 3000

type Phase = 'idle' | 'countdown' | 'waiting' | 'reading' | 'invite' | 'novoice'

const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true, focusable: false }
const IconTalk = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" {...base}>
    <path d="M4 5h16v11H10l-5 4v-4H4z" />
    <path d="M9 9v3M12 8v5M15 9v3" />
  </svg>
)
const IconStop = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <rect x="5" y="5" width="14" height="14" rx="2" fill="currentColor" />
  </svg>
)

function stored(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

/** Takes the place of MicButton next to the question box: the conversation switch, the microphone, and the reading controls. */
export function VoiceChat({ onText, onSend, disabled }: { onText: (text: string) => void; onSend: () => void; disabled?: boolean }) {
  const { t, lang } = useI18n()
  const [on, setOn] = useState(stored)
  const [phase, setPhase] = useState<Phase>('idle')
  const timer = useRef(0)
  const reading = useRef<Reading | null>(null)
  const turn = useRef(0) // bumped on every stop, so a late explanation or voice list cannot start an old reading
  const send = useRef(onSend)
  useEffect(() => {
    send.current = onSend
  })

  const quiet = useCallback(() => {
    window.clearTimeout(timer.current)
    timer.current = 0
    turn.current++
    reading.current?.stop()
    reading.current = null
    setPhase('idle')
  }, [])

  const toggle = () => {
    primeSpeech()
    const next = !on
    setOn(next)
    try {
      localStorage.setItem(KEY, next ? '1' : '0')
    } catch {
      // private mode: the choice lasts for this visit
    }
    quiet()
  }

  const read = useCallback(
    async (heard: Heard) => {
      quiet()
      const my = turn.current
      setPhase('reading')
      const r = await startReading(heard, lang, t, () => my === turn.current)
      if (r === undefined) return
      if (!r) return setPhase('novoice')
      reading.current = r
      const end = await r.done
      if (my !== turn.current) return
      reading.current = null
      setPhase(end === 'ended' ? 'invite' : 'idle')
    },
    [lang, t, quiet],
  )

  // Full-screen voice mode (command 18, hidden unless enabled): it reads replies itself while open.
  const [session, setSession] = useState<VoiceSession | null>(null)

  // Each reply is read while conversation is on (and the full-screen mode is not open).
  useEffect(() => (on && !session ? onReply((heard) => void read(heard)) : undefined), [on, session, read])

  // Stop on navigation, a closed sheet, a new typed question, leaving the page, a language change, and unmount.
  useEffect(() => {
    const hidden = () => {
      if (document.visibilityState === 'hidden') quiet()
    }
    const events: [EventTarget, string][] = [
      [window, 'imuslim:navigate'],
      [window, 'popstate'],
      [window, 'hashchange'],
      [document, 'close'],
      [document, 'submit'],
    ]
    for (const [target, name] of events) target.addEventListener(name, quiet, true)
    document.addEventListener('visibilitychange', hidden)
    return () => {
      for (const [target, name] of events) target.removeEventListener(name, quiet, true)
      document.removeEventListener('visibilitychange', hidden)
      quiet()
    }
  }, [quiet, lang])

  // Typing during the countdown means the user wants to edit: do not send.
  useEffect(() => {
    if (phase !== 'countdown') return
    const box = document.getElementById('q')
    box?.addEventListener('input', quiet)
    return () => box?.removeEventListener('input', quiet)
  }, [phase, quiet])

  const heardText = (text: string) => {
    onText(text)
    if (!on) return
    window.clearTimeout(timer.current)
    setPhase('countdown')
    timer.current = window.setTimeout(() => {
      timer.current = 0
      setPhase('waiting')
      send.current()
    }, SEND_DELAY_MS)
  }

  const mode = voiceModeEnabled()
  return (
    <span className="voice">
      {mode ? (
        <button
          type="button"
          className="voice-toggle"
          onClick={() => {
            // The one press the mode needs: the microphone, audio and speech are all opened inside it (iOS).
            quiet()
            setSession(openSession())
          }}
          aria-haspopup="dialog"
          aria-label={VOICE_MODE[lang].open}
          title={VOICE_MODE[lang].open}
        >
          <IconTalk />
        </button>
      ) : (
        <button
          type="button"
          className={`voice-toggle${on ? ' is-on' : ''}`}
          onClick={toggle}
          aria-pressed={on}
          aria-label={t.voiceChat}
          title={t.voiceChat}
        >
          <IconTalk />
        </button>
      )}
      {session &&
        createPortal(
          <VoiceMode
            session={session}
            onText={onText}
            onSend={() => send.current()}
            onClose={() => setSession(null)}
          />,
          document.body,
        )}
      <span className="voice-mic">
        <MicButton
          onText={heardText}
          disabled={disabled}
          onStart={() => {
            primeSpeech()
            quiet()
          }}
          invite={on && phase === 'invite'}
        />
        {phase === 'countdown' && (
          <span className="voice-bar">
            <span role="status">{t.voiceSendingSoon}</span>
            <button type="button" className="voice-bar-btn" onClick={quiet}>
              {t.voiceSendCancel}
            </button>
          </span>
        )}
        {phase === 'reading' && (
          <span className="voice-bar">
            <span role="status">{t.voiceReading}</span>
            <button type="button" className="voice-bar-btn" onClick={quiet}>
              <IconStop />
              {t.voiceStopReading}
            </button>
          </span>
        )}
        {phase === 'novoice' && (
          <span className="voice-bar is-note" role="status">
            {t.voiceNoVoice}
          </span>
        )}
      </span>
    </span>
  )
}
