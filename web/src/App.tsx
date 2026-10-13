import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AnswerResponse, AskResponse, Quote } from '../../shared/api'
import { ask, NetworkError, USE_MOCK, type DemoKind } from './api/client'
import { About } from './components/About'
import { AbstainCard, AnswerCard, ErrorCard, ReferralCard } from './components/Cards'
import { Composer, type Draft } from './components/Composer'
import { IconChat, IconChevronBack, IconInfo, IconMoon, IconPen, IconShelf, IconSliders, IconSun } from './components/Icons'
import { Loading } from './components/Loading'
import { OrnamentDefs, Rose } from './components/Ornaments'
import { FullTextSheet, InstallSheet, ReportSheet, SettingsSheet } from './components/Sheets'
import { I18nContext, langMeta, STRINGS } from './i18n'
import { useInstall } from './install'
import { SUGGESTIONS } from './config/suggestions'
import { Books } from './library/Books'
import { Quran } from './quran/Quran'
import { navigate, useRoute } from './quran/route'
import { useSettings } from './settings'
import { HowFoundSheet } from './trust/HowFound'
import { announceReply } from './voice/bus'
import { StarterSheet } from './starter/StarterSheet'
import { HadithPage } from './v2/hadith/HadithPage'
import { NextPrayerLine } from './v2/daily/HomeSlots'
import { AskCard } from './v2/home/AskCard'
import { Home } from './v2/home/Home'
import { Verify } from './verify/Verify'
import { ToolsView } from './v2/daily/ToolsView'
import { TodayView } from './v2/daily/TodayView'
import { VERIFY } from './verify/strings'
import { SourceSheet } from './v2/answer/SourceSheets'
import type { SourceKey } from './v2/answer/sources'
import { goBack, openToday } from './v2/daily/Screen'
import { LangPicker } from './v2/lang/LangPicker'
import { IcGlobeSmall } from './v2/lang/icons'
import { nativeName, uiLangFor } from './v2/lang/served'
import { rememberChoice } from './v2/lang/store'
import { SOURCES_PATH, type ReportLoc } from './v2/sources/place'
import { isNative } from './native/platform'
import { installMediaSession } from './quran/media-session'

// Inside the iOS/Android app only (reply 0033 §ب3): local alerts, a tapped alert's page, the meanings kept offline.
const NativeDevice = lazy(() => import('./native/NativeDevice').then((m) => ({ default: m.NativeDevice })))

type Turn = { id: number; q: string; demo?: DemoKind; status: 'loading' | 'done' | 'network'; res?: AskResponse }
type SheetName = 'settings' | 'install' | 'full' | 'report' | 'starter' | 'howfound' | null

// The browser bar follows the second version's sky (day) and night ground (reply 0032 B).
const THEME_COLORS = { light: '#9FC0E8', dark: '#040A1C' }

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

