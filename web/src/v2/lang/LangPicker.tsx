// The language picker (reply 0033 §أ1; boards LangPicker, LangSearch, LangNotFound, LangPickerN): a full screen that
// replaces the old language grid on the welcome page and in the settings. The list is the languages the app serves
// content in (data/served-langs.json), each with its badge as computed from the data; «لغة جهازك» and «آخر ما اخترت»
// above it; a search on the device; and, for a language not served, a request that carries only its normalised name.
// The board's last note («أزرار التطبيق بالعربية والإنجليزية مراجَعة، وبقية اللغات مترجمة آليًا…») is not true of the
// 21 languages that have no interface; a true version of it stands in its place: the two reviewed interface languages,
// the eight machine-translated ones (CLAUDE.md §4: marked as such), English for the rest, and the ayat and hadiths
// never machine-translated.
import { useMemo, useRef, useState } from 'react'
import { numberLocale, useI18n } from '../../i18n'
import { Screen } from '../daily/Screen'
import { IcCheck, IcClear, IcGlobe, IcHand, IcInfo, IcLock, IcSearch } from './icons'
import { highlightOrWhole, searchLangs, type Hit } from './search'
import { deviceLang, isServed, servedRows, type Badge, type LangRow } from './served'
import { alreadyRequested, previousChoice, requestLang, requestTextOf, type RequestResult } from './store'
import { countText, fill, LANG_PICKER, NAMES_TYPED, type LangStrings } from './strings'
import './lang.css'

type Part = { text: string; mark: boolean }
const Marked = ({ parts }: { parts: Part[] }) => (
  <>
    {parts.map((p, i) =>
      p.mark ? (
        <mark key={i} className="lp-mark">
          {p.text}
        </mark>
      ) : (
        p.text
      ),
    )}
  </>
)

function BadgeTag({ badge, s }: { badge: Badge; s: LangStrings }) {
  if (!badge) return null
  return <span className={`lp-badge ${badge === 'full' ? 'is-full' : 'is-partial'}`}>{badge === 'full' ? s.badgeFull : s.badgeNoTafsir}</span>
}

function LangButton({ row, sub, selected, onPick, s, name, subParts }: { row: LangRow; sub?: string; selected: boolean; onPick: (code: string) => void; s: LangStrings; name?: Part[]; subParts?: Part[] }) {
  return (
    <button type="button" className="lp-row" aria-pressed={selected} onClick={() => onPick(row.code)}>
      <span className="lp-text">
        <span className="lp-name" lang={row.namesAs ?? row.code} dir="auto">
          {name ? <Marked parts={name} /> : row.native}
        </span>
        {(sub || subParts) && <span className="lp-sub">{subParts ? <Marked parts={subParts} /> : sub}</span>}
      </span>
      <BadgeTag badge={row.badge} s={s} />
      <span className="lp-check" aria-hidden="true">
        {selected && <IcCheck />}
      </span>
    </button>
  )
}

