// /today/salaf/<n>/share: the widget «من أقوال السلف»'s «شارك» (imuslim://today/salaf/<n>/share, add-on 0072-add10 §2):
// the saying's card with its share image already open. The card is Arabic, as on the home page; the widget that links
// here says «بالعربية» in its gallery. A number not in the list shows the home's link instead.
import { useMemo, useState } from 'react'
import { langMeta, useI18n } from '../../../i18n'
import { quoteNote } from '../arabic-marks'
import { Screen } from '../Screen'
import { SALAF_CARDS, salafDay, salafOfDay } from './salaf-model'
import { SalafCardView } from './SalafCard'
import { SALAF_TITLE, SalafShareSheet } from './SalafShare'
import { CardsSheet } from '../../cards/CardsSheet'
import { salafDeck } from '../../cards/decks'

export const salafOfPath = (path: string) => {
  const m = path.match(/^\/today\/salaf\/(\d{1,3})\/share\/?$/)
  return m ? (SALAF_CARDS.find((c) => c.n === Number(m[1])) ?? null) : null
}

export function SalafPage() {
  const [card] = useState(() => salafOfPath(location.pathname))
  // The date goes on the image only when it is this Riyadh day's saying.
  const [day] = useState(() => (card && salafOfDay()?.n === card.n ? salafDay() : null))
  const [sharing, setSharing] = useState(true)
  const [cards, setCards] = useState(false)
  const { lang } = useI18n()
  // Outside Arabic (the widget's «شارك» from any interface): «النص بالعربية» above the card, which stays Arabic, never
  // translated (add-on 0072-add23 §4.7–§4.8).
  const note = quoteNote(lang)
  const deck = useMemo(() => (cards && card ? salafDeck(card, lang, SALAF_TITLE) : null), [cards, card, lang])
  return (
    <Screen title={SALAF_TITLE}>
      {card && note ? (
        <p className="tool-note" lang={lang} dir={langMeta(lang).dir} data-testid="salaf-in-arabic">
          {note}
        </p>
      ) : null}
      {card ? (
        <div lang="ar" dir="rtl" data-testid="salaf-page">
          <SalafCardView card={card} onShare={() => setSharing(true)} onCards={() => setCards(true)} />
          <SalafShareSheet open={sharing} onClose={() => setSharing(false)} card={card} day={day} />
          <CardsSheet open={cards} onClose={() => setCards(false)} deck={deck} />
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
