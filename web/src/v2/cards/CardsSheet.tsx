// «اصنع كروت» (add-on 0072-add30 §1): the button under a text and the builder sheet it opens. Before saving, the person
// keeps or leaves out each section and moves it up or down, picks the size (an Instagram post 3:4, a story or snap
// 9:16, a square) and the style (lapis, night, ivory), sees every card, then «احفظ الكل» (Photos) or «شارك» (the
// system sheet with all the cards at once). Made on the device by code (./model.ts, ./draw.ts): no network, no model.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Sheet } from '../../components/Sheet'
import { useI18n } from '../../i18n'
import { isNative } from '../../native/platform'
import { deviceStorage } from '../../storage/device'
import { saveImages, shareImages } from '../../native/photos'
import { storeMark, APP_NAME_ON_IMAGE } from '../reading/store-mark'
import { IcDownload, IcShare } from '../reading/icons'
import { Tabs, useToast } from '../reading/ui'
import { defaultChoice, MAX_CARDS, sectionFits, STYLES, type Deck, type Shape, type Style } from './model'
import { drawCards, drawCover, layoutFor, loadFonts, measureFor, toPng } from './draw'
import { cardsStrings, countLine, fill } from './strings'
import './cards.css'

/** The app's name on the cards' foot, per interface language (CLAUDE.md §8: «مسلم», never the letter i), as the share
 *  images write it (../reading/store-mark.ts). */
export const appNameOn = (lang: string) => APP_NAME_ON_IMAGE[lang as keyof typeof APP_NAME_ON_IMAGE] ?? APP_NAME_ON_IMAGE.ar

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

