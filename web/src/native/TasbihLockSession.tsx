// «اعرضها على شاشة القفل» on the tasbih page (add-on 0072-add19 §3): starts «جلسة تسبيح بعد الصلاة» as a Live
// Activity on the iPhone (iOS 16.2 and later; its «+١» buttons need iOS 17). Shown only where the phone can show it.
// The narration: hadith 10948 («تمام المئة»), or hadith 6259 («أربع وثلاثون تكبيرة») once its text is loaded.
import { useEffect, useState } from 'react'
import type { Lang } from '../../../shared/api'
import { getToolHadith, type ToolHadith } from '../v2/daily/api'
import { ALERT_TEXT } from './alert-strings'
import { NARRATION_ID, sessionSource, sessionSteps, TasbihSession, type Narration } from './tasbih-session'
import { digitsOf } from './widget-data'

export function TasbihLockSession({ lang, texts, rtl }: { lang: Lang; texts: Record<string, ToolHadith>; rtl: boolean }) {
  const t = ALERT_TEXT[lang] ?? ALERT_TEXT.ar
  const [ok, setOk] = useState<{ supported: boolean; enabled: boolean } | null>(null)
  const [active, setActive] = useState(false)
  const [narration, setNarration] = useState<Narration>('hundred')
  const [all, setAll] = useState<Record<string, ToolHadith>>(texts)
  const [msg, setMsg] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    TasbihSession.available().then((r) => alive && setOk(r), () => alive && setOk({ supported: false, enabled: false }))
    TasbihSession.active().then((r) => alive && setActive(r.active), () => undefined)
    getToolHadith(NARRATION_ID.thirtyFour, lang).then((h) => alive && setAll((v) => ({ ...v, [h.id]: h })), () => undefined)
    return () => {
      alive = false
    }
  }, [lang])
  if (!ok?.supported) return null
  const choices = (['hundred', 'thirtyFour'] as Narration[]).filter((n) => sessionSteps(n, all))

  const start = async () => {
    setMsg(null)
    const steps = sessionSteps(narration, all)
    const h = all[NARRATION_ID[narration]]
    if (!steps || !h) return
    const r = await TasbihSession.start({ title: t.sessionTitle, steps, source: sessionSource(h, t), done: t.done, digits: digitsOf(lang), rtl }).catch(() => ({ ok: false, error: 'failed' }))
    if (r.ok) {
      setActive(true)
      setMsg(t.sessionOn)
    } else setMsg(r.error === 'disabled' ? t.sessionOff : t.error)
  }
  const end = async () => {
    await TasbihSession.end().catch(() => undefined)
    setActive(false)
    setMsg(null)
  }

  return (
    <div className="tasbih-lock" data-testid="tasbih-lock">
      {choices.length > 1 && (
        <div role="tablist" className="tool-seg" aria-label={t.narration} style={{ margin: '10px 0' }}>
          {choices.map((n) => (
            <button key={n} type="button" role="tab" aria-selected={narration === n} onClick={() => setNarration(n)}>
              {n === 'hundred' ? t.hundred : t.thirtyFour}
            </button>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button type="button" className="tool-btn" onClick={start} disabled={!ok.enabled} data-testid="tasbih-lock-start">
          {t.showOnLock}
        </button>
        {active && (
          <button type="button" className="tool-btn" onClick={end}>
            {t.sessionEnd}
          </button>
        )}
      </div>
      {!ok.enabled && <p className="tool-note">{t.sessionOff}</p>}
      {msg && (
        <p className="tool-note" role="status">
          {msg}
        </p>
      )}
    </div>
  )
}
