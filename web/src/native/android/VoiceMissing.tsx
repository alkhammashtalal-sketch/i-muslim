// The Android app with no voice for the language (reply 0067): what to install, and a button to Android's own screen
// for it. Shown where the iPhone says «no voice» (VoiceChat.tsx) and as the voice conversation's tip (VoiceMode.tsx);
// the reply is then not read in another language's voice (speech.ts).
import type { Lang } from '../../../../shared/api'
import { openVoiceInstall } from './speech'
import { ANDROID } from './strings'

export function VoiceMissing({ lang, className }: { lang: Lang; className?: string }) {
  const s = ANDROID[lang]
  return (
    <span className={className} role="status" data-testid="android-voice-missing">
      {s.voiceMissing}{' '}
      <button type="button" className="text-link" onClick={() => void openVoiceInstall()}>
        {s.installVoice}
      </button>
    </span>
  )
}
