import { useEffect, useRef, useState } from 'react'
import type { PassageResponse, Quote, TafsirText } from '../../../shared/api'
import { Sheet } from '../components/Sheet'
import { Mkp } from '../components/Ornaments'
import { AyahEnd } from './AyahEnd'
import { useI18n } from '../i18n'
import { ExplainBox } from '../trust/ExplainBox'
import { ReviewedBox } from '../trust/ReviewedBox'
import { getAyah } from './api'
import { arabicDigits, ayahOf, displayRef, fmt, numFmt } from './format'
import { quranPath } from './route'
import { webOrigin } from '../api/base'
import { MeaningBlock } from './Meaning'
import { IcBookmark, IcImage, IcNote, IcRepeat } from '../v2/reading/icons'
import { firstWords, isSajda, SURA_TYPE } from '../v2/reading/meta'
import { ListenSection } from '../v2/reading/ListenSection'
import { NoteSheet } from '../v2/reading/NoteSheet'
import { RepeatSheet } from '../v2/reading/RepeatSheet'
import { ShareSheet } from '../v2/reading/ShareSheet'
import { SajdaBadge } from '../v2/reading/SajdaBadge'
import { isBookmarked, toggleBookmark, useReading } from '../v2/reading/store'
import { useAyahReciting } from './recitation'
import { Chips, SourceLine, useReadingStrings, useToast } from '../v2/reading/ui'
import { meaningSource, type ReportLoc } from '../v2/sources/place'
import { shareLink } from '../native/share'
import { saadiOffline } from '../native/offline-data'

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

type TafsirChoice = 'muyassar' | 'saadi' | 'all'

