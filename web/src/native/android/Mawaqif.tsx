// «افتحها تلقائيًا» in the Android app (reply 0067): Android's three ways instead of the iPhone's Siri, car and
// Shortcuts' NFC (v2/daily/mawaqif/Mawaqif.tsx Auto, unchanged): the app icon's shortcuts, a dhikr on the home screen,
// and an NFC tag carrying the dhikr's link. The second and third start on a dhikr's page (SituationActions).
// No Google Assistant (its App Actions are being retired) and no Android Auto.
import { useEffect, useState, type ReactNode } from 'react'
import { useI18n } from '../../i18n'
import { Screen } from '../../v2/daily/Screen'
import { IcNfc, SituationIcon } from '../../v2/daily/mawaqif/icons'
import type { Situation } from '../../v2/daily/mawaqif/mawaqif-model'
import { MAWAQIF } from '../../v2/daily/mawaqif/strings-mawaqif'
import { canPin, copyLink, mawaqifLink, pinSituation } from './shortcuts'
import { ANDROID } from './strings'
import './android.css'

function Way({ id, icon, title, body, steps, extra }: { id: string; icon: ReactNode; title: string; body: string; steps: string[]; extra?: ReactNode }) {
  return (
    <section className="mq-way" aria-labelledby={`mq-way-${id}`} data-testid={`way-${id}`}>
      <span className="mq-way-ic">{icon}</span>
      <div>
        <h2 id={`mq-way-${id}`}>{title}</h2>
        <p>{body}</p>
        <ol>
          {steps.map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ol>
        {extra}
      </div>
    </section>
  )
}

export function AutoAndroid() {
  const { lang } = useI18n()
  const s = MAWAQIF[lang]
  const a = ANDROID[lang]
  return (
    <Screen title={s.autoTitle}>
      <p className="mq-lead">{s.autoLead}</p>
      <Way id="icon" icon={<SituationIcon name="hand" />} title={a.iconTitle} body={a.iconBody} steps={a.iconSteps} />
      <Way id="home" icon={<SituationIcon name="house" />} title={a.homeTitle} body={a.homeBody} steps={a.homeSteps} />
      <Way id="nfc" icon={<IcNfc />} title={s.nfcTitle} body={a.nfcBody} steps={a.nfcSteps} extra={<p className="mq-needs">{a.nfcNeeds}</p>} />
      <p className="tool-note">{a.ourPart}</p>
    </Screen>
  )
}

/** On a dhikr's page: «أضف إلى الشاشة الرئيسية» (when the launcher can pin) and «انسخ رابط الملصق». The link itself is
 *  not written on the page (no Latin text in the interface, CLAUDE.md §8): it is copied, and pasted in the NFC app. */
export function SituationActions({ sit, step }: { sit: Situation; step: string | null }) {
  const { lang } = useI18n()
  const a = ANDROID[lang]
  const [pinnable, setPinnable] = useState(false)
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    let alive = true
    void canPin().then((v) => alive && setPinnable(v))
    return () => {
      alive = false
    }
  }, [])
  useEffect(() => {
    if (!copied) return
    const t = window.setTimeout(() => setCopied(false), 2500)
    return () => window.clearTimeout(t)
  }, [copied])
  const link = mawaqifLink(sit.id, step)
  return (
    <div className="mq-android" data-testid="mq-android-actions">
      {pinnable && (
        <button type="button" className="mq-nx" onClick={() => void pinSituation(sit, lang, step).catch(() => undefined)} data-testid="mq-pin">
          <SituationIcon name={sit.icon} size={20} />
          {a.pin}
        </button>
      )}
      <button
        type="button"
        className="mq-nx"
        onClick={() =>
          void copyLink(link).then(
            () => setCopied(true),
            () => undefined,
          )
        }
        data-testid="mq-copy-link"
      >
        <IcNfc />
        {copied ? a.copied : a.copyLink}
      </button>
    </div>
  )
}
