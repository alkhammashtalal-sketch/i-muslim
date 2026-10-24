// /today/salaf/<n>/share: the widget «من أقوال السلف»'s «شارك» (imuslim://today/salaf/<n>/share, add-on 0072-add10 §2):
// the saying's card with its share image already open. The card is Arabic, as on the home page; the widget that links
// here says «بالعربية» in its gallery. A number not in the list shows the home's link instead.
import { useState } from 'react'
import { Screen } from '../Screen'
import { SALAF_CARDS, salafDay, salafOfDay } from './salaf-model'
import { SalafCardView } from './SalafCard'
import { SALAF_TITLE, SalafShareSheet } from './SalafShare'

export const salafOfPath = (path: string) => {
  const m = path.match(/^\/today\/salaf\/(\d{1,3})\/share\/?$/)
  return m ? (SALAF_CARDS.find((c) => c.n === Number(m[1])) ?? null) : null
}

export function SalafPage() {
  const [card] = useState(() => salafOfPath(location.pathname))
  // The date goes on the image only when it is this Riyadh day's saying.
  const [day] = useState(() => (card && salafOfDay()?.n === card.n ? salafDay() : null))
  const [sharing, setSharing] = useState(true)
  return (
    <Screen title={SALAF_TITLE}>
      {card ? (
        <div lang="ar" dir="rtl" data-testid="salaf-page">
          <SalafCardView card={card} onShare={() => setSharing(true)} />
          <SalafShareSheet open={sharing} onClose={() => setSharing(false)} card={card} day={day} />
        </div>
      ) : (
        <p className="tool-note">
          <a className="text-link" href="/">
            {SALAF_TITLE}
          </a>
        </p>
      )}
    </Screen>
  )
}
