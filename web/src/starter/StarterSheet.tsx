import { useState } from 'react'
import type { Lang } from '../../../shared/api'
import path from '../config/starter-path.json'
import { Rose } from '../components/Ornaments'
import { Sheet } from '../components/Sheet'
import { useI18n } from '../i18n'
import { fmt, numFmt } from '../quran/format'
import './starter.css'

type Step = { id: string; title: Record<Lang, string>; q: Record<Lang, string> }
export const STEPS = (path as { steps: Step[] }).steps

// Which steps were read, on this device only (no tracking on the server).
const KEY = 'imuslim.starter.v1'
function loadRead(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '{}') as { read?: string[] }
    return Array.isArray(v.read) ? v.read : []
  } catch {
    return []
  }
}
function saveRead(read: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ read }))
  } catch {
    // storage unavailable
  }
}

/** Home card that opens the starter path. */
export function StarterCard({ onOpen }: { onOpen: () => void }) {
  const { t } = useI18n()
  return (
    <button type="button" className="starter-card" onClick={onOpen} aria-haspopup="dialog">
      <Rose size={25} />
      <span className="starter-card-text">
        <span className="starter-card-title">{t.starterCardTitle}</span>
        <span className="starter-card-sub">{t.starterCardSub}</span>
      </span>
    </button>
  )
}

/** Ten steps; each sends its question to the conversation, through the normal answer engine. */
export function StarterSheet({ open, onClose, onAsk }: { open: boolean; onClose: () => void; onAsk: (q: string) => void }) {
  const { t, lang } = useI18n()
  const num = numFmt(lang)
  const [read, setRead] = useState<string[]>(loadRead)

  const choose = (s: Step) => {
    const next = read.includes(s.id) ? read : [...read, s.id]
    setRead(next)
    saveRead(next)
    onAsk(s.q[lang] ?? s.q.ar)
  }

  return (
    <Sheet open={open} onClose={onClose} title={t.starterTitle}>
      <p className="card-body">{t.starterIntro}</p>
      <ol className="starter-steps">
        {STEPS.map((s, i) => {
          const done = read.includes(s.id)
          return (
            <li key={s.id}>
              <button type="button" className="starter-step" onClick={() => choose(s)}>
                <span className="starter-num" aria-hidden="true">
                  {num(i + 1)}
                </span>
                <span className="starter-text">
                  <span className="sr-only">{fmt(t.starterStep, { n: num(i + 1) })}: </span>
                  <span className="starter-step-title">{s.title[lang] ?? s.title.ar}</span>
                  <span className="starter-step-q">{s.q[lang] ?? s.q.ar}</span>
                </span>
                {done && <span className="badge badge-verified starter-read">✓ {t.starterRead}</span>}
              </button>
            </li>
          )
        })}
      </ol>
      <p className="small">{fmt(t.starterSimpleHint, { name: t.simpleMode })}</p>
    </Sheet>
  )
}
