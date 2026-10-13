// A step of the starting path as its own page (reply 0036 part ب; boards StarterSalah and StarterSalahN): where the
// step stands in the path, its question and «اسأل هذا السؤال» (sent to the conversation as before), «قصص من السنة»
// when the step has stories, «أنهيت هذه الخطوة» (on this device only) and the next step. The board's dashed «جديد»
// tag is for the review only and is not drawn.
import { useEffect, useState } from 'react'
import { useI18n } from '../i18n'
import { fmt, numFmt } from '../quran/format'
import { hadithPath, navigate, starterPath } from '../quran/route'
import { SourceSheet } from '../v2/answer/SourceSheets'
import { IconChevronEnd, IconOpenBook } from '../v2/answer/icons'
import { ANSWER } from '../v2/answer/strings'
import { openToday, Screen } from '../v2/daily/Screen'
import { markRead, setDone, STEPS, useProgress } from './progress'
import { getStories, type StoriesResponse, type Story } from './stories'
import '../v2/answer/answer.css'
import './starter.css'

const RTL = new Set(['ar', 'ur'])
const dirOf = (l: string) => (RTL.has(l) ? 'rtl' : 'ltr')

function IconAsk() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M12 19V5.5" />
      <path d="m6 11.5 6-6 6 6" />
    </svg>
  )
}
function IconDone() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="9" fill="currentColor" stroke="none" />
      <path d="m7.8 12.3 2.9 2.9 5.6-6" stroke="var(--on-primary)" strokeWidth="2" />
    </svg>
  )
}

/** A text with one placeholder, the value set apart in its own language (the chapters' names are Arabic). */
function Filled({ template, name, value, lang }: { template: string; name: string; value: string; lang: string }) {
  const [before, after = ''] = template.split(`{${name}}`)
  return (
    <>
      {before}
      <bdi lang={lang} dir={dirOf(lang)}>
        {value}
      </bdi>
      {after}
    </>
  )
}

const quoteList = (names: string[]) => new Intl.ListFormat('ar', { type: 'conjunction' }).format(names.map((n) => `«${n}»`))

function StoryRow({ s, n, first }: { s: Story; n: string; first: boolean }) {
  return (
    <li className={`ss-story${first ? ' is-first' : ''}`}>
      <a className="ss-story-btn" href={hadithPath(s.id)} onClick={(e) => (e.preventDefault(), navigate(hadithPath(s.id)))}>
        <span className="ss-num" aria-hidden="true">
          {n}
        </span>
        <span className="ss-story-body">
          <span className={`ss-story-title${s.lang === 'ar' ? ' is-ar' : ''}`} lang={s.lang} dir={dirOf(s.lang)}>
            {s.title}
          </span>
          {/* The grade and the takhrij of the Arabic row as written (rule 10), the language row's wording beside them. */}
          <span className="ss-meta">
            {s.grade && (
              <span className="ss-grade">
                <span lang="ar" dir="rtl">
                  {s.grade}
                </span>
                {s.grade_tr && <span className="ss-alt" dir="auto"> ({s.grade_tr})</span>}
              </span>
            )}
            {s.grade && s.attribution && <span aria-hidden="true">·</span>}
            {s.attribution && (
              <span>
                <span lang="ar" dir="rtl">
                  {s.attribution}
                </span>
                {s.attribution_tr && <span dir="auto"> ({s.attribution_tr})</span>}
              </span>
            )}
          </span>
        </span>
        <span className="ss-chev" aria-hidden="true">
          <IconChevronEnd />
        </span>
      </a>
    </li>
  )
}

