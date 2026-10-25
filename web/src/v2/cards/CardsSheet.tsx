// «اصنع كروت» (add-on 0072-add30 §1): the button under a text and the builder sheet it opens. Before saving, the person
// keeps or leaves out each section and moves it up or down, picks the size (an Instagram post 3:4, a story or snap
// 9:16, a square) and the style (lapis, night, ivory), sees every card, then «احفظ الكل» (Photos) or «شارك» (the
// system sheet with all the cards at once). Made on the device by code (./model.ts, ./draw.ts): no network, no model.
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Sheet } from '../../components/Sheet'
import { useI18n } from '../../i18n'
import { isNative } from '../../native/platform'
import { saveImages, shareImages } from '../../native/photos'
import { APP_STORE_URL } from '../../native/share-text'
import { IcDownload, IcShare } from '../reading/icons'
import { Tabs, useToast } from '../reading/ui'
import { sepOf } from '../daily/arabic-marks'
import { defaultChoice, MAX_CARDS, type Deck, type Shape, type Style } from './model'
import { drawCards, layoutFor, loadFonts, measureFor, toPng } from './draw'
import { cardsStrings, fill } from './strings'
import './cards.css'

/** The app's name on the cards, per interface language (CLAUDE.md §8: «مسلم», never the letter i), and its store. */
const APP_NAME: Record<string, string> = { ar: '«مسلم»', ur: 'مسلم', bn: 'মুসলিম', hi: 'मुस्लिम' }
export const appNameOn = (lang: string) => APP_NAME[lang] ?? 'Muslim'
export const storeLineOf = (lang: string) => `${appNameOn(lang)}${sepOf(lang)}App Store`

/** Two cards one behind the other. */
export const IcCards = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <rect x="7" y="3.5" width="13" height="15" rx="2.2" />
    <path d="M4 7.5v11a2 2 0 0 0 2 2h9" />
  </svg>
)

/** The button under a text: «اصنع كروت». */
export function MakeCardsButton({ onClick, className = 'cd-make', testId = 'make-cards' }: { onClick: () => void; className?: string; testId?: string }) {
  const { lang } = useI18n()
  const s = cardsStrings(lang)
  return (
    <button type="button" className={className} onClick={onClick} aria-haspopup="dialog" data-testid={testId}>
      <IcCards />
      <span>{s.make}</span>
    </button>
  )
}

type Props = {
  open: boolean
  onClose: () => void
  /** The set, or a promise of it (the whole lesson reads each step's texts first); null: nothing to make. */
  deck: Deck | Promise<Deck | null> | null
}

const PREVIEW = 0.3

