import type { ReactNode } from 'react'
import { BrandMarks } from '../../components/BrandMarks'
import type { Draft } from '../../components/Composer'
import { useI18n } from '../../i18n'
import { navigate } from '../../quran/route'
import { NextPrayerLine, TodayGrid } from '../daily/HomeSlots'
import { AskCard } from './AskCard'
import { DayCard } from './DayCard'
import { HOME } from './strings'
import './home.css'

function IconStarter() {
  return (
    <svg width="34" height="34" viewBox="-12 -12 24 24" aria-hidden="true" focusable="false">
      <use href="#rose" />
    </svg>
  )
}
function IconQuran() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M12 6.5C10 5 7 4.6 4 5v13c3-.4 6 0 8 1.5 2-1.5 5-1.9 8-1.5V5c-3-.4-6 0-8 1.5Z" />
      <path d="M12 6.5V19" />
    </svg>
  )
}
function IconBooks() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M5 4.5h3.2v15H5z" />
      <path d="M10.4 4.5h3.2v15h-3.2z" />
      <path d="m15.6 5.6 3.1-.8 3 14.5-3.1.8z" transform="translate(-1.6 .2)" />
    </svg>
  )
}

const lines = (s: string) =>
  s.split('\n').flatMap((x, k) => (k ? [<br key={k} />, x] : [x]))

/** The second version's home page (V2 §1, c01): «اسأل» first, then «آية وحديث اليوم», then the section cards. The daily
 *  features' two places (part D) sit above «اسأل» and after the card. Talal's marks stay at the foot (CLAUDE.md §8). */
export function Home({
  onSubmit,
  busy,
  onStarter,
  draft,
  children,
}: {
  onSubmit: (q: string) => void
  busy: boolean
  onStarter: () => void
  draft?: Draft | null
  children?: ReactNode
}) {
  const { t, lang } = useI18n()
  const s = HOME[lang]
  return (
    <div className="v2-home">
      <NextPrayerLine />
      <AskCard key={draft?.n ?? 0} onSubmit={onSubmit} busy={busy} draft={draft} />
      <DayCard />
      <TodayGrid />
      <div className="home-sections">
        <button type="button" className="home-tile is-starter" onClick={onStarter} aria-haspopup="dialog">
          <span className="tile-glow tint-gold" aria-hidden="true" />
          <span className="tile-in">
            <span className="tile-icon">
              <IconStarter />
            </span>
            <span className="tile-gap" />
            <span className="tile-sub">{s.starterSub}</span>
            <span className="tile-title">{lines(s.starterTitle)}</span>
          </span>
        </button>
        <a className="home-tile" href="/quran" onClick={(e) => (e.preventDefault(), navigate('/quran'))}>
          <span className="tile-glow tint-blue" aria-hidden="true" />
          <span className="tile-in is-row">
            <span className="tile-title">{lines(s.quran)}</span>
            <span className="tile-icon">
              <IconQuran />
            </span>
          </span>
        </a>
        <a className="home-tile" href="/books" onClick={(e) => (e.preventDefault(), navigate('/books'))}>
          <span className="tile-glow tint-green" aria-hidden="true" />
          <span className="tile-in is-row">
            <span className="tile-title">{lines(s.aqeedah)}</span>
            <span className="tile-icon">
              <IconBooks />
            </span>
          </span>
        </a>
      </div>
      {children}
      {/* The disclosure the composer carried on the first version's welcome page (not a mufti; AI-assisted). */}
      <p className="footer-line home-footer">{t.footer}</p>
      <BrandMarks place="welcome" />
    </div>
  )
}