/** The language picker screen. `content` is the current content language; `onPick` sets it (and the interface). */
export function LangPicker({ content, onPick }: { content: string; onPick: (code: string) => void }) {
  const { lang } = useI18n()
  const s = LANG_PICKER[lang]
  const rows = useMemo(() => servedRows(lang), [lang])
  const byCode = useMemo(() => new Map(rows.map((r) => [r.code, r])), [rows])
  const [q, setQ] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const device = useMemo(() => deviceLang(), [])
  const prev = useMemo(() => previousChoice(), [])
  const last = prev && isServed(prev) && prev !== device ? prev : null
  const hits = useMemo(() => (q.trim() ? searchLangs(q, lang) : null), [q, lang])
  const num = useMemo(() => {
    const f = new Intl.NumberFormat(numberLocale(lang))
    return (n: number) => f.format(n)
  }, [lang])
  // Line 2 of a row: the name in the interface language, hidden when it is the same as line 1.
  const subOf = (r: LangRow) => (r.ui !== r.native ? r.ui : undefined)

  const top = [device ? { code: device, sub: s.deviceLang } : null, last ? { code: last, sub: s.lastChosen } : null].filter(
    (x): x is { code: string; sub: string } => !!x && byCode.has(x.code),
  )

  return (
    <Screen title={s.title}>
      <div role="search" className={`lp-search${q ? ' is-on' : ''}`}>
        <span className="lp-search-ic" aria-hidden="true">
          <IcSearch />
        </span>
        <input
          ref={input}
          type="search"
          className="lp-input"
          value={q}
          onChange={(e) => setQ(e.target.value.slice(0, 60))}
          placeholder={fill(s.searchPlaceholder, NAMES_TYPED)}
          aria-label={s.searchLabel}
          // The placeholder follows the page; what is typed follows its own script («Hmong» left to right).
          dir={q ? 'auto' : undefined}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
        />
        {q && (
          <button
            type="button"
            className="lp-clear"
            aria-label={s.clear}
            onClick={() => {
              setQ('')
              input.current?.focus()
            }}
          >
            <IcClear />
          </button>
        )}
      </div>

      {hits === null ? (
        <>
          {top.length > 0 && (
            <section className="lp-card" aria-label={top.map((x) => x.sub).join(' · ')}>
              {top.map((x) => (
                <LangButton key={x.sub} row={byCode.get(x.code)!} sub={x.sub} selected={x.code === content} onPick={onPick} s={s} />
              ))}
            </section>
          )}
          <div className="lp-head">
            <h2 id="lp-all">{s.allLangs}</h2>
            <span className="lp-count">{countText(s, rows.length, lang, num)}</span>
          </div>
          <section className="lp-card" aria-labelledby="lp-all">
            {rows.map((r) => (
              <LangButton key={r.code} row={r} sub={subOf(r)} selected={r.code === content} onPick={onPick} s={s} />
            ))}
          </section>
          <section className="lp-card lp-legend" aria-label={s.legendLabel}>
            <div className="lp-legend-row">
              <BadgeTag badge="full" s={s} />
              <span>{s.legendFull}</span>
            </div>
            <div className="lp-legend-row">
              <BadgeTag badge="no-tafsir" s={s} />
              <span>{s.legendNoTafsir}</span>
            </div>
          </section>
          <div className="lp-note">
            <span aria-hidden="true">
              <IcInfo />
            </span>
            <p>{s.uiNote}</p>
          </div>
        </>
      ) : hits.length ? (
        <Results hits={hits} q={q} content={content} onPick={onPick} s={s} />
      ) : (
        // A new word is a new request: the panel starts afresh for each normalised name.
        <NotFound key={requestTextOf(q) ?? q} q={q} s={s} english={byCode.get('en')} content={content} onPick={onPick} />
      )}
    </Screen>
  )
}

