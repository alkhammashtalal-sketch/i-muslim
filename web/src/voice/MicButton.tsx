import { useI18n } from '../i18n'
import { numFmt } from '../quran/format'
import { MIC } from './mic-strings'
import { useRecorder, type RecError } from './useRecorder'
import './voice.css'

const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true, focusable: false }
const IconMic = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" {...base}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0" />
    <path d="M12 18v3" />
  </svg>
)
const IconStop = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
  </svg>
)

/**
 * «اسأل بصوتك»: press to record; it stops by itself after 3 s of silence (reply 0035), or press again to stop. The
 * transcript goes to `onText` (the question box); the user reviews it and presses send. Nothing is sent automatically here (voice conversation, VoiceChat.tsx, may send it
 * after a visible delay). `onStart` runs on the press that starts recording; `invite` shows the quiet «تكلّم» state
 * after a reply was read aloud: the microphone still opens only when pressed.
 */
export function MicButton({
  onText,
  disabled,
  onStart,
  invite,
}: {
  onText: (text: string) => void
  disabled?: boolean
  onStart?: () => void
  invite?: boolean
}) {
  const { t, lang } = useI18n()
  const num = numFmt(lang)
  const { state, start, stop, cancel, reset } = useRecorder(onText)

  const message: Record<RecError, string> = {
    unsupported: t.voiceUnsupported,
    denied: t.voiceDenied,
    nomic: t.voiceNoMic,
    network: t.errConnection,
    unclear: t.voiceUnclear,
    limit: t.voiceLimit,
    toolong: t.voiceTooLong,
    failed: t.voiceFailed,
  }

  const recording = state.kind === 'recording'
  const busy = state.kind === 'transcribing'
  const inviting = !!invite && state.kind === 'idle'
  const status = recording
    ? t.voiceListening
    : busy
      ? t.voiceTranscribing
      : state.kind === 'error'
        ? message[state.reason]
        : inviting
          ? t.voiceTalk
          : ''
  const label = recording ? t.voiceStop : inviting ? t.voiceTalk : t.voiceAsk

  return (
    <span className="mic">
      <button
        type="button"
        className={`mic-btn${recording ? ' is-recording' : ''}${inviting ? ' is-invite' : ''}`}
        onClick={() => {
          if (recording) return stop()
          onStart?.()
          reset()
          void start()
        }}
        disabled={disabled || busy}
        aria-label={label}
        aria-pressed={recording}
        title={label}
      >
        {recording ? <IconStop /> : <IconMic />}
      </button>
      {recording && (
        <button type="button" className="mic-cancel" onClick={cancel} aria-label={t.voiceCancel} title={t.voiceCancel}>
          ×
        </button>
      )}
      <span className={`mic-status${status ? ' is-visible' : ''}${state.kind === 'error' ? ' is-error' : ''}`} role="status" aria-live="polite">
        {status}
        {recording && <span className="mic-time"> {num(state.seconds)}</span>}
        {recording && state.seconds >= 1 && <span className="mic-hint">{MIC[lang].voiceAutoStop}</span>}
      </span>
    </span>
  )
}
