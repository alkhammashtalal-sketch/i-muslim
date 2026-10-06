import { levelLabel, useI18n } from '../i18n'
import { LEVELS } from '../trust/level-strings'

export const REPO_URL = 'https://github.com/alkhammashtalal-sketch/i-muslim'

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
        <p>{t.aboutLanguages}</p>
      </section>

      <section>
        <h2>{t.privacyTitle}</h2>
        <p>{t.privacyBody}</p>
      </section>

      <section>
        <h2>{t.teamTitle}</h2>
        <ul>
          <li>{t.teamLead}</li>
          <li>{t.teamReview}</li>
        </ul>
      </section>

      <section>
        <h2>{t.aiTitle}</h2>
        <p>{t.aiBody}</p>
      </section>

      <section>
        <h2>{t.repoTitle}</h2>
        <p>
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
            {t.repoLink}
          </a>
        </p>
      </section>

      <section>
        <h2>{t.licensesTitle}</h2>
        <p>{t.licensesBody}</p>
      </section>

      <p className="small">{t.versionLine}</p>
    </main>
  )
}