function Results({ hits, q, content, onPick, s }: { hits: Hit[]; q: string; content: string; onPick: (code: string) => void; s: LangStrings }) {
  const item = (h: Hit) => {
    const r = h.row
    // Line 2 in the search: the name in the interface language (when not line 1), the English name and the code,
    // as on the board («Arabic · ar»); the words that hold what was typed are highlighted.
    const sub = [r.ui !== r.native ? r.ui : null, r.en !== r.native && r.en !== r.ui ? r.en : null, r.code].filter(Boolean).join(' · ')
    const shownMatched = h.matched.some((f) => f === 'native' || f === 'ui' || f === 'en' || f === 'code')
    const name = highlightOrWhole(r.native, q, !shownMatched)
    const subParts = sub.split(' · ').flatMap((part, i) => [...(i ? [{ text: ' · ', mark: false }] : []), ...(part === r.code && h.matched.includes('code') ? [{ text: part, mark: true }] : highlightOrWhole(part, q, false))])
    return <LangButton key={r.code} row={r} selected={r.code === content} onPick={onPick} s={s} name={name} subParts={subParts} />
  }
  const [first, ...rest] = hits
  // Found only by a spelling slip: the typed name may be a language we do not serve («ألباني» is one slip from
  // «اسباني»), so it can still be requested under the results.
  const onlySlips = hits.every((h) => h.tier === 3)
  return (
    <>
      <p className="sr-only" role="status">
        {s.closest}: {first.row.native}
      </p>
      <h2 className="lp-h2">{s.closest}</h2>
      <section className="lp-card" aria-label={s.closest}>
        {item(first)}
      </section>
      {rest.length > 0 && (
        <>
          <h2 className="lp-h2">{s.moreResults}</h2>
          <section className="lp-card" aria-label={s.moreResults}>
            {rest.slice(0, 12).map(item)}
          </section>
        </>
      )}
      <div className="lp-note">
        <span aria-hidden="true">
          <IcSearch size={17} />
        </span>
        <p>{fill(s.searchHint, NAMES_TYPED)}</p>
      </div>
      {onlySlips && requestTextOf(q) && (
        <>
          <section className="lp-card lp-nf lp-nf-slip" aria-labelledby="lp-slip">
            <p id="lp-slip" className="lp-nf-title">
              {fill(s.notAmong, { q: q.trim() })}
            </p>
            <RequestAction key={requestTextOf(q)} q={q} s={s} />
          </section>
          <div className="lp-note">
            <span aria-hidden="true">
              <IcLock />
            </span>
            <p>{s.requestPrivacy}</p>
          </div>
        </>
      )}
    </>
  )
}

/** The request of a language not served: the button, then thanks; sent once per normalised name on this device. */
function RequestAction({ q, s }: { q: string; s: LangStrings }) {
  const text = requestTextOf(q)
  const [state, setState] = useState<RequestResult | 'idle' | 'busy'>(() => (text && alreadyRequested(text) ? 'already' : 'idle'))
  const send = async () => {
    setState('busy')
    setState(await requestLang(q))
  }
  const done = state === 'sent' || state === 'already'
  return (
    <div className="lp-nf-act">
      {!text ? (
        <p className="lp-nf-msg">{s.requestLetters}</p>
      ) : done ? (
        <p className="lp-nf-msg is-done" role="status">
          {s.requestSent}
        </p>
      ) : (
        <>
          <button type="button" className="lp-request" onClick={send} disabled={state === 'busy'}>
            <IcHand />
            {s.request}
          </button>
          {(state === 'limited' || state === 'failed') && (
            <p className="lp-nf-msg" role="alert">
              {state === 'limited' ? s.requestLimited : s.requestFailed}
            </p>
          )}
        </>
      )}
    </div>
  )
}

function NotFound({ q, s, english, content, onPick }: { q: string; s: LangStrings; english?: LangRow; content: string; onPick: (code: string) => void }) {
  return (
    <>
      <section className="lp-card lp-nf">
        <div className="lp-nf-top">
          <span className="lp-nf-icon" aria-hidden="true">
            <IcGlobe />
          </span>
          <p className="lp-nf-title" role="status">
            {fill(s.notFoundTitle, { q: q.trim() })}
          </p>
          <p className="lp-nf-body">{s.notFoundBody}</p>
        </div>
        <RequestAction q={q} s={s} />
      </section>
      <div className="lp-note">
        <span aria-hidden="true">
          <IcLock />
        </span>
        <p>{s.requestPrivacy}</p>
      </div>
      {english && (
        <>
          <h2 className="lp-h2">{s.untilThen}</h2>
          <section className="lp-card" aria-label={s.untilThen}>
            <LangButton row={english} sub={english.ui !== english.native ? english.ui : undefined} selected={content === 'en'} onPick={onPick} s={s} />
          </section>
        </>
      )}
    </>
  )
}
