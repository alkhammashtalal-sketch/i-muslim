// «أسماء الله» (reply 0032 D-8; boards Names and NameSheet; add-on 0072-add1): ONE page for the Beautiful Names, at
// /today/names, from the «يومك» grid, the name's page and its home card.
// What the page had, and keeps, all sourced: the 99 names as listed in Ibn Uthaymeen's «القواعد المثلى»
// (data/names.json, from shamela.ws book 8874, pp. 15-16), the count of those from the Quran and from the Sunnah, the
// Sheikh's own words in the same book on why not the well-known list (with the page's link), the search, and for each
// name its sheet: its evidence where it was found (an ayah where the name itself is said of Allah, with its text and
// al-Muyassar from D1, or a sahih or hasan hadith from HadeethEnc) and the book's page.
// What it adds (add-on 0072-add1): the list in the order of the daily card «اسم من أسماء الله», its 96 entries from the
// server (GET /api/names/list), each opening the name's page (/today/name/<n>), with the book's evidence reference of
// each name beside it, or that it is not in the book's list (الستير); then the reviewed file's appendix, «أسماء مضافة
// أو مختلف في عدّها», each with its «تنبيه الملحق» while the server sends it (NAMES_READINGS), in Arabic. All 99 of
// the book are there: 97 in the entries (المتعالي as the Mushaf writes it, «المتعال») and الحفي and المحسن in the
// appendix, each with its sheet. Where the server has no list, the book's 99 show as before.
import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import type { PassageResponse, SuraSummary } from '../../../../../shared/api'
import names from '../../../../../data/names.json'
import { Sheet } from '../../../components/Sheet'
import { navigate } from '../../../quran/route'
import { getPassage, getSuras, getToolHadith, type ToolHadith } from '../api'
import { Failed, HadithBlock, Loading, SourceLine, ToolHead, useTools } from '../ToolParts'
import { fill } from '../strings-tools'
import { getNamesList, namePath, type NamesList } from './name-day-api'
import { Cited } from './NameEntry'
import { NAME_DAY } from './strings-name-day'
import './name-day.css'

export type Name = (typeof names.names)[number] & { quran?: { ayah: string; match: string }; sunnah?: { id: string; match: string }; book_reference?: string | null }
const ALL = names.names as Name[]

/** «ص15» with the language's digits. */
const pageLabel = (p: string, num: (x: number) => string) => p.replace(/\d+/g, (d) => num(Number(d)))

