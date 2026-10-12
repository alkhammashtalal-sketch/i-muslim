// The tafsir box under an ayah on the answer card (V2_UI_SPEC §5-8, c04-c07, c10-c15, c20). The source buttons sit
// above the explanation, not above the ayah: «الأنسب» first with a star, the rest in order, «الكل» last in the same row;
// one source → no buttons. Order: the index gives no separate closeness score per tafsir, so it is the fixed order of
// §7.4 (al-Muyassar, then al-Saʿdi). Texts are from D1, verbatim: al-Muyassar from the answer (tafsirExcerpt) or the
// passage, al-Saʿdi from GET /api/passage/:id (empty for 50 ayat in the source: then it is not offered).
import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { PassageResponse, Quote } from '../../../../shared/api'
import { numberLocale, useI18n } from '../../i18n'
import { getAyah } from '../../quran/api'
import { fmt } from '../../quran/format'
import { IconLayers, IconPin, IconStar } from './icons'
import { declineSuggestion, markTipSeen, notePick, setPin, shouldSuggest, useSources } from './pins'
import { SourceLine } from './SourceSheets'
import type { SourceKey } from './sources'
import { ANSWER } from './strings'

type Item = { key: 'muyassar' | 'saadi'; short: string; full: string; paragraphs: string[]; url?: string }

/** Ayah quotations inside a tafsir (﴿…﴾) are set in the Mushaf face; the words are not changed. */
function TafsirText({ text }: { text: string }) {
  const parts = text.split(/(﴿[^﴾]*﴾)/u)
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('﴿') ? (
          <span key={i} className="v2-tafsir-ayah" lang="ar">
            {p}
          </span>
        ) : (
          p
        ),
      )}
    </>
  )
}

// The first-time tip shows once per device, on the first answer with more than one source: the first box to claim it.
let tipClaimed = false

