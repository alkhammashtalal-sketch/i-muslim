import { levelLabel, useI18n } from '../i18n'
import { Cartouche, Divider, Rose } from '../components/Ornaments'
import { ReaderLink } from '../quran/QuranIndex'
import { displayRef, fmt, numFmt } from '../quran/format'
import { bookPath, quranPath } from '../quran/route'
import raw from './data.json'
import { VERIFY } from './strings'
import './verify.css'

// «تحقّق بنفسك» (/verify, command 17): the twelve official cases of the challenge's package, what the app did with
// each, and the comparison with a general model, from eval/reports/ (scripts/verify/build-data.mjs). For the judges;
// linked from the About page and the README, not from the welcome page.

type Result = 'pass' | 'fail' | 'manual'
type Case = {
  id: string
  package_case: string
  q: string
  lang: string
  expected: string
  manual: string | null
  type: 'answer' | 'abstain' | 'referral' | 'error'
  level: 'A' | 'B' | 'C' | 'D' | null
  disputed: boolean
  quotes: { id: string; kind: string; ref: string }[]
  checks: { name: string; result: Result }[]
  result: Result
}
type Pair = [number, number]
type Run = {
  file: string
  n: number
  cites: { general: Pair; ours: Pair }
  refsInSources: { general: Pair; ours: Pair }
  misattributed: { general: Pair; ours: Pair }
  hadithRefs: { general: number }
  verified: { ours: Pair }
}
type Data = {
  mock: boolean
  date: string
  model: string | null
  modelLabel: string | null
  mode: string | null
  cases: Case[]
  compare: { date: string; runs: Run[] } | null
  reports: { file: string; url: string }[]
}
const data = raw as unknown as Data

const BADGE: Record<Result, string> = { pass: 'badge-verified', fail: 'badge-mt', manual: 'badge-level' }

function quoteLink(id: string) {
  const [kind, a, b] = id.split(':')
  if (kind === 'quran') return quranPath(Number(a), Number(b))
  if (kind === 'aqeedah') return bookPath(a, id)
  return null
}

function CaseCard({ c, n, onTry }: { c: Case; n: number; onTry: (q: string) => void }) {
  const { t, lang } = useI18n()
  const v = VERIFY[lang]
  const num = numFmt(lang)
  const hint = `try-${c.id}`
  const rtlQ = c.lang === 'ar' || c.lang === 'ur'
  return (
    <li className="card verify-case" aria-labelledby={`case-${c.id}`}>
      <Cartouche>
        <span role="heading" aria-level={2} id={`case-${c.id}`}>
          {fmt(v.caseN, { n: num(n) })}
        </span>
      </Cartouche>
      <dl className="verify-fields">
        <div>
          <dt>{v.packageCase}</dt>
          <dd lang="ar" dir="rtl">
            {c.package_case}
          </dd>
        </div>
        <div>
          <dt>{v.question}</dt>
          <dd className="verify-q" lang={c.lang} dir={rtlQ ? 'rtl' : 'ltr'}>
            {c.q}
          </dd>
        </div>
        <div>
          <dt>{v.expected}</dt>
          <dd lang="ar" dir="rtl">
            {c.expected}
          </dd>
        </div>
        <div>
          <dt>{v.appDid}</dt>
          <dd>
            <span className="verify-did">
              <span>{v.type[c.type] ?? c.type}</span>
              {c.level && <span className="badge badge-level">{levelLabel(t, c.level)}</span>}
            </span>
            {c.disputed && <span className="verify-sub">{v.disputed}</span>}
            <span className="verify-sub">
              {v.quotes}:{' '}
              {c.quotes.length
                ? c.quotes.map((q, i) => {
                    const to = quoteLink(q.id)
                    const label = (
                      <span lang="ar" dir="rtl">
                        {displayRef(q.ref, lang)}
                      </span>
                    )
                    return (
                      <span key={q.id}>
                        {i > 0 && '، '}
                        {to ? (
                          <ReaderLink to={to} className="text-link">
                            {label}
                          </ReaderLink>
                        ) : (
                          label
                        )}
                      </span>
                    )
                  })
                : v.noQuotes}
            </span>
          </dd>
        </div>
        <div className="verify-result">
          <dt>{v.result}</dt>
          <dd>
            <span className={`badge ${BADGE[c.result]}`}>{v[c.result]}</span>
            {c.result === 'manual' && c.manual && (
              <span className="verify-sub">
                {fmt(v.manualNote, { text: '' })}
                <span lang="ar" dir="rtl">
                  {c.manual}
                </span>
              </span>
            )}
          </dd>
        </div>
      </dl>
      <button type="button" className="btn verify-try" onClick={() => onTry(c.q)} aria-describedby={hint}>
        {v.tryNow}
      </button>
      <p className="sr-only" id={hint}>
        {v.tryHint}
      </p>
    </li>
  )
}

