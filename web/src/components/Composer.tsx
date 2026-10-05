import { useEffect, useRef, useState } from 'react'
import { numberLocale, useI18n } from '../i18n'
import { IconSend } from './Icons'

const MAX = 500

export type Draft = { text: string; n: number }

// A draft (e.g. "ask about this ayah") remounts the composer (key) with the text filled in and focused; it is never sent automatically.
export function Composer({ onSubmit, busy, draft }: { onSubmit: (q: string) => void; busy: boolean; draft?: Draft | null }) {
  const { t, lang } = useI18n()
  const nf = new Intl.NumberFormat(numberLocale(lang))
  const [value, setValue] = useState(() => (draft?.text ?? '').slice(0, MAX))
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (draft) ref.current?.focus()
  }, [draft])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`
  }, [value])

  const trimmed = value.trim()
  const canSend = trimmed.length > 0 && trimmed.length <= MAX && !busy

  const submit = () => {
    if (!canSend) return
    onSubmit(trimmed)
    setValue('')
  }

  return (
    <div className="composer">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <label htmlFor="q" className="sr-only">
          {t.inputLabel}
        </label>
        <textarea
          id="q"
          ref={ref}
          rows={1}
          value={value}
          maxLength={MAX}
          placeholder={t.placeholder}
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
        <button type="submit" className="send" disabled={!canSend} aria-label={t.send}>
          <IconSend />
        </button>
      </form>
      {value.length > MAX - 50 && (
        <p className={`counter${value.length >= MAX ? ' over' : ''}`} aria-live="polite">
          {nf.format(value.length)} / {nf.format(MAX)}
        </p>
      )}
      <p className="footer-line">{t.footer}</p>
    </div>
  )
}