export function CardsSheet({ open, onClose, deck: given }: Props) {
  const { lang } = useI18n()
  const s = cardsStrings(lang)
  const [deck, setDeck] = useState<Deck | null>(null)
  const [order, setOrder] = useState<string[]>([])
  const [kept, setKept] = useState<Set<string>>(new Set())
  const [shape, setShape] = useState<Shape>('post')
  const [style, setStyle] = useState<Style>('lapis')
  const [preview, setPreview] = useState<{ key: string; urls: string[] } | null>(null)
  const [busy, setBusy] = useState(false)
  const [toast, say] = useToast()

  // The set: when it comes, every section in its order, kept while the set stays within 20 cards.
  useEffect(() => {
    if (!open) return
    let alive = true
    setPreview(null)
    void Promise.resolve(given).then(async (d) => {
      if (!alive) return
      setDeck(d ?? null)
      if (!d) return
      await loadFonts(d) // before any measure
      if (!alive) return
      setOrder(d.sections.map((x) => x.id))
      setKept(new Set(defaultChoice(d.sections, measureFor(d, 'post'))))
    })
    return () => {
      alive = false
    }
  }, [open, given])

  const chosen = useMemo(() => (deck ? order.map((id) => deck.sections.find((x) => x.id === id)!).filter((x) => x && kept.has(x.id)) : []), [deck, order, kept])
  const pages = useMemo(() => (deck && chosen.length ? layoutFor(deck, shape, chosen) : []), [deck, shape, chosen])
  const over = pages.length > MAX_CARDS
  const opts = useMemo(
    () => (deck ? { deck, shape, style, pages, corner: s.of, appName: appNameOn(lang), storeLine: storeLineOf(lang), storeUrl: APP_STORE_URL } : null),
    [deck, shape, style, pages, s.of, lang],
  )
  const key = `${shape}|${style}|${chosen.map((x) => x.id).join(',')}`

  useEffect(() => {
    if (!open || !opts || !pages.length) return
    let alive = true
    void drawCards(opts, PREVIEW).then((cs) => alive && setPreview({ key, urls: cs.map((c) => c.toDataURL('image/png')) }))
    return () => {
      alive = false
    }
  }, [open, opts, pages.length, key])

  const files = async () => {
    const cs = await drawCards(opts!, 1)
    const blobs = await Promise.all(cs.map(toPng))
    const n = String(blobs.length).length
    return blobs.map((blob, i) => ({ blob, name: `${deck!.fileBase}-${shape}-${style}-${String(i + 1).padStart(n, '0')}.png` }))
  }
  const run = async (what: 'save' | 'share') => {
    if (!opts || over || busy) return
    setBusy(true)
    try {
      const f = await files()
      const r = what === 'save' ? await saveImages(f, deck!.title) : await shareImages(f, deck!.title)
      if (r === 'saved') say(s.saved)
      else if (r === 'none' && what === 'share') await saveImages(f, deck!.title)
    } finally {
      setBusy(false)
    }
  }

  const move = (id: string, by: number) =>
    setOrder((o) => {
      const i = o.indexOf(id)
      const j = i + by
      if (i < 0 || j < 0 || j >= o.length) return o
      const n = o.slice()
      ;[n[i], n[j]] = [n[j], n[i]]
      return n
    })
  const toggle = (id: string) =>
    setKept((k) => {
      const n = new Set(k)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  const shown = preview?.key === key ? preview.urls : null
  let body: ReactNode
  if (!deck)
    body = (
      <p className="small" role="status">
        {s.making}
      </p>
    )
  else
    body = (
      <>
        <div className="cd-strip" role="list" data-testid="cards-preview" data-count={pages.length} data-shape={shape} data-style={style} data-ready={shown ? 'true' : 'false'}>
          {shown
            ? shown.map((u, i) => (
                <img key={i} role="listitem" className="cd-thumb" src={u} alt={fill(s.cardAlt, { i: i + 1, n: shown.length })} data-shape={shape} />
              ))
            : pages.map((_, i) => <span key={i} role="listitem" className="cd-thumb is-wait" data-shape={shape} />)}
        </div>
        <p className="cd-count" role="status" data-testid="cards-count">
          {chosen.length ? fill(s.count, { n: new Intl.NumberFormat(lang === 'ar' ? 'ar-u-nu-arab' : lang).format(pages.length) }) : s.none}
        </p>
        {over && (
          <p className="cd-warn" role="alert" data-testid="cards-over">
            {s.tooMany}
          </p>
        )}
        <fieldset className="cd-sections">
          <legend>{s.sections}</legend>
          <ol>
            {order.map((id, i) => {
              const sec = deck.sections.find((x) => x.id === id)!
              return (
                <li key={id} className="cd-row" data-section={id}>
                  <label>
                    <input type="checkbox" checked={kept.has(id)} onChange={() => toggle(id)} />
                    <span>{sec.label}</span>
                  </label>
                  <button type="button" className="cd-move" aria-label={fill(s.moveUp, { name: sec.label })} disabled={i === 0} onClick={() => move(id, -1)}>
                    <Arrow up />
                  </button>
                  <button type="button" className="cd-move" aria-label={fill(s.moveDown, { name: sec.label })} disabled={i === order.length - 1} onClick={() => move(id, 1)}>
                    <Arrow />
                  </button>
                </li>
              )
            })}
          </ol>
        </fieldset>
        <div className="cd-pick">
          <Tabs
            label={s.shape}
            value={shape}
            onChange={setShape}
            options={[
              { value: 'post', label: s.post },
              { value: 'story', label: s.story },
              { value: 'square', label: s.square },
            ]}
          />
          <Tabs
            label={s.style}
            value={style}
            onChange={setStyle}
            options={[
              { value: 'lapis', label: s.lapis },
              { value: 'night', label: s.night },
              { value: 'ivory', label: s.ivory },
            ]}
          />
        </div>
        <div className="rd-share-buttons">
          <button type="button" className="rd-primary" onClick={() => void run('save')} disabled={!pages.length || over || busy} data-testid="cards-save">
            <IcDownload />
            {s.saveAll}
          </button>
          <button type="button" className="rd-secondary" onClick={() => void run('share')} disabled={!pages.length || over || busy} data-testid="cards-share">
            <IcShare />
            {s.share}
          </button>
        </div>
        {isNative() && <p className="rd-status">{s.instagram}</p>}
      </>
    )
  return (
    <Sheet open={open} onClose={onClose} title={s.sheetTitle}>
      <div className="cd-sheet" data-testid="cards-sheet">
        {body}
      </div>
      {toast}
    </Sheet>
  )
}

const Arrow = ({ up }: { up?: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d={up ? 'm6 14.5 6-6 6 6' : 'm6 9.5 6 6 6-6'} />
  </svg>
)

/** The builder's open state with its set, for a screen with one button: [sheet, open(deck)]. */
export function useCards(): [ReactNode, (deck: Deck | Promise<Deck | null> | null) => void] {
  const [deck, setDeck] = useState<Deck | Promise<Deck | null> | null>(null)
  const [open, setOpen] = useState(false)
  return [<CardsSheet key="cards" open={open} onClose={() => setOpen(false)} deck={deck} />, (d) => (setDeck(d), setOpen(true))]
}