/** The last design chosen, kept with the person's other choices (storage/device.ts; without it, «المخطوطة»). */
const STYLE_KEY = 'muslim.cards.style.v1'
function savedStyle(): Style {
  try {
    const v = deviceStorage.getItem(STYLE_KEY)
    return STYLES.includes(v as Style) ? (v as Style) : 'manuscript'
  } catch {
    return 'manuscript'
  }
}
function saveStyle(v: Style) {
  try {
    deviceStorage.setItem(STYLE_KEY, v)
  } catch {
    // storage blocked: the choice holds while the sheet is open
  }
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
  const [style, setStyleState] = useState<Style>(savedStyle)
  const setStyle = (v: Style) => {
    setStyleState(v)
    saveStyle(v)
  }
  const now = useRef({ shape, style })
  now.current = { shape, style }
  const [covers, setCovers] = useState<{ deck: Deck; shape: Shape; urls: Record<Style, string> } | null>(null)
  const [preview, setPreview] = useState<{ key: string; urls: string[]; scale: string[]; single: string[]; fits: string[] } | null>(null)
  const [busy, setBusy] = useState(false)
  // No measure before the faces are loaded: a measure in a fallback face lays the cards out wrong.
  const [fontsFor, setFontsFor] = useState<Deck | null>(null)
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
      setFontsFor(d)
      setTouched(false)
      setOrder(d.sections.map((x) => x.id))
      // At the size and design now chosen (the sheet keeps them from one set to the next).
      setKept(new Set(defaultChoice(d.sections, measureFor(d, now.current.shape, now.current.style))))
    })
    return () => {
      alive = false
    }
  }, [open, given])

  // Until the person keeps or leaves out a section, the sections kept are the first ones that fit 20 cards at the size
  // and the design now chosen: another size or design keeps the set within one post.
  const [touched, setTouched] = useState(false)
  useEffect(() => {
    if (!deck || fontsFor !== deck || touched) return
    const m = measureFor(deck, shape, style)
    setKept(new Set(defaultChoice(order.map((id) => deck.sections.find((x) => x.id === id)!).filter(Boolean), m)))
  }, [deck, fontsFor, touched, shape, style, order])

  // The sections no card holds at this size and design (a text too long even drawn smaller): left out, with a line.
  const unfit = useMemo(() => {
    if (!deck || fontsFor !== deck) return new Set<string>()
    const m = measureFor(deck, shape, style)
    return new Set(deck.sections.filter((x) => !sectionFits(x, m)).map((x) => x.id))
  }, [deck, fontsFor, shape, style])
  const chosen = useMemo(() => (deck ? order.map((id) => deck.sections.find((x) => x.id === id)!).filter((x) => x && kept.has(x.id) && !unfit.has(x.id)) : []), [deck, order, kept, unfit])
  const pages = useMemo(() => (deck && fontsFor === deck && chosen.length ? layoutFor(deck, shape, chosen, style) : []), [deck, fontsFor, shape, chosen, style])
  const over = pages.length > MAX_CARDS
  const opts = useMemo(
    () => (deck ? { deck, shape, style, pages, corner: s.of, appName: appNameOn(lang), storeLine: storeMark(lang).line, storeUrl: storeMark(lang).url, scanHint: s.scanHint } : null),
    [deck, shape, style, pages, s.of, s.scanHint, lang],
  )
  const key = `${shape}|${style}|${chosen.map((x) => x.id).join(',')}`

  useEffect(() => {
    if (!open || !opts || !pages.length) return
    let alive = true
    void drawCards(opts, PREVIEW).then((cs) => alive && setPreview({ key, urls: cs.map((c) => c.toDataURL('image/png')), scale: cs.map((c) => c.dataset.scale ?? '1'), single: cs.map((c) => c.dataset.single ?? 'false'), fits: cs.map((c) => c.dataset.fits ?? 'false') }))
    return () => {
      alive = false
    }
  }, [open, opts, pages.length, key])

  // Each design's cover, small, for its choice (the set's own cover at the size chosen).
  useEffect(() => {
    if (!open || !deck || fontsFor !== deck) return
    let alive = true
    const base = { deck, shape, corner: s.of, appName: appNameOn(lang), storeLine: storeMark(lang).line, storeUrl: storeMark(lang).url, scanHint: s.scanHint }
    void Promise.all(STYLES.map((st) => drawCover({ ...base, style: st, pages: pages.length ? pages : undefined }, 0.16))).then((cs) => {
      if (alive) setCovers({ deck, shape, urls: Object.fromEntries(STYLES.map((st, k) => [st, cs[k].toDataURL('image/png')])) as Record<Style, string> })
    })
    return () => {
      alive = false
    }
  }, [open, deck, fontsFor, shape, pages, s.of, s.scanHint, lang])

  const files = async () => {
    const cs = await drawCards(opts!, 1)
    const blobs = await Promise.all(cs.map(toPng))
    // Two digits (20 cards at most): the files sort in the set's order.
    return blobs.map((blob, i) => ({ blob, name: `${deck!.fileBase}-${shape}-${style}-${String(i + 1).padStart(2, '0')}.png` }))
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
  const toggle = (id: string) => {
    setTouched(true)
    setKept((k) => {
      const n = new Set(k)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  const shown = preview?.key === key ? preview.urls : null
  // «السابق» and «التالي» under the strip (add-on 0072-add54): the card in the middle of the strip is the one shown;
  // the buttons bring the one before or after it to the middle, and the strip still scrolls by the finger.
  const strip = useRef<HTMLDivElement>(null)
  const [at, setAt] = useState(0)
  // The card a button asked for, while the strip glides to it: the cards it passes on the way are not «shown».
  const asked = useRef<number | null>(null)
  const total = shown ? shown.length : pages.length
  const cur = Math.max(0, Math.min(at, total - 1))
  const nf = new Intl.NumberFormat(lang === 'ar' ? 'ar-u-nu-arab' : lang)
  const onStripScroll = () => {
    const el = strip.current
    if (!el) return
    const box = el.getBoundingClientRect()
    const mid = box.left + box.width / 2
    let best = 0
    let gap = Infinity
    Array.from(el.children).forEach((c, i) => {
      const r = c.getBoundingClientRect()
      const d = Math.abs(r.left + r.width / 2 - mid)
      if (d < gap) [gap, best] = [d, i]
    })
    if (asked.current != null && best !== asked.current) return
    asked.current = null
    setAt(best)
  }
  const turnTo = (i: number) => {
    const to = Math.max(0, Math.min(i, total - 1))
    const c = strip.current?.children[to] as HTMLElement | undefined
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    asked.current = c ? to : null
    c?.scrollIntoView({ behavior: still ? 'auto' : 'smooth', inline: 'center', block: 'nearest' })
    setAt(to)
    // The glide is over by then, or there was none (the last card cannot come to the middle).
    window.setTimeout(() => {
      if (asked.current === to) asked.current = null
    }, 800)
  }
  // The finger takes the strip again: what it shows is what counts.
  const onStripTouch = () => (asked.current = null)
  const turnLabel = (b: string, to: number) => fill(s.navCard, { b, card: fill(s.cardAlt, { i: nf.format(to + 1), n: nf.format(total) }) })
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
        <div ref={strip} onScroll={onStripScroll} onTouchStart={onStripTouch} onWheel={onStripTouch} className="cd-strip" role="list" data-testid="cards-preview" data-count={pages.length} data-shape={shape} data-style={style} data-ready={shown ? 'true' : 'false'}>
          {shown
            ? shown.map((u, i) => (
                <img key={i} role="listitem" className="cd-thumb" src={u} alt={fill(s.cardAlt, { i: i + 1, n: shown.length })} data-shape={shape} data-scale={preview!.scale[i]} data-single={preview!.single[i]} data-fits={preview!.fits[i]} />
              ))
            : pages.map((_, i) => <span key={i} role="listitem" className="cd-thumb is-wait" data-shape={shape} />)}
        </div>
        {total > 1 && (
          <div className="cd-pager" data-testid="cards-pager" data-at={cur}>
            <button type="button" className="cd-turn" onClick={() => turnTo(cur - 1)} disabled={cur === 0} aria-label={turnLabel(s.prev, cur - 1)} data-testid="cards-prev">
              <Chevron back />
              <span>{s.prev}</span>
            </button>
            {total <= 12 && (
              <span className="cd-dots" aria-hidden="true">
                {Array.from({ length: total }, (_, i) => (
                  <i key={i} className={i === cur ? 'on' : undefined} />
                ))}
              </span>
            )}
            <button type="button" className="cd-turn" onClick={() => turnTo(cur + 1)} disabled={cur === total - 1} aria-label={turnLabel(s.next, cur + 1)} data-testid="cards-next">
              <span>{s.next}</span>
              <Chevron />
            </button>
          </div>
        )}
        <p className="cd-count" role="status" data-testid="cards-count">
          {chosen.length ? countLine(lang, pages.length, new Intl.NumberFormat(lang === 'ar' ? 'ar-u-nu-arab' : lang).format(pages.length)) : s.none}
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
                <li key={id} className="cd-row" data-section={id} data-fits={unfit.has(id) ? 'false' : 'true'}>
                  <label>
                    <input type="checkbox" checked={kept.has(id) && !unfit.has(id)} disabled={unfit.has(id)} onChange={() => toggle(id)} aria-describedby={unfit.has(id) ? `${id}-long` : undefined} />
                    <span>
                      {sec.label}
                      {unfit.has(id) && (
                        <span className="cd-long" id={`${id}-long`}>
                          {s.tooLong}
                        </span>
                      )}
                    </span>
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
          <div className="cd-styles" role="radiogroup" aria-label={s.style} data-testid="cards-styles">
            {STYLES.map((st) => (
              <button key={st} type="button" role="radio" aria-checked={style === st} className="cd-style" data-style={st} onClick={() => setStyle(st)}>
                {covers?.deck === deck && covers.shape === shape ? <img src={covers.urls[st]} alt="" data-shape={shape} /> : <span className="cd-style-wait" data-shape={shape} />}
                <span>{s[st]}</span>
              </button>
            ))}
          </div>
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

/** «السابق»'s arrow points to the reading's start (the right in Arabic), «التالي»'s to its end; mirrored in LTR (cards.css). */
const Chevron = ({ back }: { back?: boolean }) => (
  <svg className="cd-chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d={back ? 'm9.5 6 6 6-6 6' : 'm14.5 6-6 6 6 6'} />
  </svg>
)

const Arrow = ({ up }: { up?: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d={up ? 'm6 14.5 6-6 6 6' : 'm6 9.5 6 6 6-6'} />
  </svg>
)
