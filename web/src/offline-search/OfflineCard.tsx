import { useI18n } from '../i18n'
import { AyahEnd } from '../quran/AyahEnd'
import { arabicDigits, ayahOf, displayRef, suraTitle } from '../quran/format'
import { useOnline } from '../quran/recitation'
import { navigate } from '../quran/route'
import { Mkp, MushafFrame } from '../components/Ornaments'
import { HadithText } from '../v2/answer/HadithBox'
import type { OfflineFound } from './client'
import { OFFLINE_SEARCH } from './strings'
import './offline-search.css'

/** «اسأل» with no connection (reply 0056 ب): the line that says it is a word search and not an answer, the places the
 *  question names, then the ten best rows as the answer's quote cards show them (text, reference, opening it), and
 *  «أعد السؤال» once the connection is back. No model and no text of ours. */
export function OfflineCard({ found, onRetry }: { found: OfflineFound; onRetry: () => void }) {
  const { lang } = useI18n()
  const s = OFFLINE_SEARCH[lang]
  const online = useOnline()
  const open = (path: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    navigate(path)
  }
  return (
    <article className="card off-card" data-testid="offline-results">
      <p className="off-line" role="status">
        {s.line}
      </p>
      {online && (
        <button type="button" className="btn btn-primary off-retry" onClick={onRetry} data-testid="offline-retry">
          {s.retry}
        </button>
      )}
      {found.places.length > 0 && (
        <section aria-label={s.places} className="off-places">
          {found.places.map((p) => (
            <a key={p.path} className="off-place" href={p.path} onClick={open(p.path)} lang="ar">
              {p.label}
            </a>
          ))}
        </section>
      )}
      {found.results.length === 0 ? (
        found.places.length === 0 && <p className="off-none">{s.none}</p>
      ) : (
        <section aria-label={s.results} className="off-results">
          {found.results.map((r) => (
            <section key={r.id} className="v2-quote off-quote" data-kind={r.kind}>
              <span className="small off-kind">{r.kind === 'ayah' ? s.ayah : r.kind === 'dhikr' ? s.dhikr : s.mawaqif}</span>
              {r.kind === 'ayah' ? (
                <MushafFrame title={suraTitle(r.ref)} ayah={r.id}>
                  <p className="sacred" lang="ar" dir="rtl">
                    <AyahEnd text={r.text}>
                      <Mkp n={arabicDigits(ayahOf(r.id))} size={30} />
                    </AyahEnd>
                  </p>
                </MushafFrame>
              ) : r.kind === 'dhikr' ? (
                <HadithText text={r.text} />
              ) : (
                <p className="sacred" lang="ar" dir="rtl">
                  {r.text}
                </p>
              )}
              <div className="quote-meta">
                <span className="ref" lang="ar">
                  {r.kind === 'ayah' ? displayRef(r.ref, lang) : r.ref}
                </span>
                <div className="quote-links">
                  <a className="text-link" href={r.path} onClick={open(r.path)}>
                    {s.open}
                  </a>
                </div>
              </div>
            </section>
          ))}
        </section>
      )}
    </article>
  )
}
