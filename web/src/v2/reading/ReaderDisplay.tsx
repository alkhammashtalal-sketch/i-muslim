import { useEffect, useState } from 'react'
import type { PassageResponse } from '../../../../shared/api'
import { Sheet } from '../../components/Sheet'
import { Mkp } from '../../components/Ornaments'
import { numberLocale, useI18n } from '../../i18n'
import { getAyah } from '../../quran/api'
import { AyahEnd } from '../../quran/AyahEnd'
import { ayahOf, fmt } from '../../quran/format'
import { navigate } from '../../quran/route'
import {
  ayahDigits,
  DEFAULT_DISPLAY,
  QURAN_STEPS,
  resetDisplay,
  setDisplay,
  stepFrom,
  TEXT_STEPS,
  useReaderDisplay,
  type Digits,
  type QuranFont,
  type ReaderDisplay,
} from '../../quran/reader-display'
import { contentDir } from '../lang/served'
import { DISPLAY } from './display-strings'
import { Chips, PageHead } from './ui'
import './display.css'

/** The icon of «الخط والحجم»: a large and a small letter-stroke, drawn like the reader's icons (no script of its own). */
export const IcTextSize = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d="M3.5 6.5V5h10v1.5M8.5 5v14M6.5 19h4" />
    <path d="M14 12v-1h6.5v1M17.25 11v8M16 19h2.5" />
  </svg>
)

/** One size: its name, − and +, and the size now as a percentage of the reader's own (add-on 0072-add60 §5). */
function SizeRow({ id, label, steps, value, onChange }: { id: string; label: string; steps: readonly number[]; value: number; onChange: (v: number) => void }) {
  const { lang } = useI18n()
  const s = DISPLAY[lang]
  const pct = new Intl.NumberFormat(numberLocale(lang), { style: 'percent', maximumFractionDigits: 0 }).format(value)
  const min = value <= steps[0]
  const max = value >= steps[steps.length - 1]
  return (
    <div className="rdd-size" role="group" aria-labelledby={`${id}-l`}>
      <span className="rdd-size-label" id={`${id}-l`}>
        {label}
      </span>
      <span className="rdd-stepper">
        {/* aria-disabled, not disabled, at the ends: the focus stays on the button for the keyboard and VoiceOver. */}
        <button type="button" className="rdd-step" aria-label={fmt(s.smaller, { what: label })} aria-disabled={min} onClick={() => !min && onChange(stepFrom(steps, value, -1))} data-testid={`${id}-minus`}>
          <span aria-hidden="true">−</span>
        </button>
        <output className="rdd-value" aria-live="polite" aria-label={fmt(s.sizeNow, { what: label, pct })} data-testid={`${id}-value`}>
          {pct}
        </output>
        <button type="button" className="rdd-step" aria-label={fmt(s.larger, { what: label })} aria-disabled={max} onClick={() => !max && onChange(stepFrom(steps, value, 1))} data-testid={`${id}-plus`}>
          <span aria-hidden="true">+</span>
        </button>
      </span>
    </div>
  )
}

/** The preview: an ayah, its meaning in the reader's language and its al-Muyassar, all from the data (never typed), in
 *  the sizes and the font chosen. Nothing shows while it loads or without a connection. */
function Preview({ sura, aya, d }: { sura: number; aya: number; d: ReaderDisplay }) {
  const { lang, content } = useI18n()
  const s = DISPLAY[lang]
  const [p, setP] = useState<PassageResponse | null>(null)
  useEffect(() => {
    let alive = true
    getAyah(sura, aya, content).then(
      (x) => alive && setP(x),
      () => alive && setP(null),
    )
    return () => {
      alive = false
    }
  }, [sura, aya, content])
  if (!p) return null
  const muyassar = p.tafsir?.find((x) => x.key === 'muyassar' && !x.empty)
  const meaning = lang === 'ar' ? null : p.meaning ? { text: p.meaning.text, lang: p.meaning.lang } : p.text_en ? { text: p.text_en, lang: 'en' } : null
  return (
    <section className="rd-section rdd-preview ayah-sheet" aria-labelledby="rdd-preview-h" data-testid="display-preview">
      <h3 className="rd-section-title" id="rdd-preview-h">
        {s.preview}
      </h3>
      <p className="sacred sacred-reader rdd-preview-ayah" lang="ar" dir="rtl">
        <AyahEnd text={p.text}>
          <Mkp n={ayahDigits(ayahOf(p.id), d.digits)} size={Math.round(28 * d.quran)} />
        </AyahEnd>
      </p>
      {meaning && (
        <p className="translation" lang={meaning.lang} dir={contentDir(meaning.lang)}>
          {meaning.text}
        </p>
      )}
      {muyassar && (
        <div className="rd-tafsir-text rdd-preview-tafsir" lang="ar" dir="rtl">
          <p>{(muyassar.paragraphs ?? [muyassar.text])[0]}</p>
        </div>
      )}
    </section>
  )
}

