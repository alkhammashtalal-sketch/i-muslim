// The Beautiful Names (reply 0032 D-8; boards Names and NameSheet): the 99 names as listed in Ibn Uthaymeen's
// «القواعد المثلى» (data/names.json, from shamela.ws book 8874, pp. 15-16). Each name's evidence where it was found:
// an ayah where the name itself is said of Allah (its text and al-Muyassar from D1), or a sahih or hasan hadith from
// HadeethEnc. A name without evidence stays (it is from the book) and its evidence part is hidden. The button «لماذا
// ليست القائمة المشهورة؟» quotes the Sheikh's own words in the same book, with the page's link.
import { useEffect, useMemo, useState } from 'react'
import type { PassageResponse, SuraSummary } from '../../../../../shared/api'
import names from '../../../../../data/names.json'
import { Sheet } from '../../../components/Sheet'
import { getPassage, getSuras, getToolHadith, type ToolHadith } from '../api'
import { Failed, HadithBlock, Loading, SourceLine, ToolHead, useTools } from '../ToolParts'
import { fill } from '../strings-tools'

type Name = (typeof names.names)[number] & { quran?: { ayah: string; match: string }; sunnah?: { id: string; match: string }; book_reference?: string | null }
const ALL = names.names as Name[]

/** «ص15» with the language's digits. */
const pageLabel = (p: string, num: (x: number) => string) => p.replace(/\d+/g, (d) => num(Number(d)))

const fold = (s: string) => s.replace(/[ً-ْٰـ]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').trim()

function useSuraNames() {
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

function NameSheet({ n, onClose, suras }: { n: Name | null; onClose: () => void; suras: SuraSummary[] | null }) {
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

export function Names() {
  const { s, num } = useTools()
  const suras = useSuraNames()
  const [q, setQ] = useState('')
  const [why, setWhy] = useState(false)
  const [open, setOpen] = useState<Name | null>(null)
  const shown = useMemo(() => (q.trim() ? ALL.filter((n) => fold(n.name).includes(fold(q))) : ALL), [q])
  const fromQ = ALL.filter((n) => n.from === 'quran').length
  const fromS = ALL.length - fromQ
  if (!ALL.length) return <Failed onRetry={() => location.reload()} />
  return (
    <>
      <ToolHead title={s.namesTitle} />
      <main id="main" className="tool scroll">
        <section className="tool-card pad">
          <p style={{ margin: 0, fontSize: '0.96875rem', lineHeight: 1.8 }}>{fill(s.namesIntro, { q: num(fromQ), s: num(fromS) })}</p>
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
        {shown.length === 0 ? (
          <p className="tool-note">{s.noResults}</p>
        ) : (
          <div className="names-grid">
            {shown.map((n) => (
              <button key={n.name} type="button" onClick={() => setOpen(n)} aria-haspopup="dialog">
                <span className="n" lang="ar">
                  {n.name}
                </span>
                <span className="tool-muted">{refOf(n, suras, num) ?? (n.sunnah ? s.sunnahShort : '')}</span>
              </button>
            ))}
          </div>
        )}
      </main>
      <NameSheet n={open} onClose={() => setOpen(null)} suras={suras} />
    </>
  )
}
