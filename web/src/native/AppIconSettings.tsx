// «أيقونة التطبيق» in the iPhone app's settings (add-ons 0072-add31 §2 and 0072-add32 §3): the four icons side by side,
// the one on the Home Screen marked. Shown only once the plugin says the device can change it (app-icon.ts), so Android
// and the browser show nothing. A tap asks iOS to change it; iOS shows its own notice, and the mark moves only when iOS says it is done.
import { useEffect, useState } from 'react'
import type { Lang } from '../../../shared/api'
import { APP_ICONS, currentAppIcon, setAppIcon, type AppIconId } from './app-icon'
import { APP_ICON_TEXT } from './app-icon-strings'

export function AppIconSettings({ lang }: { lang: Lang }) {
  const t = APP_ICON_TEXT[lang] ?? APP_ICON_TEXT.ar
  const [current, setCurrent] = useState<AppIconId | null>(null)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let alive = true
    void currentAppIcon().then((c) => alive && setCurrent(c))
    return () => {
      alive = false
    }
  }, [])
  if (current === null) return null

  const pick = async (id: AppIconId) => {
    if (busy || id === current) return
    setBusy(true)
    setFailed(false)
    const ok = await setAppIcon(id)
    if (ok) setCurrent(id)
    else setFailed(true)
    setBusy(false)
  }

  return (
    <section className="v2-set-section" aria-labelledby="set-app-icon" data-testid="app-icon-settings">
      <h3 id="set-app-icon">{t.section}</h3>
      <div className="v2-set-group">
        <div className="v2-appicons" role="radiogroup" aria-labelledby="set-app-icon">
          {APP_ICONS.map((i) => (
            <button
              key={i.id}
              type="button"
              role="radio"
              className="v2-appicon"
              aria-checked={current === i.id}
              aria-disabled={busy || undefined}
              data-testid={`app-icon-${i.id}`}
              onClick={() => pick(i.id)}
            >
              <img src={i.thumb} alt="" width={60} height={60} draggable={false} />
              <span className="v2-appicon-name">{t.names[i.id]}</span>
              {i.native === null && <span className="v2-appicon-default">{t.isDefault}</span>}
            </button>
          ))}
        </div>
      </div>
      <p className="v2-set-hint v2-appicon-hint">{t.hint}</p>
      {failed && (
        <p className="v2-set-hint" role="status">
          {t.error}
        </p>
      )}
    </section>
  )
}
