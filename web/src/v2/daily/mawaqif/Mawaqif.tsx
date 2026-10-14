// «أذكار المواقف» (reply 0050 ج, د; board out/design-v2/mawaqif): the grid of situations with «افتحها تلقائيًا» above
// it, a situation opened whole (its stages, our line, the words to say in a large box, the source and grade, the whole
// hadith folded, «التالي» and a swipe between the stages and adhkar), and the page that explains the three ways to open
// it by itself. Reached at /mawaqif, /mawaqif/<situation>?step=<stage> (the app's link imuslim://mawaqif/…) and
// /mawaqif/auto. The screen stays on while a situation is open. Nothing is shown before the table's review.
import { useEffect, useMemo, useRef, useState, type ReactNode, type TouchEvent } from 'react'
import { useI18n } from '../../../i18n'
import { isNative } from '../../../native/platform'
import { navigate } from '../../../quran/route'
import { getHadith, hadeethEncUrl, type HadithView } from '../hadith-client'
import { openToday, Screen } from '../Screen'
import { fill } from '../format'
import { IcCarAuto, IcMic, IcNfc, SituationIcon } from './icons'
import { boxText, mawaqifRoute, situation, situations, stepsOf, type MawaqifItem, type Situation } from './mawaqif-model'
import { keepScreenOn } from './keep-awake'
import { MAWAQIF } from './strings-mawaqif'
import { QuranBox } from '../adhkar/QuranBox'
import './mawaqif.css'

const grade = (g: string) => (/حسن/.test(g) && !/صحيح/.test(g) ? ' hasan' : '')