function StoriesCard({ data, topic }: { data: StoriesResponse; topic: string }) {
  const { t, lang } = useI18n()
  const a = ANSWER[lang]
  const num = numFmt(lang)
  const [about, setAbout] = useState(false)
  const names = data.chapters.map((c) => c.title)
  const chapters = names.length ? (
    <Filled template={names.length > 1 ? t.storiesChapters : t.storiesChapter} name={names.length > 1 ? 'names' : 'name'} value={names.length > 1 ? quoteList(names) : names[0]} lang="ar" />
  ) : null
  return (
    <section className="ss-stories" aria-labelledby="ss-stories-h">
      <h2 id="ss-stories-h" className="ss-stories-h">
        {t.storiesTitle}
      </h2>
      <p className="ss-stories-intro">{fmt(t.storiesIntro, { topic })}</p>
      <ol className="ss-list" aria-labelledby="ss-stories-h">
        {data.stories.map((s, i) => (
          <StoryRow key={s.id} s={s} n={num(i + 1)} first={i === 0} />
        ))}
      </ol>
      <button type="button" className="v2-srcline" aria-label={fmt(a.aboutSourceOf, { name: a.srcHadith })} aria-haspopup="dialog" onClick={() => setAbout(true)}>
        <span className="v2-srcline-lead">
          <IconOpenBook />
        </span>
        <span className="v2-srcline-text">
          <span className="v2-srcline-name">{a.srcHadith}</span>
          {chapters && <> · {chapters}</>}
        </span>
        <span className="v2-srcline-end">
          <IconChevronEnd />
        </span>
      </button>
      <SourceSheet open={about} onClose={() => setAbout(false)} source="hadeethenc" />
    </section>
  )
}

export function StarterStep({ id, onAsk }: { id: string; onAsk: (q: string) => void }) {
  const { t, lang, content } = useI18n()
  const num = numFmt(lang)
  const i = STEPS.findIndex((s) => s.id === id)
  const step = i >= 0 ? STEPS[i] : null
  const next = i >= 0 ? STEPS[i + 1] : undefined
  const done = useProgress().done.includes(id)
  // The stories of this step in the content language, kept with the request they answer.
  const key = `${id}|${content}`
  const [res, setRes] = useState<{ key: string; data: StoriesResponse } | null>(null)

  useEffect(() => {
    if (!step) {
      navigate('/', { replace: true })
      return
    }
    let alive = true
    getStories(step.id, content).then(
      (data) => alive && setRes({ key, data }),
      () => alive && setRes({ key, data: { step: step.id, stories: [], chapters: [] } }),
    )
    window.scrollTo?.(0, 0)
    document.querySelector('.dt-screen')?.scrollTo?.(0, 0)
    return () => {
      alive = false
    }
  }, [step, content, key])

  if (!step) return null
  const title = step.title[lang] ?? step.title.ar
  const q = step.q[lang] ?? step.q.ar
  const data = res?.key === key ? res.data : null
  const ask = () => {
    markRead(step.id)
    onAsk(q)
  }

  return (
    <Screen title={title}>
      <p className="ss-where">{fmt(t.starterStepOf, { n: num(i + 1), total: num(STEPS.length) })}</p>
      <section className="dt-card ss-ask" aria-labelledby="ss-q">
        <p id="ss-q" className="ss-q">
          {q}
        </p>
        <p className="ss-lead">{t.starterAskLead}</p>
        <div className="ss-ask-row">
          <button type="button" className="dt-btn dt-btn-primary dt-btn-wide ss-ask-btn" onClick={ask}>
            <IconAsk />
            {t.starterAsk}
          </button>
        </div>
      </section>
      {data && data.stories.length > 0 && <StoriesCard data={data} topic={step.topic?.[lang] ?? step.topic?.ar ?? ''} />}
      <div className="ss-end">
        <button type="button" className={`dt-btn dt-btn-wide ss-done${done ? ' is-done' : ''}`} aria-pressed={done} onClick={() => setDone(step.id, !done)}>
          <IconDone />
          {t.starterDone}
        </button>
        {next ? (
          <a className="ss-next" href={starterPath(next.id)} onClick={(e) => (e.preventDefault(), openToday(starterPath(next.id)))}>
            {fmt(t.starterNext, { title: next.title[lang] ?? next.title.ar })}
          </a>
        ) : (
          <p className="ss-next">{t.starterLast}</p>
        )}
      </div>
    </Screen>
  )
}
