import { levelLabel, useI18n } from '../i18n'
import { fmt, numFmt } from '../quran/format'
import { LEVELS } from '../trust/level-strings'
import { SERVED } from '../v2/lang/served'
import { sitePage } from '../v2/site/links'
import { SITE_LINKS } from '../v2/site/strings'
import { SOURCES_UI } from '../v2/sources/strings'

// «عن التطبيق» as the store's app shows it (reply 0042): no team, no AI-tools disclosure, no source-code link and no
// judges' link (those were the challenge's); the privacy line points to the site's policy; the content languages are
// counted from data/served-langs.json; the version is the build's (__APP_VERSION__, web/package.json).

export function About() {
  const { t, lang } = useI18n()
  return (
    <main id="main" className="page" tabIndex={-1}>
      <h1>{t.aboutTitle}</h1>

      <section>
        <h2>{t.howTitle}</h2>
        <ol>
          <li>{t.how1}</li>
          <li>{t.how2}</li>
          <li>{t.how3}</li>
          <li>{t.how4}</li>
          <li>{t.how5}</li>
        </ol>
      </section>

      <section>
        <h2>{t.levelsTitle}</h2>
        <ul className="levels">
          {(
            [
              ['A', t.levelADesc],
              ['B', t.levelBDesc],
              ['C', t.levelCDesc],
              ['D', t.levelDDesc],
            ] as const
          ).map(([l, d]) => (
            <li key={l}>
              <span className="badge badge-level">{levelLabel(t, l)}</span>
              <span>{d}</span>
            </li>
          ))}
        </ul>
        <p>{LEVELS[lang].aboutAB}</p>
      </section>

      <section>
        <h2>{t.notMuftiTitle}</h2>
        <p>{t.notMuftiBody}</p>
      </section>

      <section>
        <h2>{t.language}</h2>
        <p>{fmt(t.aboutLanguages, { n: numFmt(lang)(SERVED.length) })}</p>
      </section>

      <section>
        <h2>{t.privacyTitle}</h2>
        <p>{t.privacyBody}</p>
        <p>
          <a className="text-link" href={sitePage('privacy', lang)} target="_blank" rel="noopener noreferrer">
            {SITE_LINKS[lang].privacy}
            <span className="sr-only"> ({SITE_LINKS[lang].opensOutside})</span>
          </a>
        </p>
      </section>

      <section>
        <h2>{t.licensesTitle}</h2>
        <p>{fmt(t.licensesBody, { sources: SOURCES_UI[lang].title })}</p>
      </section>

      <p className="small">{fmt(t.versionLine, { v: __APP_VERSION__ })}</p>
    </main>
  )
}