/** Go to an app path from anywhere, About included: leave the #about view first (replaceState fires no hashchange). */
function goTo(path: string) {
  if (location.hash) {
    history.replaceState(null, '', location.pathname + location.search)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  }
  navigate(path)
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
  const { lang, content } = settings
  // The recitation's lock-screen controls (Media Session), reading the interface language at each change.
  const langRef = useRef(lang)
  useEffect(() => {
    langRef.current = lang
  }, [lang])
  useEffect(() => installMediaSession(() => langRef.current), [])
  const t = STRINGS[lang]
  const dir = langMeta(lang).dir
  const i18n = useMemo(() => ({ lang, t, content }), [lang, t, content])

  const [turns, setTurns] = useState<Turn[]>([])
  const [sheet, setSheet] = useState<SheetName>(null)
  const [fullQuote, setFullQuote] = useState<Quote | null>(null)
  const [reportQuotes, setReportQuotes] = useState<Quote[]>([])
  const [howFound, setHowFound] = useState<AnswerResponse | null>(null)
  const online = useOnline()
  const view = useHashView()
  const route = useRoute()
  const inLibrary = view === 'chat' && (route.view === 'quran' || route.view === 'books')
  const inVerify = view === 'chat' && route.view === 'verify'
  // The daily screens (reply 0032 D) bring their own header (back and title).
  const inToday = view === 'chat' && route.view === 'today'
  const inHadith = view === 'chat' && route.view === 'hadith'
  // The language picker (reply 0033 §أ1): a full screen with its own back button and title, like the daily screens.
  const inLang = view === 'chat' && route.view === 'lang'
  const [draft, setDraft] = useState<Draft | null>(null)
  // A full-screen voice session opened from the home page's question box (reply 0032 B): the box stays mounted.
  const [homeVoice, setHomeVoice] = useState(false)
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
        // The ayat's meanings in the content language when it is not the interface's (reply 0033 §أ1).
        const res = await ask({ q, lang, simple: settings.simple, ...(content !== lang ? { ml: content } : {}) }, demo)
        setTurns((ts) => ts.map((x) => (x.id === id ? { ...x, status: 'done', res } : x)))
        announceReply(res)
      } catch (e) {
        if (!(e instanceof NetworkError)) console.warn(e)
        setTurns((ts) => ts.map((x) => (x.id === id ? { ...x, status: 'network' } : x)))
        announceReply({ type: 'network' })
      }
    },
    [lang, content, settings.simple],
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

  // Demo questions exist only in local development (VITE_ASK_MODE=mock); the production build drops this branch.
  const runDemo = __ASK_MOCK__
    ? async (kind: DemoKind) => {
        const m = await import('./mock/client')
        setSheet(null)
        submit(m.demoQuestion(kind, lang, t), kind)
      }
    : undefined

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

  // «عن المصدر» for the reader's source lines (part C sends 'muslim:about-source'): the app-wide sheet of part B opens
  // for the sources it documents; any other key (the recitation) keeps the reader's own inline facts.
  // The ayah's place comes with it, for «أبلغ عن خطأ» at the sheet's foot (reply 0033 §أ3).
  const [aboutSource, setAboutSource] = useState<{ key: SourceKey; name?: string; url?: string; loc?: ReportLoc } | null>(null)
  useEffect(() => {
    const known: SourceKey[] = ['mushaf', 'muyassar', 'saadi']
    const on = (e: Event) => {
      const d = (e as CustomEvent<{ key: string; name?: string; url?: string; loc?: ReportLoc }>).detail
      if (!known.includes(d?.key as SourceKey)) return
      e.preventDefault()
      setAboutSource({ key: d.key as SourceKey, name: d.name, url: d.url, loc: d.loc })
    }
    window.addEventListener('muslim:about-source', on)
    return () => window.removeEventListener('muslim:about-source', on)
  }, [])

  const busy = turns.some((x) => x.status === 'loading')

  // A language from the picker: one of the ten sets the interface too; any other goes with the English interface.
  const pickLang = useCallback(
    (code: string) => {
      rememberChoice(content, code)
      update({ lang: uiLangFor(code), content: code })
      goBack()
    },
    [content, update],
  )
  const openLang = useCallback(() => {
    setSheet(null)
    openToday('/language')
  }, [])

  const suggestionChips = (
    <div className="suggestions">
      <h2>{t.suggestionsTitle}</h2>
      {SUGGESTIONS[lang].map((s) => (
        <button key={s} type="button" className="chip" onClick={() => submit(s)} disabled={busy}>
          <Rose size={25} />
          <span>{s}</span>
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
            onHowFound={() => {
              setHowFound(res)
              setSheet('howfound')
            }}
          />
        )
      case 'referral':
        return <ReferralCard res={res} />
      case 'abstain':
        return <AbstainCard link={res.link} />
      case 'error':
        return <ErrorCard code={res.code} onRetry={() => run(turn.id, turn.q, turn.demo)} suggestions={suggestionChips} />
    }
  }

  const showInstallLink = !install.installed && (install.ios || install.canPrompt)
  // The bottom bar (V2) on the home page, the library and About; a conversation keeps the composer at the bottom instead.
  // The daily screens and the hadith page are detail pages with their own back button and title (boards).
  const showNav = !inVerify && !inToday && !inHadith && !inLang && (view === 'about' || inLibrary || turns.length === 0)
  const isDark = settings.theme === 'dark' || (settings.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  return (
    <I18nContext.Provider value={i18n}>
      <div className={`shell${showNav ? ' has-v2-nav' : ''}${inHadith ? ' is-hadith' : ''}`}>
        <aside className="aside" aria-hidden="true">
          <p className="aside-name wordmark" lang="ar">
            مسلم
          </p>
          <p className="aside-tag">{t.footer}</p>
        </aside>

        <div className="column">
          <OrnamentDefs />
          {/* The sky behind the header (V2): tall on the home page, short elsewhere. */}
          <div className={`v2-sky${view === 'chat' && !inLibrary && !inVerify && !inToday && !inHadith && !inLang && route.view !== 'tools' && turns.length === 0 ? '' : ' is-short'}`} aria-hidden="true" />
          {!inToday && !inLang && (
          <header className="topbar v2">
            {view === 'about' ? (
              <button type="button" className="v2-icon-btn" onClick={() => (location.hash = '')} aria-label={t.back}>
                <IconChevronBack />
              </button>
            ) : (
              // «مسلم» stays Arabic in every language (identity); its name is read in the interface language. No «i» here:
              // CLAUDE.md §8 keeps the «i» mark to the welcome page's footer alone.
              <h1 className="v2-brand">
                <span className="wordmark" lang="ar" aria-hidden={lang !== 'ar' || undefined}>
                  مسلم
                </span>
                {lang !== 'ar' && <span className="sr-only">{t.appName}</span>}
              </h1>
            )}
            <div className="v2-actions">
              {view === 'chat' && !inLibrary && !inVerify && turns.length > 0 ? (
                <button type="button" className="v2-icon-btn" onClick={() => setTurns([])} aria-label={t.newChat}>
                  <IconPen />
                </button>
              ) : (
                <button
                  type="button"
                  className="v2-icon-btn"
                  onClick={() => update({ theme: isDark ? 'light' : 'dark' })}
                  aria-label={`${t.theme}: ${isDark ? t.themeLight : t.themeDark}`}
                >
                  {isDark ? <IconSun /> : <IconMoon />}
                </button>
              )}
              <button type="button" className="v2-icon-btn" onClick={() => setSheet('settings')} aria-label={t.settings} aria-haspopup="dialog">
                <IconSliders />
              </button>
            </div>
          </header>
          )}

          {!online && (
            <div className="banner banner-offline" role="status">
              {t.offline}
            </div>
          )}
          {USE_MOCK && !inLibrary && <div className="banner banner-demo">{t.demoBanner}</div>}

          {view === 'about' ? (
            <>
              <About />
              {/* For the judges (command 17): the About page and the README lead to /verify; the welcome page does not. */}
              <nav className="verify-entry" aria-label={VERIFY[lang].judgesLink}>
                <a
                  className="text-link"
                  href="/verify"
                  onClick={(e) => {
                    e.preventDefault()
                    navigate('/verify')
                    history.replaceState(null, '', location.pathname + location.search)
                    window.dispatchEvent(new HashChangeEvent('hashchange'))
                  }}
                >
                  {VERIFY[lang].judgesLink}
                </a>
              </nav>
            </>
          ) : view === 'chat' && route.view === 'tools' ? (
            <ToolsView tool={route.tool} />
          ) : inLang ? (
            <LangPicker content={content} onPick={pickLang} />
          ) : inToday && route.view === 'today' ? (
            <TodayView tool={route.tool} />
          ) : inVerify ? (
            <Verify
              onTry={(text) => {
                navigate('/')
                setDraft({ text, n: Date.now() })
              }}
            />
          ) : inHadith && route.view === 'hadith' ? (
            <main id="main" className="scroll">
              <HadithPage id={route.id} />
            </main>
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
              <main id="main" className={`scroll${turns.length === 0 ? ' is-home' : ''}`} ref={scrollRef}>
                {/* The second version's home page (reply 0032 B, c01): «اسأل» first, the day card, the sections. The
                    question box keeps its place in both states (the slots stay put), so a voice session started on the
                    home page goes on in the conversation: it stays mounted, hidden, while that session is open. */}
                {turns.length === 0 && <NextPrayerLine />}
                {(turns.length === 0 || homeVoice) && (
                  <AskCard onSubmit={(q) => submit(q)} busy={busy} draft={draft} dormant={turns.length > 0} onVoiceSession={setHomeVoice} />
                )}
                {turns.length === 0 ? (
                  <Home onStarter={() => setSheet('starter')}>
                    <div className="home-links">
                      {/* The language picker from the welcome page (reply 0033 §أ1): the globe and the current name. */}
                      <a className="text-link lang-link" href="/language" onClick={(e) => (e.preventDefault(), openLang())}>
                        <IcGlobeSmall />
                        <span>
                          {t.language}: <bdi lang={content}>{nativeName(content)}</bdi>
                        </span>
                      </a>
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
                  </Home>
                ) : (
                  <div className="turns" role="log" aria-live="polite" aria-relevant="additions">
                    {turns.map((turn) => (
                      <div key={turn.id} className="turn">
                        <p className="bubble" dir="auto">
                          <span className="sr-only">{t.you}: </span>
                          {turn.q}
                        </p>
                        {renderRes(turn)}
                      </div>
                    ))}
                  </div>
                )}
              </main>
              {turns.length > 0 && <Composer key={draft?.n ?? 0} onSubmit={(q) => submit(q)} busy={busy} draft={draft} />}
            </>
          )}
          {showNav && (
            <nav className="v2-nav" aria-label={t.navLabel}>
              <a href="/" aria-current={!inLibrary && view !== 'about' ? 'page' : undefined} onClick={(e) => (e.preventDefault(), goTo('/'))}>
                <IconChat />
                {t.navAsk}
              </a>
              <a href="/quran" aria-current={inLibrary ? 'page' : undefined} onClick={(e) => (e.preventDefault(), goTo('/quran'))}>
                <IconShelf />
                {t.navLibrary}
              </a>
              <a href="#about" aria-current={view === 'about' ? 'page' : undefined}>
                <IconInfo />
                {t.about}
              </a>
            </nav>
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
        onSources={() => {
          setSheet(null)
          openToday(SOURCES_PATH)
        }}
        onAbout={() => {
          setSheet(null)
          location.hash = 'about'
        }}
        onInstall={() => setSheet('install')}
        onLanguage={openLang}
        onDemo={runDemo}
      />
      <SourceSheet open={aboutSource !== null} onClose={() => setAboutSource(null)} source={aboutSource?.key ?? null} name={aboutSource?.name} url={aboutSource?.url} loc={aboutSource?.loc} />
      <InstallSheet open={sheet === 'install'} onClose={() => setSheet(null)} />
      <FullTextSheet open={sheet === 'full'} onClose={() => setSheet(null)} quote={fullQuote} />
      <ReportSheet open={sheet === 'report'} onClose={() => setSheet(null)} quotes={reportQuotes} />
      <HowFoundSheet open={sheet === 'howfound'} onClose={() => setSheet(null)} res={howFound} />
      <StarterSheet
        open={sheet === 'starter'}
        onClose={() => setSheet(null)}
        onAsk={(q) => {
          setSheet(null)
          submit(q)
        }}
      />
      {isNative() && (
        <Suspense fallback={null}>
          <NativeDevice lang={lang} content={content} go={goTo} />
        </Suspense>
      )}
    </I18nContext.Provider>
  )
}
