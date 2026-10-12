// The frame of a daily screen (boards PrayerTimes, Qibla, Calendar, Goals, Mosques): a back button and the title,
// then the cards; and the privacy line that ends each screen.
import type { ReactNode } from 'react'
import { IconChevronBack } from '../../components/Icons'
import { navigate } from '../../quran/route'
import { useI18n } from '../../i18n'
import { IcLock } from './icons'
import { TODAY } from './strings-today'
import './today.css'

/** Back to where the user came from inside the app, else home. */
export function goBack() {
  if (history.state?.muslimToday) history.back()
  else navigate('/')
}

export function Screen({ title, children }: { title: string; children: ReactNode }) {
  const { lang } = useI18n()
  return (
    <div className="dt-screen">
      <header className="dt-head">
        <button type="button" className="v2-icon-btn" onClick={goBack} aria-label={TODAY[lang].back}>
          <IconChevronBack />
        </button>
        <h1>{title}</h1>
      </header>
      <main id="main" className="dt-main">
        {children}
      </main>
    </div>
  )
}

export const Privacy = ({ children }: { children: ReactNode }) => (
  <div className="dt-privacy">
    <span aria-hidden="true">
      <IcLock />
    </span>
    <p>{children}</p>
  </div>
)

/** Open a daily screen and mark the history entry, so «back» returns here rather than leaving the app. */
export function openToday(path: string) {
  navigate(path)
  history.replaceState({ ...(history.state ?? {}), muslimToday: true }, '', location.href)
}
