import { Rose } from '../components/Ornaments'
import { Sheet } from '../components/Sheet'
import { useI18n } from '../i18n'
import { fmt, numFmt } from '../quran/format'
import { STEPS, useProgress } from './progress'
import './starter.css'

export { STEPS }

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

/** Ten steps; each opens its page (reply 0036 part ب), whose question goes to the conversation through the normal
 *  answer engine. A step asked or finished on this device shows «قُرئت». */
export function StarterSheet({ open, onClose, onOpen }: { open: boolean; onClose: () => void; onOpen: (step: string) => void }) {
  const { t, lang } = useI18n()
  const num = numFmt(lang)
  const { read, done } = useProgress()

  return (
    <Sheet open={open} onClose={onClose} title={t.starterTitle}>
      <p className="card-body">{t.starterIntro}</p>
      <ol className="starter-steps">
        {STEPS.map((s, i) => {
          const seen = read.includes(s.id) || done.includes(s.id)
          return (
            <li key={s.id}>
              <button type="button" className="starter-step" onClick={() => onOpen(s.id)}>
                <span className="starter-num" aria-hidden="true">
                  {num(i + 1)}
                </span>
                <span className="starter-text">
                  <span className="sr-only">{fmt(t.starterStep, { n: num(i + 1) })}: </span>
                  <span className="starter-step-title">{s.title[lang] ?? s.title.ar}</span>
                  <span className="starter-step-q">{s.q[lang] ?? s.q.ar}</span>
                </span>
                {seen && <span className="badge badge-verified starter-read">✓ {t.starterRead}</span>}
              </button>
            </li>
          )
        })}
      </ol>
      <p className="small">{fmt(t.starterSimpleHint, { name: t.simpleMode })}</p>
    </Sheet>
  )
}