/** «الخط والحجم»: the Mushaf's font (the Amiri family, or the King Fahd Complex's Uthmanic Hafs), the three sizes and the ayah markers' digits, each saved at
 *  once and seen at once on the page behind. `sura`/`aya`: the ayah of the preview (the one open, else al-Fatiha 2). */
export function ReaderDisplayPanel({ sura = 1, aya = 2 }: { sura?: number; aya?: number }) {
  const { lang } = useI18n()
  const s = DISPLAY[lang]
  const d = useReaderDisplay()
  const arabicScript = lang === 'ar' || lang === 'ur'
  const same = (Object.keys(DEFAULT_DISPLAY) as (keyof ReaderDisplay)[]).every((k) => d[k] === DEFAULT_DISPLAY[k])
  return (
    <div className="rdd-panel" data-testid="reader-display">
      <section className="rd-section" aria-labelledby="rdd-font-h">
        <h3 className="rd-section-title" id="rdd-font-h">
          {s.fontHeading}
        </h3>
        <Chips<QuranFont>
          label={s.fontHeading}
          value={d.font}
          onChange={(font) => setDisplay({ font })}
          options={[
            // Each name in its own face where it is written in Arabic letters (Arabic, Urdu); the faces draw no Latin.
            { value: 'amiri', label: <span className={arabicScript ? 'rdd-font-amiri' : undefined}>{s.amiri}</span> },
            { value: 'amiri-quran', label: <span className={arabicScript ? 'rdd-font-amiri-quran' : undefined}>{s.amiriQuran}</span> },
            { value: 'hafs', label: <span className={arabicScript ? 'rdd-font-hafs' : undefined}>{s.hafs}</span> },
          ]}
        />
      </section>
      <section className="rd-section" aria-label={s.title}>
        <SizeRow id="rdd-quran" label={s.quranSize} steps={QURAN_STEPS} value={d.quran} onChange={(quran) => setDisplay({ quran })} />
        <SizeRow id="rdd-trans" label={s.translationSize} steps={TEXT_STEPS} value={d.translation} onChange={(translation) => setDisplay({ translation })} />
        <SizeRow id="rdd-tafsir" label={s.tafsirSize} steps={TEXT_STEPS} value={d.tafsir} onChange={(tafsir) => setDisplay({ tafsir })} />
      </section>
      <section className="rd-section" aria-labelledby="rdd-digits-h">
        <h3 className="rd-section-title" id="rdd-digits-h">
          {s.digitsHeading}
        </h3>
        <Chips<Digits>
          label={s.digitsHeading}
          value={d.digits}
          onChange={(digits) => setDisplay({ digits })}
          options={[
            {
              value: 'arab',
              label: (
                <>
                  {s.digitsArab} <bdi className="rdd-digits">{ayahDigits(123, 'arab')}</bdi>
                </>
              ),
            },
            {
              value: 'latn',
              label: (
                <>
                  {s.digitsLatn} <bdi className="rdd-digits">{ayahDigits(123, 'latn')}</bdi>
                </>
              ),
            },
          ]}
        />
      </section>
      <Preview sura={sura} aya={aya} d={d} />
      <button type="button" className="rd-secondary rdd-reset" aria-disabled={same} onClick={() => !same && resetDisplay()} data-testid="display-reset">
        {s.reset}
      </button>
    </div>
  )
}

/** The panel in a sheet over the sura page (leaving the page would end its recitation). */
export function ReaderDisplaySheet({ open, onClose, sura, aya }: { open: boolean; onClose: () => void; sura?: number; aya?: number }) {
  const { lang } = useI18n()
  return (
    <Sheet open={open} onClose={onClose} title={DISPLAY[lang].title}>
      {open && <ReaderDisplayPanel sura={sura} aya={aya} />}
    </Sheet>
  )
}

/** The panel as a page of the reader, /quran/display (from the index's shortcuts). */
export function ReaderDisplayPage() {
  const { lang } = useI18n()
  return (
    <div className="rd-page">
      <PageHead title={DISPLAY[lang].title} onBack={() => (history.state?.muslimToday ? history.back() : navigate('/quran'))} />
      <ReaderDisplayPanel />
    </div>
  )
}