const fold = (s: string) => s.replace(/[ً-ْٰـ]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').trim()

/** The daily file writes «المتعال» as the Mushaf does; the book's list writes «المتعالي» (data/names.json says so). */
const ALIAS: Record<string, string> = { [fold('المتعال')]: fold('المتعالي') }
/** The book's names in an entry of the daily order («القابض الباسط» is two). */
export function bookNamesOf(entryName: string): Name[] {
  const parts = entryName === 'القابض الباسط' ? ['القابض', 'الباسط'] : entryName === 'المقدم المؤخر' ? ['المقدم', 'المؤخر'] : [entryName]
  return parts.flatMap((p) => ALIAS[fold(p)] ?? fold(p)).flatMap((f) => ALL.filter((n) => fold(n.name) === f))
}

export function useSuraNames() {
  const [suras, setSuras] = useState<SuraSummary[] | null>(null)
  useEffect(() => {
    getSuras().then(setSuras, () => setSuras([]))
  }, [])
  return suras
}

function refOf(n: Name, suras: SuraSummary[] | null, num: (x: number) => string) {
  if (!n.quran) return null
  const [, s, a] = n.quran.ayah.split(':').map(Number)
  const name = suras?.find((x) => x.n === s)?.name
  return name ? `${name} · ${num(a)}` : null
}

export function NameSheet({ n, onClose, suras }: { n: Name | null; onClose: () => void; suras: SuraSummary[] | null }) {
  const { lang, s, num } = useTools()
  const [ayah, setAyah] = useState<PassageResponse | null | 'error'>(null)
  const [hadith, setHadith] = useState<ToolHadith | null | 'error'>(null)
  useEffect(() => {
    setAyah(null)
    setHadith(null)
    if (n?.quran) getPassage(n.quran.ayah).then(setAyah, () => setAyah('error'))
    if (n?.sunnah) getToolHadith(n.sunnah.id, lang).then(setHadith, () => setHadith('error'))
  }, [n, lang])
  const muyassar = ayah && ayah !== 'error' ? ayah.tafsir?.find((x) => x.key === 'muyassar') : undefined
  return (
    <Sheet open={!!n} onClose={onClose} title={s.nameSheet}>
      {n && (
        <div data-testid="name-sheet">
          <p className="name-big" lang="ar">
            {n.name}
          </p>
          {n.quran && (
            <>
              <p className="tool-label">{fill(s.evidence, { ref: refOf(n, suras, num) ?? n.quran.ayah })}</p>
              {ayah === 'error' ? (
                <Failed onRetry={() => getPassage(n.quran!.ayah).then(setAyah, () => setAyah('error'))} />
              ) : !ayah ? (
                <Loading />
              ) : (
                <>
                  <div className="tool-text">
                    <p lang="ar" dir="rtl" style={{ textAlign: 'center', fontSize: '1.3125rem' }}>
                      {ayah.text}
                    </p>
                  </div>
                  <SourceLine name={s.mushafText} detail={s.ekfu} href={ayah.url} />
                  {muyassar && (
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                      <p className="tool-label">{s.tafsirOfAyah}</p>
                      <p className="tool-tafsir" lang="ar" dir="rtl">
                        {muyassar.text}
                      </p>
                      <SourceLine name={s.muyassar} detail={s.ekfu} href={muyassar.url} />
                    </div>
                  )}
                </>
              )}
            </>
          )}
          {n.sunnah && (
            <>
              <p className="tool-label">{s.evidenceSunnah}</p>
              {hadith === 'error' ? (
                <Failed onRetry={() => getToolHadith(n.sunnah!.id, lang).then(setHadith, () => setHadith('error'))} />
              ) : !hadith ? (
                <Loading />
              ) : (
                <HadithBlock h={{ ...hadith, highlights: [n.sunnah.match] }} />
              )}
            </>
          )}
          {n.book_reference && (
            <p className="tool-muted" lang="ar" dir="rtl">
              {fill(s.bookRef, { r: n.book_reference })}
            </p>
          )}
          <SourceLine name={s.bookName} detail={fill(s.bookPage, { p: pageLabel(n.page, num) })} href={n.url} />
        </div>
      )}
    </Sheet>
  )
}

const goTo = (path: string) => (e: MouseEvent) => {
  e.preventDefault()
  navigate(path)
}

/** The book's list as it was: the 99 in a grid, each opening its sheet. */
function BookGrid({ shown, suras, onOpen }: { shown: Name[]; suras: SuraSummary[] | null; onOpen: (n: Name) => void }) {
  const { s, num } = useTools()
  return (
    <div className="names-grid">
      {shown.map((n) => (
        <button key={n.name} type="button" onClick={() => onOpen(n)} aria-haspopup="dialog">
          <span className="n" lang="ar">
            {n.name}
          </span>
          <span className="tool-muted">{refOf(n, suras, num) ?? (n.sunnah ? s.sunnahShort : '')}</span>
        </button>
      ))}
    </div>
  )
}

export function Names() {
  const { s, num, lang } = useTools()
  const d = NAME_DAY[lang]
  const suras = useSuraNames()
  const [q, setQ] = useState('')
  const [why, setWhy] = useState(false)
  const [open, setOpen] = useState<Name | null>(null)
  // The daily order from the server; null while it loads, 'none' where the server has no list (the book's grid then).
  const [list, setList] = useState<NamesList | null | 'none'>(null)
  useEffect(() => {
    let alive = true
    getNamesList().then(
      (l) => alive && setList(l?.entries?.length ? l : 'none'),
      () => alive && setList('none'),
    )
    return () => {
      alive = false
    }
  }, [])
  const f = fold(q)
  const shown = useMemo(() => (f ? ALL.filter((n) => fold(n.name).includes(f)) : ALL), [f])
  const entries = list && list !== 'none' ? list.entries.filter((e) => !f || fold(e.name).includes(f)) : []
  const appendix = list && list !== 'none' ? list.appendix.filter((e) => !f || fold(e.name).includes(f)) : []
  const fromQ = ALL.filter((n) => n.from === 'quran').length
  const fromS = ALL.length - fromQ
  if (!ALL.length) return <Failed onRetry={() => location.reload()} />
  const ordered = list && list !== 'none'
  /** The book's evidence reference beside a name, or that the book does not list it. */
  const bookLabel = (entryName: string) => {
    const b = bookNamesOf(entryName)
    if (!b.length) return fill(d.notInList, { book: s.bookName })
    return [...new Set(b.map((n) => refOf(n, suras, num) ?? (n.sunnah ? s.sunnahShort : '')))].filter(Boolean).join(' · ')
  }
  return (
    <>
      <ToolHead title={s.namesTitle} />
      <main id="main" className="tool scroll">
        <section className="tool-card pad">
          <p style={{ margin: 0, fontSize: '0.96875rem', lineHeight: 1.8 }}>{fill(s.namesIntro, { q: num(fromQ), s: num(fromS) })}</p>
          {ordered && (
            <p className="nm-order" data-testid="names-order">
              {fill(d.orderIntro, { n: num(list.count) })}
            </p>
          )}
          <div style={{ marginTop: 8 }}>
            <button type="button" className="tool-btn" aria-expanded={why} onClick={() => setWhy((v) => !v)} data-testid="why-not-famous">
              {s.whyNotFamous}
            </button>
          </div>
          {why && (
            <blockquote className="tool-quote" lang="ar" dir="rtl" data-testid="why-quote">
              «{names.why_not_the_famous_list.quote}»
              <br />
              <a className="text-link" href={names.why_not_the_famous_list.url} target="_blank" rel="noopener noreferrer">
                {names.book.title} · {pageLabel(names.why_not_the_famous_list.page, num)} ↗
              </a>
            </blockquote>
          )}
          <SourceLine name={s.bookName} detail={s.bookBy} href={names.book.url} />
        </section>
        <div role="search">
          <input className="tool-field" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={s.searchName} aria-label={s.searchName} />
        </div>
        {list === null ? (
          <Loading />
        ) : !ordered ? (
          shown.length === 0 ? (
            <p className="tool-note">{s.noResults}</p>
          ) : (
            <BookGrid shown={shown} suras={suras} onOpen={setOpen} />
          )
        ) : (
          <>
            {entries.length === 0 && appendix.length === 0 && <p className="tool-note">{s.noResults}</p>}
            {entries.length > 0 && (
              <ol className="nm-list" data-testid="names-list">
                {entries.map((e) => (
                  <li key={e.n}>
                    <a href={namePath(e.n)} onClick={goTo(namePath(e.n))} data-n={e.n}>
                      <span className="nm-n">{num(e.n)}</span>
                      <span className="nm-name" lang="ar" dir="rtl">
                        {e.name}
                      </span>
                      <span className="nm-ref">{bookLabel(e.name)}</span>
                    </a>
                  </li>
                ))}
              </ol>
            )}
            {appendix.length > 0 && (
              <section className="nm-appendix" aria-labelledby="nm-appendix-h" data-testid="names-appendix">
                <h2 id="nm-appendix-h" lang={lang}>
                  {d.appendixTitle}
                </h2>
                {lang !== 'ar' && appendix.some((a) => a.note) && <p className="nm-in-ar">{d.inArabic}</p>}
                <ul>
                  {appendix.map((a) => {
                    const b = bookNamesOf(a.name)
                    return (
                      <li key={a.n} data-n={a.n}>
                        <p className="nm-name" lang="ar" dir="rtl">
                          {a.name}
                        </p>
                        {a.note && (
                          <p className="nm-note" lang="ar" dir="rtl">
                            <b>{NAME_DAY.ar.appendixNote}:</b> <Cited t={a.note} />
                          </p>
                        )}
                        {b.map((n) => (
                          <button key={n.name} type="button" className="tool-btn nm-book" onClick={() => setOpen(n)} aria-haspopup="dialog">
                            {fill(d.inBook, { book: s.bookName })}
                          </button>
                        ))}
                      </li>
                    )
                  })}
                </ul>
              </section>
            )}
          </>
        )}
      </main>
      <NameSheet n={open} onClose={() => setOpen(null)} suras={suras} />
    </>
  )
}