function Compare() {
  const { t, lang } = useI18n()
  const v = VERIFY[lang]
  const num = numFmt(lang)
  const cmp = data.compare
  if (!cmp) return <p>{v.compareNone}</p>
  const pair = ([a, b]: Pair) => `${num(a)}/${num(b)}`
  const rows: [string, (r: Run) => string][] = [
    [`${v.cites} — ${v.general}`, (r) => pair(r.cites.general)],
    [`${v.cites} — ${t.appName}`, (r) => pair(r.cites.ours)],
    [`${v.refsInSources} — ${v.general}`, (r) => pair(r.refsInSources.general)],
    [`${v.refsInSources} — ${t.appName}`, (r) => pair(r.refsInSources.ours)],
    [`${v.misattributed} — ${v.general}`, (r) => pair(r.misattributed.general)],
    [`${v.misattributed} — ${t.appName}`, (r) => pair(r.misattributed.ours)],
    [`${v.hadithRefs} — ${v.general}`, (r) => num(r.hadithRefs.general)],
    [`${v.allVerified} — ${t.appName}`, (r) => pair(r.verified.ours)],
  ]
  return (
    <>
      <p>{fmt(v.compareIntro, { n: num(cmp.runs[0].n) })}</p>
      <div className="verify-table-wrap">
        <table className="verify-table">
          <thead>
            <tr>
              <th scope="col">{v.metric}</th>
              {cmp.runs.map((r, i) => (
                <th scope="col" key={r.file}>
                  {fmt(v.run, { n: num(i + 1) })}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, cell]) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                {cmp.runs.map((r) => (
                  <td key={r.file}>{cell(r)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

export function Verify({ onTry }: { onTry: (q: string) => void }) {
  const { lang } = useI18n()
  const v = VERIFY[lang]
  const num = numFmt(lang)
  const tally = data.cases.reduce((m, c) => ({ ...m, [c.result]: m[c.result] + 1 }), { pass: 0, fail: 0, manual: 0 } as Record<Result, number>)
  const date = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-SA-u-ca-gregory-nu-arab' : lang, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${data.date}T00:00:00Z`))
  const honest = fmt(v.honest, { date, model: '\u0000' }).split('\u0000')
  return (
    <main id="main" className="page verify" tabIndex={-1}>
      <header className="verify-head">
        <h1>
          <Rose size={18} />
          <span>{v.title}</span>
          <Rose size={18} />
        </h1>
        <p className="verify-intro">{v.intro}</p>
        {data.mock && (
          <p className="verify-demo" role="note">
            {v.demo}
          </p>
        )}
        <p className="small">
          {honest[0]}
          {data.modelLabel ? (
            <bdi dir="ltr" className="verify-model" title={data.model ?? undefined}>
              {data.modelLabel}
            </bdi>
          ) : (
            v.modelMock
          )}
          {honest[1]}
        </p>
        <p className="verify-tally">
          {fmt(v.tally, { pass: num(tally.pass), fail: num(tally.fail), manual: num(tally.manual), n: num(data.cases.length) })}
        </p>
        {v.packageArabic && <p className="small">{v.packageArabic}</p>}
      </header>

      <ol className="verify-cases">
        {data.cases.map((c, i) => (
          <CaseCard key={c.id} c={c} n={i + 1} onTry={onTry} />
        ))}
      </ol>

      <Divider />
      <section aria-labelledby="verify-compare">
        <h2 id="verify-compare">{v.compareTitle}</h2>
        <Compare />
      </section>

      <section aria-labelledby="verify-reports">
        <h2 id="verify-reports">{v.reportsTitle}</h2>
        <ul className="verify-reports">
          {data.reports.map((r) => (
            <li key={r.file}>
              <a className="text-link" href={r.url} target="_blank" rel="noopener noreferrer" dir="ltr">
                {r.file}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
