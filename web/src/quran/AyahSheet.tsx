import { useEffect, useRef, useState } from 'react'
import type { PassageResponse, Quote, TafsirText } from '../../../shared/api'
import { Sheet } from '../components/Sheet'
import { Mkp, MushafFrame } from '../components/Ornaments'
import { AyahEnd } from './AyahEnd'
import { useI18n } from '../i18n'
import { ExplainBox } from '../trust/ExplainBox'
import { ReviewedBox } from '../trust/ReviewedBox'
import { getAyah } from './api'
import { arabicDigits, ayahOf, displayRef, fmt, numFmt, suraTitle } from './format'
import { quranPath } from './route'
import { MeaningBlock } from './Meaning'

type Props = {
  open: boolean
  sura: number
  aya: number
  suraName: string
  suraAyat: number
  onClose: () => void
  onNav: (aya: number) => void
  onAsk: (draft: string) => void
  onReport: (q: Quote) => void
}

function Paragraphs({ items }: { items: string[] }) {
  return (
    <>
      {items.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </>
  )
}

function SourceLink({ url, label }: { url: string; label?: string }) {
  const { t } = useI18n()
  return (
    <a className="text-link" href={url} target="_blank" rel="noopener noreferrer">
      {label ?? t.originalSource}
    </a>
  )
}

function Saadi({ tafsir }: { tafsir: TafsirText }) {
  const { t, lang } = useI18n()
  const [expanded, setExpanded] = useState(false)
  const num = numFmt(lang)
  const range = tafsir.ref.match(/تفسير الآيات (\d+)–(\d+)/)
  const long = tafsir.text.length > 220
  return (
    <section className="section tafsir" aria-labelledby="saadi-h">
      <h3 className="section-label" id="saadi-h">
        {t.tafsirSaadi}
        {range && <span className="badge">{fmt(t.saadiRange, { from: num(Number(range[1])), to: num(Number(range[2])) })}</span>}
      </h3>
      {tafsir.empty ? (
        <p className="card-body">{t.saadiEmpty}</p>
      ) : (
        <>
          <div className={`tafsir-text${long && !expanded ? ' is-collapsed' : ''}`} lang="ar" dir="rtl" id="saadi-text">
            <Paragraphs items={tafsir.paragraphs ?? [tafsir.text]} />
          </div>
          {long && (
            <button type="button" className="text-link" aria-expanded={expanded} aria-controls="saadi-text" onClick={() => setExpanded((v) => !v)}>
              {expanded ? t.readLess : t.readMore}
            </button>
          )}
        </>
      )}
      <SourceLink url={tafsir.url} />
    </section>
  )
}

export function AyahSheet({ open, sura, aya, suraName, suraAyat, onClose, onNav, onAsk, onReport }: Props) {
  const { t, lang } = useI18n()
  const num = numFmt(lang)
  const [state, setState] = useState<{ id: string; p: PassageResponse | null } | 'error' | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [copied, setCopied] = useState<'copy' | 'share' | null>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const touch = useRef<{ x: number; y: number } | null>(null)
  const id = `quran:${sura}:${aya}`

  useEffect(() => {
    if (!open) return
    let alive = true
    // The meaning in the reader's language comes with the ayah in seven languages (command 22).
    getAyah(sura, aya, lang).then(
      (p) => alive && setState({ id: `${id}|${lang}`, p }),
      () => alive && setState('error'),
    )
    bodyRef.current?.closest('.sheet-body')?.scrollTo({ top: 0 })
    return () => {
      alive = false
    }
  }, [open, sura, aya, id, lang, attempt])


  const loaded = !!state && state !== 'error' && state.id === `${id}|${lang}`
  const p = loaded ? state.p : null
  const title = lang === 'ar' ? fmt(t.ayahSheetTitle, { name: suraName, a: arabicDigits(aya) }) : fmt(t.ayahSheetTitle, { s: num(sura), a: num(aya) })
  const hasPrev = aya > 1
  const hasNext = aya < suraAyat
  const rtl = document.documentElement.dir === 'rtl'

  const flash = (what: 'copy' | 'share') => {
    setCopied(what)
    setTimeout(() => setCopied(null), 1800)
  }
  const copy = async () => {
    if (!p) return
    try {
      await navigator.clipboard.writeText(`﴿${p.text}﴾ [${displayRef(p.ref, lang)}]`)
      flash('copy')
    } catch {
      // clipboard blocked
    }
  }
  const share = async () => {
    if (!p) return
    const url = `${location.origin}${quranPath(sura, aya)}`
    if (navigator.share) {
      try {
        await navigator.share({ title: displayRef(p.ref, lang), text: `﴿${p.text}﴾ [${displayRef(p.ref, lang)}]`, url })
      } catch {
        // dismissed
      }
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      flash('share')
    } catch {
      // clipboard blocked
    }
  }

  const muyassar = p?.tafsir?.find((x) => x.key === 'muyassar')
  const saadi = p?.tafsir?.find((x) => x.key === 'saadi')

  const english = p?.meaning ? (
    <MeaningBlock meaning={p.meaning} textEn={p.text_en} />
  ) : p?.text_en && (
    <section className="section" aria-labelledby="en-h">
      <h3 className="section-label" id="en-h">
        {t.englishMeaning}
        <span className="badge" lang="en" dir="ltr">
          Sahih International
        </span>
      </h3>
      <p className="translation" lang="en" dir="ltr">
        {p.text_en}
      </p>
      {p.ayah?.urlEn && <SourceLink url={p.ayah.urlEn} />}
    </section>
  )

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div
        ref={bodyRef}
        className="ayah-sheet"
        onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
        onTouchEnd={(e) => {
          const s = touch.current
          touch.current = null
          if (!s) return
          const dx = e.changedTouches[0].clientX - s.x
          const dy = e.changedTouches[0].clientY - s.y
          if (Math.abs(dx) < 60 || Math.abs(dx) < 2 * Math.abs(dy)) return
          // RTL: the next ayah lies to the left, so a rightward swipe brings it in.
          const forward = rtl ? dx > 0 : dx < 0
          if (forward && hasNext) onNav(aya + 1)
          if (!forward && hasPrev) onNav(Math.min(aya - 1, suraAyat))
        }}
      >
        {state === 'error' ? (
          <div className="reader-state">
            <p className="card-body" role="alert">
              {t.errConnection}
            </p>
            <button type="button" className="btn" onClick={() => setAttempt((n) => n + 1)}>
              {t.retry}
            </button>
          </div>
        ) : !loaded ? (
          <p className="small" role="status">
            {t.readerLoading}
          </p>
        ) : !p ? (
          <p className="card-body" role="status">
            {t.readerNotFound}
          </p>
        ) : (
          <>
            <div className="section">
              <MushafFrame title={suraTitle(p.ref)} ayah={p.id}>
                <p className="sacred sacred-reader" lang="ar" dir="rtl">
                  <AyahEnd text={p.text}>
                    <Mkp n={arabicDigits(ayahOf(p.id))} size={30} />
                  </AyahEnd>
                </p>
              </MushafFrame>
              <div className="quote-meta">
                <span className="ref" lang="ar" dir="rtl">
                  {displayRef(p.ref, lang)}
                </span>
                {p.verified && <span className="badge badge-verified">✓ {t.badgeVerified}</span>}
              </div>
            </div>

            {lang !== 'ar' && english}
            {lang !== 'ar' && t.tafsirInArabic && <p className="small">{t.tafsirInArabic}</p>}

            {muyassar && (
              <section className="section tafsir" aria-labelledby="muyassar-h">
                <h3 className="section-label" id="muyassar-h">
                  {t.tafsirMuyassar}
                </h3>
                <div className="tafsir-text" lang="ar" dir="rtl">
                  <Paragraphs items={muyassar.paragraphs ?? [muyassar.text]} />
                </div>
                <SourceLink url={muyassar.url} label={t.muyassarSource} />
                <ExplainBox id={id} sourceName={t.tafsirMuyassar} sourceUrl={muyassar.url} />
                <ReviewedBox id={id} sourceUrl={muyassar.url} />
              </section>
            )}

            {saadi && <Saadi key={id} tafsir={saadi} />}

            <div className="actions">
              <button type="button" className="btn" onClick={copy}>
                {copied === 'copy' ? t.copied : t.copyWithRef}
              </button>
              <button type="button" className="btn" onClick={share}>
                {copied === 'share' ? t.copied : t.share}
              </button>
              <button type="button" className="btn" onClick={() => onReport(p)}>
                {t.report}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => onAsk(lang === 'ar' ? fmt(t.askAboutAyahDraft, { a: arabicDigits(aya), name: suraName }) : fmt(t.askAboutAyahDraft, { s: sura, a: aya }))}
              >
                {t.askAboutAyah}
              </button>
            </div>
          </>
        )}

        <div className="ayah-nav">
          <button type="button" className="btn" disabled={!hasPrev} onClick={() => onNav(Math.min(aya - 1, suraAyat))}>
            {rtl ? '→' : '←'} {t.prevAyah}
          </button>
          <button type="button" className="btn" disabled={!hasNext} onClick={() => onNav(aya + 1)}>
            {t.nextAyah} {rtl ? '←' : '→'}
          </button>
        </div>
      </div>
    </Sheet>
  )
}