function Grid() {
  const { lang } = useI18n()
  const s = MAWAQIF[lang]
  const list = situations()
  return (
    <Screen title={s.title}>
      <a className="mq-auto" href="/mawaqif/auto" onClick={(e) => (e.preventDefault(), openToday('/mawaqif/auto'))} data-testid="mawaqif-auto">
        <span className="mq-auto-ic">
          <IcCarAuto />
        </span>
        <span>
          <b>{s.autoTitle}</b>
          <span>{s.autoSub}</span>
        </span>
      </a>
      {list.length === 0 ? (
        <p className="tool-note">{s.empty}</p>
      ) : (
        <ul className="mq-grid" aria-label={s.grid}>
          {list.map((x) => (
            <li key={x.id}>
              <a className="mq-tile" href={`/mawaqif/${x.id}`} onClick={(e) => (e.preventDefault(), openToday(`/mawaqif/${x.id}`))} data-testid={`mq-${x.id}`}>
                <SituationIcon name={x.icon} />
                <span>{x.name[lang]}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </Screen>
  )
}

/** The whole hadith, folded under the box, loaded when opened; its translation in the content language when the source has it. */
function FullHadith({ item }: { item: MawaqifItem }) {
  const { lang, content } = useI18n()
  const s = MAWAQIF[lang]
  const [open, setOpen] = useState(false)
  const [h, setH] = useState<HadithView | null | 'failed'>(null)
  const [tries, setTries] = useState(0)
  useEffect(() => {
    if (!open) return
    let alive = true
    setH(null)
    void getHadith(item.hadith, content).then((v) => alive && setH(v ?? 'failed'))
    return () => {
      alive = false
    }
  }, [open, item.hadith, content, tries])
  return (
    <details className="mq-full" onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)} data-testid="mq-full">
      <summary>{s.full}</summary>
      {h === 'failed' ? (
        <p className="tool-note">
          {s.failed}{' '}
          <button type="button" className="text-link" onClick={() => setTries((n) => n + 1)}>
            {s.retry}
          </button>
        </p>
      ) : !h ? (
        <p className="tool-note" role="status">
          {s.loading}
        </p>
      ) : (
        <>
          <p className="mq-full-text" lang="ar" dir="rtl">
            {h.text}
          </p>
          {lang !== 'ar' && h.translation && (
            <p className="mq-full-tr" lang={h.translation.lang} dir={h.translation.lang === 'ur' ? 'rtl' : 'ltr'}>
              {h.translation.text}
            </p>
          )}
          <a className="mq-src-link" href={hadeethEncUrl(item.hadith, lang)} target="_blank" rel="noopener">
            {fill(s.hadithNo, { n: item.hadith })}
          </a>
        </>
      )}
    </details>
  )
}

function SituationPage({ sit, step }: { sit: Situation; step: string | null }) {
  const { lang } = useI18n()
  const s = MAWAQIF[lang]
  const steps = useMemo(() => stepsOf(sit), [sit])
  const first = Math.max(0, step ? steps.findIndex((x) => x.stage.id === step) : 0)
  const [at, setAt] = useState(first)
  useEffect(() => setAt(first), [first])
  useEffect(() => keepScreenOn(), [])
  const cur = steps[at]
  const go = (i: number) => {
    const n = Math.min(steps.length - 1, Math.max(0, i))
    setAt(n)
    const st = steps[n].stage.id
    history.replaceState(history.state, '', `/mawaqif/${sit.id}${st ? `?step=${st}` : ''}`)
  }
  // A swipe between the stages and adhkar, as pages turn: the finger moving right is the next in Arabic, left in English.
  const touch = useRef<{ x: number; y: number } | null>(null)
  const rtl = document.documentElement.dir === 'rtl'
  const onStart = (e: TouchEvent) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })
  const onEnd = (e: TouchEvent) => {
    const t = touch.current
    touch.current = null
    if (!t) return
    const dx = e.changedTouches[0].clientX - t.x
    const dy = e.changedTouches[0].clientY - t.y
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return
    go(at + ((rtl ? dx > 0 : dx < 0) ? 1 : -1))
  }
  if (!cur) return <Screen title={sit.name[lang]}>{<p className="tool-note">{s.empty}</p>}</Screen>
  const stages = sit.stages.filter((x) => x.id)
  const nextStep = steps[at + 1]
  const nextLabel = nextStep ? (nextStep.stage.id !== cur.stage.id && nextStep.stage.name ? fill(s.nextTo, { s: nextStep.stage.name[lang] }) : s.next) : null
  const { item } = cur
  return (
    <div className="mq-page" onTouchStart={onStart} onTouchEnd={onEnd}>
      <Screen title={sit.name[lang]}>
        {stages.length > 1 && (
          <div role="group" aria-label={s.stages} className="mq-stages">
            {stages.map((st) => (
              <button
                key={st.id}
                type="button"
                className="mq-stage"
                aria-pressed={cur.stage.id === st.id}
                onClick={() => go(steps.findIndex((x) => x.stage.id === st.id))}
                data-testid={`stage-${st.id}`}
              >
                {st.name![lang]}
              </button>
            ))}
          </div>
        )}
        <section className="mq-card" aria-labelledby="mq-box" data-hadith={item.hadith} data-step={cur.index}>
          <p className="mq-intro">{item.intro[lang]}</p>
          {item.quran ? (
            <div id="mq-box" data-testid="mq-quran">
              <QuranBox h={{ id: `mq-${item.hadith}`, quran: item.quran, quranLinks: item.quranLinks }} />
            </div>
          ) : (
            <div className="mq-box">
              <p id="mq-box" className="mq-words" lang="ar" dir="rtl" data-testid="mq-words">
                «{boxText(item.segments)}»
              </p>
            </div>
          )}
          <div className="mq-src">
            {item.attribution && (
              <span lang="ar" dir="rtl">
                {item.attribution}
              </span>
            )}
            <span className={`tool-badge${grade(item.grade)}`} lang="ar" dir="rtl">
              {item.grade}
            </span>
          </div>
          <FullHadith key={item.hadith + cur.index} item={item} />
        </section>
        <p className="mq-awake">{s.awake}</p>
        <div className="mq-next">
          <span className="mq-dots" aria-label={fill(s.of, { n: String(at + 1), t: String(steps.length) })}>
            {steps.map((x) => (
              <i key={x.index} className={x.index === at ? 'on' : undefined} />
            ))}
          </span>
          {at > 0 && (
            <button type="button" className="mq-nx mq-prev" onClick={() => go(at - 1)}>
              {s.prev}
            </button>
          )}
          {nextLabel && (
            <button type="button" className="mq-nx" onClick={() => go(at + 1)} data-testid="mq-next">
              {nextLabel}
            </button>
          )}
        </div>
      </Screen>
    </div>
  )
}

function Auto() {
  const { lang } = useI18n()
  const s = MAWAQIF[lang]
  const shortcuts = () => {
    void import('@capacitor/app-launcher').then(({ AppLauncher }) => AppLauncher.openUrl({ url: 'shortcuts://' })).catch(() => undefined)
  }
  const Way = ({ icon, title, body, steps, extra, id }: { icon: ReactNode; title: string; body: string; steps: string[]; extra?: ReactNode; id: string }) => (
    <section className="mq-way" aria-labelledby={`mq-way-${id}`} data-testid={`way-${id}`}>
      <span className="mq-way-ic">{icon}</span>
      <div>
        <h2 id={`mq-way-${id}`}>{title}</h2>
        <p>{body}</p>
        {extra}
        <ol>
          {steps.map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ol>
      </div>
    </section>
  )
  return (
    <Screen title={s.autoTitle}>
      <p className="mq-lead">{s.autoLead}</p>
      {!isNative() && <p className="tool-note">{s.iosOnly}</p>}
      <Way
        id="voice"
        icon={<IcMic />}
        title={s.voiceTitle}
        body={s.voiceBody}
        steps={s.voiceSteps}
        extra={
          <ul className="mq-phrases">
            {s.phrases.map((p) => (
              <li key={p}>«{p}»</li>
            ))}
          </ul>
        }
      />
      <Way id="car" icon={<IcCarAuto />} title={s.carTitle} body={s.carBody} steps={s.carSteps} />
      <Way id="nfc" icon={<IcNfc />} title={s.nfcTitle} body={s.nfcBody} steps={s.nfcSteps} extra={<p className="mq-needs">{s.nfcNeeds}</p>} />
      {isNative() && (
        <button type="button" className="mq-open" onClick={shortcuts} data-testid="open-shortcuts">
          {s.openShortcuts}
        </button>
      )}
      <p className="tool-note">{s.ourPart}</p>
    </Screen>
  )
}

export function Mawaqif() {
  const r = mawaqifRoute(location.pathname, location.search)
  const sit = r?.page === 'situation' ? situation(r.id) : null
  // Nothing before the review, and a situation not in the table: home (as an unknown daily screen).
  useEffect(() => {
    if (!situations().length || (r?.page === 'situation' && !sit)) navigate('/')
  })
  if (!situations().length || !r) return null
  if (r.page === 'auto') return <Auto />
  if (r.page === 'situation') return sit ? <SituationPage key={sit.id} sit={sit} step={r.step} /> : null
  return <Grid />
}