export function TafsirBox({ q, answerId, onSource }: { q: Quote; answerId: string; onSource: (s: SourceKey, name?: string, url?: string) => void }) {
  const { t, lang } = useI18n()
  const a = ANSWER[lang]
  const nf = new Intl.NumberFormat(numberLocale(lang))
  const store = useSources()
  const m = q.id.match(/^quran:(\d{1,3}):(\d{1,3})$/)
  const [p, setP] = useState<PassageResponse | null | 'error'>(null)
  const [sel, setSel] = useState<string | null>(null)
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [tip, setTip] = useState(false)
  const chipsRef = useRef<HTMLDivElement>(null)
  const okRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!m) return
    let alive = true
    getAyah(Number(m[1]), Number(m[2])).then(
      (r) => alive && setP(r),
      () => alive && setP('error'),
    )
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.id])

  const passage = p && p !== 'error' ? p : null
  const pm = passage?.tafsir?.find((x) => x.key === 'muyassar')
  const ps = passage?.tafsir?.find((x) => x.key === 'saadi')
  const items: Item[] = []
  const muyassar = q.tafsirExcerpt ?? pm?.text
  if (muyassar) items.push({ key: 'muyassar', short: a.muyassar, full: t.tafsirMuyassar, paragraphs: q.tafsirExcerpt ? [q.tafsirExcerpt] : (pm?.paragraphs ?? [muyassar]), url: pm?.url })
  if (ps && !ps.empty) items.push({ key: 'saadi', short: a.saadi, full: t.tafsirSaadi, paragraphs: ps.paragraphs ?? [ps.text], url: ps.url })
  const many = items.length > 1
  const best = items[0]
  const pin = store.pins.tafsir
  const pinnedMissing = pin !== 'best' && pin !== 'all' && !!passage && !items.some((x) => x.key === pin)
  const initial = pin === 'all' && many ? 'all' : items.some((x) => x.key === pin) ? pin : best?.key
  const current = sel ?? initial

  // The tip, once: claimed by the first box with more than one source while it has not been seen on this device.
  useEffect(() => {
    if (!many || store.tipSeen || tipClaimed) return
    tipClaimed = true
    setTip(true)
  }, [many, store.tipSeen])
  useEffect(() => {
    if (!tip) return
    chipsRef.current?.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior })
    okRef.current?.focus()
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && done()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [tip])
  const done = () => {
    setTip(false)
    markTipSeen()
  }

  if (!best) return null

  const choose = (key: string) => {
    setSel(key)
    if (key !== 'all' && key !== best.key && key !== pin) notePick(key, answerId)
  }
  const suggestFor = current !== 'all' && current !== best.key && shouldSuggest(store, 'tafsir', current) ? items.find((x) => x.key === current) : undefined
  const shown = current === 'all' ? null : (items.find((x) => x.key === current) ?? best)

  const chip = (key: string, label: ReactNode, extra?: ReactNode, ariaLabel?: string) => (
    <button key={key} type="button" aria-pressed={current === key} aria-label={ariaLabel} className={`v2-chip${current === key ? ' is-on' : ''}`} onClick={() => choose(key)}>
      {label}
      {extra}
    </button>
  )

  return (
    <div className="v2-tbox tafsir-excerpt">
      <div className="v2-tbox-title">{a.tafsir}</div>
      {many && (
        <div ref={chipsRef} className={`v2-chips${tip ? ' is-spot' : ''}`} role="group" aria-label={a.tafsirGroup}>
          {items.map((x, i) =>
            chip(
              x.key,
              x.short,
              <>
                {i === 0 && (
                  <span className="v2-best">
                    <IconStar />
                    {a.best}
                  </span>
                )}
                {pin === x.key && (
                  <span className="v2-pinmark" aria-label={a.pinned}>
                    <IconPin />
                  </span>
                )}
              </>,
            ),
          )}
          {chip(
            'all',
            <>
              <span className="v2-chip-icon">
                <IconLayers />
              </span>
              {a.all}
            </>,
          )}
        </div>
      )}
      {tip && (
        <>
          <div className="v2-tip-backdrop" aria-hidden="true" onClick={done} />
          <div className="v2-tip" role="dialog" aria-modal="true" aria-labelledby={`${answerId}-tip`}>
            <p className="v2-tip-title" id={`${answerId}-tip`}>
              {a.tipTitle}
            </p>
            <p className="v2-tip-body">{a.tipBody}</p>
            <div className="v2-tip-foot">
              <span className="v2-tip-once">{a.tipOnce}</span>
              <button ref={okRef} type="button" className="v2-tip-ok" onClick={done}>
                {a.tipOk}
              </button>
            </div>
          </div>
        </>
      )}
      {pinnedMissing && <p className="v2-tbox-note">{a.pinnedMissing}</p>}
      {suggestFor && (
        <div className="v2-suggest">
          <span className="v2-suggest-lead">
            <IconPin size={18} />
          </span>
          <span className="v2-suggest-text">{fmt(a.suggest, { name: suggestFor.short })}</span>
          <button type="button" className="v2-suggest-yes" onClick={() => setPin('tafsir', suggestFor.key)}>
            {a.pinIt}
          </button>
          <button type="button" className="v2-suggest-no" onClick={() => declineSuggestion(suggestFor.key)}>
            {a.no}
          </button>
        </div>
      )}
      {shown ? (
        <>
          <div className="v2-tafsir-text" lang="ar" dir="rtl">
            {shown.paragraphs.map((x, i) => (
              <p key={i}>
                <TafsirText text={x} />
              </p>
            ))}
          </div>
          <SourceLine source={shown.key} onOpen={(s, n) => onSource(s, n, shown.url)} />
        </>
      ) : (
        items.map((x, i) => (
          <section key={x.key} className="v2-all-item">
            <div className="v2-all-head">
              <span className={`v2-all-num${i === 0 ? ' is-first' : ''}`}>{nf.format(i + 1)}</span>
              <span className="v2-all-name">{x.short}</span>
              {i === 0 && (
                <span className="v2-best">
                  <IconStar />
                  {a.best}
                </span>
              )}
            </div>
            <div className={`v2-tafsir-text${i > 0 && !open[x.key] ? ' is-clamped' : ''}`} lang="ar" dir="rtl">
              {x.paragraphs.map((y, j) => (
                <p key={j}>
                  <TafsirText text={y} />
                </p>
              ))}
            </div>
            {i > 0 && !open[x.key] && (
              <button type="button" className="v2-readmore" onClick={() => setOpen((o) => ({ ...o, [x.key]: true }))}>
                {a.readMore}
              </button>
            )}
            <SourceLine source={x.key} onOpen={(s, n) => onSource(s, n, x.url)} />
          </section>
        ))
      )}
    </div>
  )
}
