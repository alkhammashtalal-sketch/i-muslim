// «من أقوال السلف» on the home page, under «يومك» after «اسم من أسماء الله» (reply 0072 item 11; add-on 0072-add4),
// in the look Talal approved (relay/w1/0072-salaf/review.html): the topic in two words, the saying in the text face
// and the page's text ink (the narrator's gloss lighter), «قال فلان» or «يُروى عن فلان» as the review decided, then
// the book with its author, its volume and page (add-on 0072-add7 §3.4: «الزهد» للإمام أحمد بن حنبل، ج…، ص…), and
// the Shamela page, which opens outside the app. Every word of the card is from
// data/salaf-daily.json: no text without its source, no model's text, no translation. Arabic interface only: in any
// other the card renders nothing (§5 أ). One date per visit of the page, as the other day cards.
// Add-on 0072-add10 §3: «شارك» under it opens the saying as an image (SalafShare.tsx).
import { useMemo, useState } from 'react'
import { useI18n } from '../../../i18n'
import { IcShare } from '../../reading/icons'
import { salafAttribution, salafDay, salafOfDay, salafParts, salafShown, salafSource, type SalafCard as Card } from './salaf-model'
import { SalafShareSheet } from './SalafShare'
import { CardsSheet, MakeCardsButton } from '../../cards/CardsSheet'
import { salafDeck } from '../../cards/decks'
import './salaf.css'

const TITLE = 'من أقوال السلف'
const SHAMELA = 'المكتبة الشاملة'
const SHARE = 'شارك'

/** The card itself, for the home page and for the widget's share link (SalafPage.tsx). */
export function SalafCardView({ card, onShare, onCards }: { card: Card; onShare?: () => void; onCards?: () => void }) {
  return (
    <section className="sl-card" aria-labelledby="sl-title" data-testid="salaf-day" data-n={card.n} lang="ar" dir="rtl">
      <h2 id="sl-title" className="sl-title">
        {TITLE}
      </h2>
      <h3 className="sl-topic">{card.topic}</h3>
      <blockquote className="sl-quote" cite={card.url}>
        <p className="sl-text">
          {salafParts(card).map((p, i) =>
            p.gloss ? (
              <span key={i} className="sl-gloss">
                {p.text}
              </span>
            ) : (
              p.text
            ),
          )}
        </p>
      </blockquote>
      <p className="sl-sayer">{salafAttribution(card)}</p>
      <p className="sl-ref">
        <span className="sl-source">{salafSource(card)}</span>
        <span aria-hidden="true"> · </span>
        <a className="sl-link" href={card.url} target="_blank" rel="noopener noreferrer">
          {SHAMELA}
        </a>
      </p>
      {onShare && (
        <p className="sl-share">
          <button type="button" className="sl-share-btn" onClick={onShare} aria-haspopup="dialog" data-testid="salaf-share">
            <IcShare size={17} />
            {SHARE}
          </button>
          {/* «اصنع كروت» (add-on 0072-add30 §1). */}
          {onCards && <MakeCardsButton className="sl-share-btn" onClick={onCards} testId="salaf-cards" />}
        </p>
      )}
    </section>
  )
}

export function SalafCard() {
  const { lang } = useI18n()
  const [card] = useState(() => salafOfDay())
  const [day] = useState(() => salafDay())
  const [sharing, setSharing] = useState(false)
  const [cards, setCards] = useState(false)
  const deck = useMemo(() => (cards && card ? salafDeck(card, lang, TITLE) : null), [cards, card, lang])
  if (!salafShown(lang) || !card) return null
  return (
    <>
      <SalafCardView card={card} onShare={() => setSharing(true)} onCards={() => setCards(true)} />
      <SalafShareSheet open={sharing} onClose={() => setSharing(false)} card={card} day={day} />
      <CardsSheet open={cards} onClose={() => setCards(false)} deck={deck} />
    </>
  )
}