function Paragraphs({ items }: { items: string[] }) {
  return (
    <>
      {items.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </>
  )
}

/** One tafsir's text, folded to three lines when `fold` (the «all» view after the first, V2 §6). */
function TafsirBody({ tafsir, fold, id }: { tafsir: TafsirText; fold?: boolean; id: string }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(!fold)
  if (tafsir.empty) return <p className="rd-tafsir-text">{t.saadiEmpty}</p>
  return (
    <>
      <div className={`rd-tafsir-text${open ? '' : ' is-collapsed'}`} lang="ar" dir="rtl" id={id}>
        <Paragraphs items={tafsir.paragraphs ?? [tafsir.text]} />
      </div>
      {fold && (
        <button type="button" className="rd-more" aria-expanded={open} aria-controls={id} onClick={() => setOpen((v) => !v)}>
          {open ? t.readLess : t.readMore}
        </button>
      )}
    </>
  )
}

/** The ayah's panel in the Mushaf (reply 0032: board AyahActions for the actions, AyahAfter for the parts, c16/c17):
 *  the actions (bookmark, note, repeat, image), the ayah in its gold frame with its reference (sura · number ·
 *  Makki/Madani · page) and source line, «listen to the ayah», then the tafsir with [al-Muyassar] [al-Saʿdi] [all]
 *  (no «most fitting» star: there is no question here). No English part in the Arabic interface; elsewhere the
 *  meaning in the reader's language right under the ayah. */
export function AyahSheet({ open, sura, aya, suraName, suraAyat, onClose, onNav, onAsk, onReport }: Props) {
  // The meaning in the content language (reply 0033 §أ1): the interface's, or another served one with English buttons.
  const { t, lang, content } = useI18n()
  const r = useReadingStrings()
  const num = numFmt(lang)
  const [state, setState] = useState<{ id: string; p: PassageResponse | null } | 'error' | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [copied, setCopied] = useState<'copy' | 'share' | null>(null)
  const [choice, setChoice] = useState<TafsirChoice>('muyassar')
  const [sub, setSub] = useState<'note' | 'repeat' | 'share' | null>(null)
  const [toast, say] = useToast()
  useReading() // re-render when a bookmark changes
  const bodyRef = useRef<HTMLDivElement>(null)
  const touch = useRef<{ x: number; y: number } | null>(null)
  const id = `quran:${sura}:${aya}`

  useEffect(() => {
    if (!open) return
    let alive = true
    getAyah(sura, aya, content).then(
      (p) => alive && setState({ id: `${id}|${content}`, p }),
      () => alive && setState('error'),
    )
    bodyRef.current?.closest('.sheet-body')?.scrollTo({ top: 0 })
    return () => {
      alive = false
    }
  }, [open, sura, aya, id, content, attempt])

  const loaded = !!state && state !== 'error' && state.id === `${id}|${content}`
  const p = loaded ? state.p : null
  const title = lang === 'ar' ? fmt(t.ayahSheetTitle, { name: suraName, a: arabicDigits(aya) }) : fmt(t.ayahSheetTitle, { s: num(sura), a: num(aya) })
  const hasPrev = aya > 1
  const hasNext = aya < suraAyat
  const rtl = document.documentElement.dir === 'rtl'
  const marked = isBookmarked(sura, aya)
  const reciting = useAyahReciting(id)

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
    const url = `${webOrigin()}${quranPath(sura, aya)}`
    const text = `﴿${p.text}﴾ [${displayRef(p.ref, lang)}]`
    // The app shares the ayah with its reference and the App Store link instead of our page's (reply 0037 §3.3).
    if ((await shareLink({ title: displayRef(p.ref, lang), text, url }, { text, lang })) === 'shared') return
    try {
      await navigator.clipboard.writeText(url)
      flash('share')
    } catch {
      // clipboard blocked
    }
  }

  const muyassar = p?.tafsir?.find((x) => x.key === 'muyassar')
  const saadi = p?.tafsir?.find((x) => x.key === 'saadi')
  const tafsirs = [muyassar, saadi].filter((x): x is TafsirText => !!x)
  // The app's own copy, without a connection, has no al-Saʿdi: one small line says it comes with the connection
  // (reply 0037 §3.5). The Worker always sends an al-Saʿdi entry, so online nothing changes.
  const saadiLater = saadiOffline(p)
  const shownChoice: TafsirChoice = choice === 'saadi' && !saadi ? 'muyassar' : choice
  const page = p?.ayah?.page
  const type = SURA_TYPE[sura]
  const refLine = [
    lang === 'ar' ? suraName : fmt(t.suraNum, { n: num(sura) }),
    lang === 'ar' ? arabicDigits(aya) : num(aya),
    type ? r[type] : null,
    page ? fmt(r.page, { n: lang === 'ar' ? arabicDigits(page) : num(page) }) : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const meaning = p?.meaning ? (
    <MeaningBlock meaning={p.meaning} textEn={p.text_en} />
  ) : (
    p?.text_en && (
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
        {p.ayah?.urlEn && (
          <a className="text-link" href={p.ayah.urlEn} target="_blank" rel="noopener noreferrer">
            {t.originalSource}
          </a>
        )}
      </section>
    )
  )

  // The ayah's place, for «أبلغ عن خطأ» in its «عن المصدر» sheets (reply 0033 §أ3).
  // A meaning from QuranEnc is reported with its source and version, not KSU's.
  const byKind = lang !== 'ar' ? meaningSource(p?.meaning) : undefined
  const loc: ReportLoc = {
    type: 'ayah',
    id: `${sura}:${aya}`,
    lang,
    source: 'ksu',
    label: `${lang === 'ar' ? suraName : fmt(t.suraNum, { n: num(sura) })} ${lang === 'ar' ? arabicDigits(aya) : num(aya)}`,
    ...(byKind ? { byKind } : {}),
  }
  const sourceOf = (x: TafsirText) =>
    x.key === 'saadi' ? <SourceLine k="saadi" name={r.srcSaadi} via={r.srcKsu} url={x.url} loc={loc} /> : <SourceLine k="muyassar" name={r.srcMuyassar} via={r.srcKsu} url={x.url} loc={loc} />

  return (
    <>
      <Sheet open={open} onClose={onClose} title={title}>
        <div
          ref={bodyRef}
          className="ayah-sheet rd-panel"
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
              <section className="rd-section" aria-labelledby="ayp-ayah-h">
                <h3 className="rd-section-title" id="ayp-ayah-h">
                  {r.ayahHeading}
                </h3>
                <div className={`rd-ayah-box${reciting ? ' is-reciting' : ''}`}>
                  <p className="sacred sacred-reader" lang="ar" dir="rtl" data-ayah={p.id}>
                    <AyahEnd text={p.text}>
                      <Mkp n={arabicDigits(ayahOf(p.id))} size={28} />
                    </AyahEnd>
                  </p>
                  <div className="rd-ayah-ref">{refLine}</div>
                  {isSajda(sura, aya) && <SajdaBadge />}
                  {p.verified && (
                    <div className="quote-meta">
                      <span className="badge badge-verified">✓ {t.badgeVerified}</span>
                    </div>
                  )}
                </div>
                <SourceLine k="mushaf" name={r.srcMushaf} via={r.srcKsu} url={p.url} loc={loc} />
                {lang !== 'ar' && meaning}
              </section>

              <div className="rd-acts" role="group" aria-label={r.moreActions}>
                <button
                  type="button"
                  className="rd-act"
                  aria-pressed={marked}
                  onClick={() => say(toggleBookmark(sura, aya, firstWords(p.text)) ? r.bookmarkAdded : r.bookmarkRemoved)}
                >
                  <span>
                    <IcBookmark filled={marked} />
                  </span>
                  {r.actBookmark}
                </button>
                <button type="button" className="rd-act" aria-haspopup="dialog" onClick={() => setSub('note')}>
                  <span>
                    <IcNote />
                  </span>
                  {r.actNote}
                </button>
                <button type="button" className="rd-act" aria-haspopup="dialog" onClick={() => setSub('repeat')}>
                  <span>
                    <IcRepeat />
                  </span>
                  {r.actRepeat}
                </button>
                <button type="button" className="rd-act" aria-haspopup="dialog" onClick={() => setSub('share')}>
                  <span>
                    <IcImage />
                  </span>
                  {r.actImage}
                </button>
              </div>

              <ListenSection sura={sura} aya={aya} />

              {(tafsirs.length > 0 || saadiLater) && (
                <section className="rd-section tafsir" aria-labelledby="ayp-taf-h">
                  <h3 className="rd-section-title" id="ayp-taf-h">
                    {r.tafsirHeading}
                  </h3>
                  {lang !== 'ar' && t.tafsirInArabic && <p className="small">{t.tafsirInArabic}</p>}
                  {saadiLater && (
                    <p className="small saadi-later" role="note">
                      {t.saadiOnline}
                    </p>
                  )}
                  {tafsirs.length > 1 && (
                    <Chips<TafsirChoice>
                      label={r.tafsirGroup}
                      value={shownChoice}
                      onChange={setChoice}
                      options={[
                        { value: 'muyassar', label: r.muyassar },
                        { value: 'saadi', label: r.saadi },
                        { value: 'all', label: r.all },
                      ]}
                    />
                  )}
                  {shownChoice === 'all' ? (
                    <ol className="rd-all" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {tafsirs.map((x, i) => (
                        <li key={x.key} className="rd-all-item">
                          <h4 className="rd-section-title" style={{ marginTop: 10 }}>
                            <span className="rd-all-num">{lang === 'ar' ? arabicDigits(i + 1) : num(i + 1)}</span>
                            {x.key === 'saadi' ? r.srcSaadi : r.srcMuyassar}
                          </h4>
                          <TafsirBody tafsir={x} fold={i > 0} id={`taf-all-${x.key}`} />
                          {sourceOf(x)}
                        </li>
                      ))}
                    </ol>
                  ) : shownChoice === 'saadi' && saadi ? (
                    <div>
                      <TafsirBody key={`${id}-saadi`} tafsir={saadi} id="saadi-text" />
                      {sourceOf(saadi)}
                    </div>
                  ) : (
                    muyassar && (
                      <div id="muyassar-h">
                        <TafsirBody key={`${id}-m`} tafsir={muyassar} id="muyassar-text" />
                        {sourceOf(muyassar)}
                        <ExplainBox id={id} sourceName={t.tafsirMuyassar} sourceUrl={muyassar.url} />
                        <ReviewedBox id={id} sourceUrl={muyassar.url} />
                      </div>
                    )
                  )}
                </section>
              )}

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
          {toast}
        </div>
      </Sheet>
      {p && (
        <>
          <NoteSheet open={sub === 'note'} onClose={() => setSub(null)} sura={sura} aya={aya} suraName={suraName} page={page} text={p.text} />
          <RepeatSheet open={sub === 'repeat'} onClose={() => setSub(null)} sura={sura} aya={aya} suraName={suraName} suraAyat={suraAyat} />
          <ShareSheet open={sub === 'share'} onClose={() => setSub(null)} sura={sura} aya={aya} suraName={suraName} text={p.text} />
        </>
      )}
    </>
  )
}
