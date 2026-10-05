import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AskResponse, Quote } from '../../shared/api'
import { ask, NetworkError, USE_MOCK, type DemoKind } from './api/client'
import { About } from './components/About'
import { AbstainCard, AnswerCard, ErrorCard, ReferralCard } from './components/Cards'
import { Composer, type Draft } from './components/Composer'
import { IconBook, IconChevron, IconGear } from './components/Icons'
import { Loading } from './components/Loading'
import { Shamsa } from './components/Ornaments'
import { FullTextSheet, InstallSheet, LanguageSheet, ReportSheet, SettingsSheet, SourcesSheet } from './components/Sheets'
import { I18nContext, langMeta, STRINGS } from './i18n'
import { useInstall } from './install'
import { ABSTAIN_Q, REFERRAL_Q, SUGGESTIONS } from './mock/questions'
import { Books } from './library/Books'
import { FeaturedAyah } from './quran/FeaturedAyah'
import { KhatamStar } from './quran/ornaments'
import { Quran } from './quran/Quran'
import { ReaderLink } from './quran/QuranIndex'
import { navigate, useRoute } from './quran/route'
import { useSettings } from './settings'
import { StarterCard, StarterSheet } from './starter/StarterSheet'

type Turn = { id: number; q: string; demo?: DemoKind; status: 'loading' | 'done' | 'network'; res?: AskResponse }
type SheetName = 'settings' | 'sources' | 'lang' | 'install' | 'full' | 'report' | 'starter' | null

const THEME_COLORS = { light: '#F6F0E1', dark: '#14181F' }

function useOnline() {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}

function useHashView() {
  const read = () => (location.hash === '#about' ? 'about' : 'chat')
  const [view, setView] = useState<'chat' | 'about'>(read)
  useEffect(() => {
    const h = () => setView(read())
    window.addEventListener('hashchange', h)
    return () => window.removeEventListener('hashchange', h)
  }, [])
  return view
}

