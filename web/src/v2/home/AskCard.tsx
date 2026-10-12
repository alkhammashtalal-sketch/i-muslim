import { useEffect, useRef, useState } from 'react'
import type { Draft } from '../../components/Composer'
import { useI18n } from '../../i18n'
import { SUGGESTIONS } from '../../config/suggestions'
import { VoiceChat } from '../../voice/VoiceChat'
import { HOME } from './strings'

const MAX = 500

function IconArrow() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className="icon-back">
      <path d="M19 12H5" />
      <path d="m11 6-6 6 6 6" />
    </svg>
  )
}

/** «اسأل» first (V2 §1, c01): the question box on the home page, in place of the bottom composer. The suggested
 *  questions turn in the placeholder (the dots follow them); a press on «اسأل الآن» with an empty box asks the one shown.
 *  The textarea keeps id="q" so every path that fills the question box (voice, drafts, tests) finds it. */
export function AskCard({ onSubmit, busy, draft }: { onSubmit: (q: string) => void; busy: boolean; draft?: Draft | null }) {
  const { t, lang } = useI18n()
  const s = HOME[lang]
  const list = SUGGESTIONS[lang]
  // A draft («ask about this ayah», the judges' page) fills the box and focuses it; it is never sent by itself.
  const [value, setValue] = useState(() => (draft?.text ?? '').slice(0, MAX))
  const [i, setI] = useState(0)
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (draft) ref.current?.focus()
  }, [draft])
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    if (value || reduced || list.length < 2) return
    const id = window.setInterval(() => setI((x) => (x + 1) % list.length), 4000)
    return () => window.clearInterval(id)
  }, [value, reduced, list.length])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`
  }, [value])

  const shown = list[i % list.length] ?? ''
  const submit = () => {
    const q = (value.trim() || shown).slice(0, MAX)
    if (!q || busy) return
    onSubmit(q)
    setValue('')
  }

  return (
    <section className="ask-card" aria-labelledby="ask-card-h">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <div className="ask-top">
          <h2 className="ask-label" id="ask-card-h">
            <svg width="16" height="16" viewBox="-12 -12 24 24" aria-hidden="true" focusable="false">
              <use href="#rose" />
            </svg>
            {s.askLabel}
          </h2>
          <span className="ask-note">{s.askNote}</span>
        </div>
        <label htmlFor="q" className="sr-only">
          {t.inputLabel}
        </label>
        <textarea
          id="q"
          ref={ref}
          rows={1}
          value={value}
          maxLength={MAX}
          placeholder={shown || t.placeholder}
          enterKeyHint="send"
          autoComplete="off"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              submit()
            }
          }}
        />
        <div className="ask-foot">
          <div className="ask-dots" dir="ltr" aria-hidden="true">
            {!value && list.slice(0, 6).map((q, k) => <span key={q} className={k === i % Math.min(list.length, 6) ? 'is-on' : ''} />)}
          </div>
          <div className="ask-actions">
            <VoiceChat
              onText={(text) => {
                setValue(text.slice(0, MAX))
                ref.current?.focus()
              }}
              onSend={submit}
              disabled={busy}
            />
            {/* «send» like the conversation's composer button: one question button on every screen for the tests. */}
            <button type="submit" className="ask-now send" disabled={busy}>
              {s.askNow}
              <IconArrow />
            </button>
          </div>
        </div>
      </form>
    </section>
  )
}