export default function App() {
  const [settings, update] = useSettings()
  const { lang } = settings
  const t = STRINGS[lang]
  const dir = langMeta(lang).dir
  const i18n = useMemo(() => ({ lang, t }), [lang, t])

  const [turns, setTurns] = useState<Turn[]>([])
  const [sheet, setSheet] = useState<SheetName>(null)
  const [fullQuote, setFullQuote] = useState<Quote | null>(null)
  const [reportQuotes, setReportQuotes] = useState<Quote[]>([])
  const online = useOnline()
  const view = useHashView()
  const route = useRoute()
  const inLibrary = view === 'chat' && (route.view === 'quran' || route.view === 'books')
  const [draft, setDraft] = useState<Draft | null>(null)
  const install = useInstall()
  const nextId = useRef(1)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = document.documentElement
    root.lang = lang
    root.dir = dir
    root.dataset.font = settings.fontSize
    if (settings.theme === 'auto') delete root.dataset.theme
    else root.dataset.theme = settings.theme
    document.title = t.appName
    const dark =
      settings.theme === 'dark' || (settings.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? THEME_COLORS.dark : THEME_COLORS.light)
  }, [lang, dir, settings.fontSize, settings.theme, t.appName])

  const run = useCallback(
    async (id: number, q: string, demo?: DemoKind) => {
      setTurns((ts) => ts.map((x) => (x.id === id ? { ...x, status: 'loading', res: undefined } : x)))
      try {
        const res = await ask({ q, lang, simple: settings.simple }, demo)
        setTurns((ts) => ts.map((x) => (x.id === id ? { ...x, status: 'done', res } : x)))
      } catch (e) {
        if (!(e instanceof NetworkError)) console.warn(e)
        setTurns((ts) => ts.map((x) => (x.id === id ? { ...x, status: 'network' } : x)))
      }
    },
    [lang, settings.simple],
  )

  const submit = useCallback(
    (q: string, demo?: DemoKind) => {
      const id = nextId.current++
      setTurns((ts) => [...ts, { id, q, demo, status: 'loading' }])
      if (location.hash) history.replaceState(null, '', location.pathname + location.search)
      void run(id, q, demo)
    },
    [run],
  )

  const runDemo = (kind: DemoKind) => {
    const q = {
      answer: SUGGESTIONS[lang][1],
      referral: REFERRAL_Q[lang],
      abstain: ABSTAIN_Q[lang],
      rate: t.demoRate,
      cap: t.demoCap,
      server: t.demoServer,
    }[kind]
    setSheet(null)
    submit(q, kind)
  }

  // ?q=... opens the app on a question (used by the share button).
  const autoAsked = useRef(false)
  useEffect(() => {
    if (autoAsked.current) return
    autoAsked.current = true
    const q = new URLSearchParams(location.search).get('q')?.trim()
    if (q) submit(q.slice(0, 500))
  }, [submit])

  useEffect(() => {
    const last = scrollRef.current?.querySelector('.turn:last-child')
    last?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }, [turns.length])

  const busy = turns.some((x) => x.status === 'loading')

  const suggestionChips = (
    <div className="suggestions">
      <h2>{t.suggestionsTitle}</h2>
      {SUGGESTIONS[lang].map((s) => (
        <button key={s} type="button" className="chip" onClick={() => submit(s)} disabled={busy}>
          {s}
        </button>
      ))}
    </div>
  )

  const renderRes = (turn: Turn) => {
    if (turn.status === 'loading') return <Loading />
    if (turn.status === 'network') return <ErrorCard code="network" onRetry={() => run(turn.id, turn.q, turn.demo)} />
    const res = turn.res!
    switch (res.type) {
      case 'answer':
        return (
          <AnswerCard
            res={res}
            question={turn.q}
            anchor={`t${turn.id}-q`}
            onFullText={(q) => {
              setFullQuote(q)
              setSheet('full')
            }}
            onReport={(qs) => {
              setReportQuotes(qs)
              setSheet('report')
            }}
          />
        )
      case 'referral':
        return <ReferralCard level={res.level} link={res.link} />
      case 'abstain':
        return <AbstainCard link={res.link} />
      case 'error':
        return <ErrorCard code={res.code} onRetry={() => run(turn.id, turn.q, turn.demo)} suggestions={suggestionChips} />
    }
  }

  const showInstallLink = !install.installed && (install.ios || install.canPrompt)

  return (
    <I18nContext.Provider value={i18n}>
      <div className="shell">
        <aside className="aside" aria-hidden="true">
          <p className="aside-name">{t.appName}</p>
          <p className="aside-tag">{t.footer}</p>
        </aside>

        <div className="column">
          <header className="topbar">
            {view === 'about' ? (
              <button type="button" className="pill" onClick={() => (location.hash = '')}>
                {t.back}
              </button>
            ) : (
              <h1 className="brand" style={{ display: 'flex', alignItems: 'center' }}>
                {t.appName}
              </h1>
            )}
            <div className="topbar-actions">
              <button
                type="button"
                className="pill"
                onClick={() => setSheet('lang')}
                aria-label={`${t.language}: ${langMeta(lang).native}`}
                aria-haspopup="dialog"
              >
                <span lang={lang}>{langMeta(lang).native}</span>
                <IconChevron />
              </button>
              <button type="button" className="icon-btn" onClick={() => setSheet('sources')} aria-label={t.sources} aria-haspopup="dialog">
                <IconBook />
              </button>
              <button type="button" className="icon-btn" onClick={() => setSheet('settings')} aria-label={t.settings} aria-haspopup="dialog">
                <IconGear />
              </button>
            </div>
          </header>

          {view === 'chat' && (
            <nav className="mode-switch" aria-label={`${t.navAsk} | ${t.navLibrary}`}>
              <div className="mode-switch-inner">
                <ReaderLink to="/" current={!inLibrary}>
                  {t.navAsk}
                </ReaderLink>
                <ReaderLink to="/quran" current={inLibrary}>
                  {t.navLibrary}
                </ReaderLink>
              </div>
            </nav>
          )}

          {!online && (
            <div className="banner banner-offline" role="status">
              {t.offline}
            </div>
          )}
          {USE_MOCK && !inLibrary && <div className="banner banner-demo">{t.demoBanner}</div>}

          {view === 'about' ? (
            <About />
          ) : inLibrary ? (
            <main id="main" className="scroll reader">
              {route.view === 'books' ? (
                <Books
                  book={route.book}
                  seg={route.seg}
                  onAsk={(text) => {
                    navigate('/')
                    setDraft({ text, n: Date.now() })
                  }}
                />
              ) : (
                <Quran
                  sura={route.view === 'quran' ? route.sura : undefined}
                  aya={route.view === 'quran' ? route.aya : undefined}
                  onAsk={(text) => {
                    navigate('/')
                    setDraft({ text, n: Date.now() })
                  }}
                  onReport={(q) => {
                    setReportQuotes([q])
                    setSheet('report')
                  }}
                />
              )}
            </main>
          ) : (
            <>
              <main id="main" className="scroll" ref={scrollRef} role="log" aria-live="polite" aria-relevant="additions">
                {turns.length === 0 ? (
                  <div className="home">
                    <div className="welcome">
                      <Shamsa />
                      <div className="welcome-text">
                        <h2 className="welcome-title">{t.welcomeTitle}</h2>
                        <p className="welcome-sub">{t.welcomeSub}</p>
                      </div>
                    </div>
                    {suggestionChips}
                    <StarterCard onOpen={() => setSheet('starter')} />
                    <ReaderLink to="/quran" className="quran-entry">
                      <KhatamStar />
                      {t.readQuran}
                    </ReaderLink>
                    <FeaturedAyah />
                    <div className="home-links">
                      {USE_MOCK && (
                        <button type="button" className="text-link" onClick={() => setSheet('settings')}>
                          {t.demoTitle}
                        </button>
                      )}
                      {showInstallLink && (
                        <button type="button" className="text-link" onClick={() => setSheet('install')}>
                          {t.install}
                        </button>
                      )}
                    </div>
                    {/* Logo slots: "i" on the left, the palm mark on the right — left empty until the brand files arrive. */}
                    <div className="brand-marks" aria-hidden="true">
                      <span className="slot" />
                      <span className="slot" />
                    </div>
                  </div>
                ) : (
                  turns.map((turn) => (
                    <div key={turn.id} className="turn">
                      <p className="bubble" dir="auto">
                        <span className="sr-only">{t.you}: </span>
                        {turn.q}
                      </p>
                      {renderRes(turn)}
                    </div>
                  ))
                )}
              </main>
              <Composer key={draft?.n ?? 0} onSubmit={(q) => submit(q)} busy={busy} draft={draft} />
            </>
          )}
        </div>
      </div>

      <SettingsSheet
        open={sheet === 'settings'}
        onClose={() => setSheet(null)}
        settings={settings}
        update={update}
        onClear={() => {
          setTurns([])
          setSheet(null)
        }}
        onSources={() => setSheet('sources')}
        onAbout={() => {
          setSheet(null)
          location.hash = 'about'
        }}
        onInstall={() => setSheet('install')}
        onDemo={runDemo}
      />
      <SourcesSheet open={sheet === 'sources'} onClose={() => setSheet(null)} />
      <LanguageSheet open={sheet === 'lang'} onClose={() => setSheet(null)} value={lang} onChange={(l) => update({ lang: l })} />
      <InstallSheet open={sheet === 'install'} onClose={() => setSheet(null)} />
      <FullTextSheet open={sheet === 'full'} onClose={() => setSheet(null)} quote={fullQuote} />
      <ReportSheet open={sheet === 'report'} onClose={() => setSheet(null)} quotes={reportQuotes} />
      <StarterSheet
        open={sheet === 'starter'}
        onClose={() => setSheet(null)}
        onAsk={(q) => {
          setSheet(null)
          submit(q)
        }}
      />
    </I18nContext.Provider>
  )
}
