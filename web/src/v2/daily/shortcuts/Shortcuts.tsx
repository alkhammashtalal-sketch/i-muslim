// Quick-access buttons in «يومك» (add-on 0072-add13 §3): one grid of the app's pages, in the order the reader keeps on
// this device. «ترتيب» turns the grid into a list: each row is dragged by its handle (pointer or touch), or moved with
// its two arrow buttons, or with the arrow keys on its handle; the new place is announced to screen readers.
// Two looks for Talal's choice (model.ts): (a) the emoji he named, (b) gold line drawings; the Names of Allah are
// «ﷲ» in gold in both. Off until he chooses: the «يومك» grid of eight stays (HomeSlots.tsx).
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react'
import type { Lang } from '../../../../../shared/api'
import { useI18n } from '../../../i18n'
import { LESSONS, hasLesson } from '../../../lessons/registry'
import { openMosqueSearch } from '../../../native/android/maps'
import { ANDROID } from '../../../native/android/strings'
import { isAndroid } from '../../../native/platform'
import { navigate } from '../../../quran/route'
import { fill } from '../format'
import { openToday } from '../Screen'
import { TODAY } from '../strings-today'
import { IcDown, IcGrip, IcUp, ShortcutMark } from './icons'
import {
  isDefaultOrder,
  loadOrder,
  moveItem,
  saveOrder,
  SHORTCUT_IDS,
  SHORTCUT_PATHS,
  shortcutPlace,
  shortcutStyle,
  type ShortcutId,
  type ShortcutPlace,
} from './model'
import { SHORTCUTS } from './strings-shortcuts'
import './shortcuts.css'
import { focusAsk } from '../../home/focus-ask'

const env = import.meta.env as Record<string, string | undefined>
/** The look in force now (the address's ?shortcuts= over the build's VITE_SHORTCUTS). */
export const shortcutsLook = () => shortcutStyle(location.search, env.VITE_SHORTCUTS)

export function shortcutLabel(id: ShortcutId, lang: Lang): string {
  const tools = TODAY[lang].tools
  const s = SHORTCUTS[lang]
  switch (id) {
    case 'prayerLesson':
      return LESSONS.prayer?.title[lang] ?? ''
    case 'wuduLesson':
      return s.wuduLesson
    case 'quran':
      return s.quran
    case 'ask':
      return s.ask
    default:
      return tools[id]
  }
}

/** The buttons this build has: a lesson only once its folder is merged (lessons/registry.ts). */
const available = (): ShortcutId[] =>
  SHORTCUT_IDS.filter((id) => (id === 'prayerLesson' ? hasLesson('prayer') : id === 'wuduLesson' ? hasLesson('wudu') : true))


/** The grid in its place: under the next-prayer line («times», App.tsx) or above the day's cards («cards», Home.tsx). */
export function ShortcutsSlot({ at }: { at: ShortcutPlace }) {
  const look = shortcutsLook()
  if (look === 'off' || shortcutPlace(location.search, env.VITE_SHORTCUTS_AT) !== at) return null
  return <Shortcuts look={look} at={at} />
}

function Shortcuts({ look, at }: { look: 'emoji' | 'line'; at: ShortcutPlace }) {
  const { lang } = useI18n()
  const s = SHORTCUTS[lang]
  const [all] = useState(available)
  const [order, setOrder] = useState(() => loadOrder(all))
  const [arranging, setArranging] = useState(false)
  const [say, setSay] = useState('')
  const [dragId, setDragId] = useState<ShortcutId | null>(null)
  const listRef = useRef<HTMLOListElement>(null)
  const drag = useRef<{ id: ShortcutId; grabY: number; y: number; dy: number; raf: number; up: () => void } | null>(null)
  const orderRef = useRef(order)
  useLayoutEffect(() => {
    orderRef.current = order
  }, [order])

  useEffect(() => {
    if (!dragId) saveOrder(order, all)
  }, [order, dragId, all])

  const announce = (id: ShortcutId, list: readonly ShortcutId[]) =>
    setSay(fill(s.position, { name: shortcutLabel(id, lang), n: list.indexOf(id) + 1, total: list.length }))

  const moveBy = (id: ShortcutId, by: number) => {
    const from = orderRef.current.indexOf(id)
    const to = Math.max(0, Math.min(orderRef.current.length - 1, from + by))
    if (to === from) return orderRef.current
    const next = moveItem(orderRef.current, from, to)
    orderRef.current = next
    setOrder(next)
    return next
  }

  // ---- the arrows
  const onArrow = (id: ShortcutId, by: number) => {
    const next = moveBy(id, by)
    announce(id, next)
    // At an end its own arrow is disabled and would drop the focus: hand it to the other arrow of the same row.
    const at = next.indexOf(id)
    if (at === 0 || at === next.length - 1)
      requestAnimationFrame(() => {
        const row = listRef.current?.querySelector<HTMLElement>(`[data-id="${id}"]`)
        const btn = row?.querySelector<HTMLButtonElement>(at === 0 ? '.sc-later' : '.sc-earlier')
        if (btn && !btn.disabled && document.activeElement !== row?.querySelector('.sc-handle')) btn.focus()
      })
  }
  const onHandleKey = (id: ShortcutId) => (e: KeyboardEvent) => {
    const by = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : e.key === 'Home' ? -99 : e.key === 'End' ? 99 : 0
    if (!by) return
    e.preventDefault()
    announce(id, moveBy(id, by))
  }

  // ---- the drag: the row follows the finger; it takes the place of the row whose middle it passes.
  const rowOf = (id: ShortcutId) => listRef.current?.querySelector<HTMLElement>(`[data-id="${id}"]`) ?? null
  const place = () => {
    const d = drag.current
    const me = d && rowOf(d.id)
    if (!d || !me) return
    const others = [...(listRef.current?.querySelectorAll<HTMLElement>('.sc-row') ?? [])].filter((r) => r !== me)
    const target = others.filter((r) => {
      const b = r.getBoundingClientRect()
      return (b.top + b.bottom) / 2 < d.y
    }).length
    const cur = orderRef.current.indexOf(d.id)
    if (target !== cur) {
      const next = moveItem(orderRef.current, cur, target)
      orderRef.current = next
      setOrder(next)
      return // the layout effect sets the offset once the row is in its new place
    }
    offset()
  }
  const offset = () => {
    const d = drag.current
    const me = d && rowOf(d.id)
    if (!d || !me) return
    const natural = me.getBoundingClientRect().top - d.dy
    d.dy = d.y - d.grabY - natural
    me.style.transform = `translateY(${d.dy}px)`
  }
  useLayoutEffect(() => {
    if (drag.current) offset()
  }, [order])

  const scroller = () => (listRef.current?.closest('.scroll') as HTMLElement | null) ?? (document.scrollingElement as HTMLElement | null)
  const autoScroll = () => {
    const d = drag.current
    const sc = scroller()
    if (!d || !sc) return
    const box = sc === document.scrollingElement ? { top: 0, bottom: innerHeight } : sc.getBoundingClientRect()
    // the bottom bar (v2-nav) covers the foot of the home page
    const step = d.y < box.top + 64 ? -8 : d.y > Math.min(box.bottom, innerHeight - 112) - 24 ? 8 : 0
    if (step) {
      const before = sc.scrollTop
      sc.scrollTop += step
      if (sc.scrollTop !== before) place()
    }
    d.raf = requestAnimationFrame(autoScroll)
  }

  // Window listeners, not pointer capture: React moves the rows' nodes as the order changes, which would drop a capture.
  // The handle has touch-action: none, so a finger on it drags and does not scroll the page.
  const onDown = (id: ShortcutId) => (e: PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 || drag.current) return
    const me = rowOf(id)
    if (!me) return
    e.preventDefault()
    const move = (ev: globalThis.PointerEvent) => {
      if (!drag.current) return
      ev.preventDefault()
      drag.current.y = ev.clientY
      place()
    }
    const up = () => {
      const d = drag.current
      if (!d) return
      cancelAnimationFrame(d.raf)
      removeEventListener('pointermove', move)
      removeEventListener('pointerup', up)
      removeEventListener('pointercancel', up)
      const row = rowOf(d.id)
      if (row) row.style.transform = ''
      drag.current = null
      setDragId(null)
      announce(d.id, orderRef.current)
    }
    drag.current = { id, grabY: e.clientY - me.getBoundingClientRect().top, y: e.clientY, dy: 0, raf: 0, up }
    setDragId(id)
    addEventListener('pointermove', move, { passive: false })
    addEventListener('pointerup', up)
    addEventListener('pointercancel', up)
    drag.current.raf = requestAnimationFrame(autoScroll)
  }
  useEffect(() => () => drag.current?.up(), [])

  const reset = () => {
    setOrder(all.slice())
    setSay(s.resetDone)
  }

  const open = (id: ShortcutId) => (e: MouseEvent) => {
    e.preventDefault()
    if (id === 'ask') return void focusAsk()
    // Android: «المساجد» opens Google Maps, our server is not asked (add-on 0067-add1, native/android/maps.ts).
    if (id === 'mosques' && isAndroid()) return void openMosqueSearch(lang)
    const path = SHORTCUT_PATHS[id]!
    if (id === 'quran') navigate(path)
    else openToday(path)
  }

  const t = TODAY[lang]
  return (
    <section className={`dt-today sc-shortcuts is-${look} at-${at}`} aria-labelledby="sc-h" data-testid="shortcuts" data-look={look}>
      <div className="sc-head">
        <h2 id="sc-h">{t.todayTitle}</h2>
        <button type="button" className="sc-arrange" onClick={() => setArranging((a) => !a)} aria-controls="sc-body" data-testid="shortcuts-arrange">
          {arranging ? s.done : s.arrange}
        </button>
      </div>
      <div id="sc-body">
        {!arranging ? (
          <div className="sc-grid">
            {order.map((id) => {
              const label = shortcutLabel(id, lang)
              const maps = id === 'mosques' && isAndroid()
              const inner = (
                <>
                  <span className="sc-ic" aria-hidden="true">
                    <ShortcutMark id={id} look={look} />
                  </span>
                  <span className="sc-label">{label}</span>
                  {maps && <span className="dt-tool-note">{ANDROID[lang].mapsNote}</span>}
                </>
              )
              return id === 'ask' ? (
                <button key={id} type="button" className="sc-tile" data-id={id} onClick={open(id)}>
                  {inner}
                </button>
              ) : (
                <a key={id} href={SHORTCUT_PATHS[id]!} className="sc-tile" data-id={id} onClick={open(id)} data-testid={maps ? 'android-mosques' : undefined}>
                  {inner}
                </a>
              )
            })}
          </div>
        ) : (
          <div className="sc-arranging">
            <p className="sc-hint">{s.arrangeHint}</p>
            <ol className="sc-list" ref={listRef}>
              {order.map((id, i) => {
                const name = shortcutLabel(id, lang)
                return (
                  <li key={id} className={`sc-row${dragId === id ? ' is-drag' : ''}`} data-id={id}>
                    <button
                      type="button"
                      className="sc-handle"
                      aria-label={fill(s.handle, { name })}
                      onPointerDown={onDown(id)}
                      onKeyDown={onHandleKey(id)}
                    >
                      <IcGrip />
                    </button>
                    <span className="sc-ic" aria-hidden="true">
                      <ShortcutMark id={id} look={look} />
                    </span>
                    <span className="sc-row-label">{name}</span>
                    <button type="button" className="sc-move sc-earlier" aria-label={fill(s.earlier, { name })} disabled={i === 0} onClick={() => onArrow(id, -1)}>
                      <IcUp />
                    </button>
                    <button type="button" className="sc-move sc-later" aria-label={fill(s.later, { name })} disabled={i === order.length - 1} onClick={() => onArrow(id, 1)}>
                      <IcDown />
                    </button>
                  </li>
                )
              })}
            </ol>
            {!isDefaultOrder(order, all) && (
              <button type="button" className="sc-reset" onClick={reset}>
                {s.reset}
              </button>
            )}
          </div>
        )}
      </div>
      <p className="sr-only" aria-live="polite" data-testid="shortcuts-live">
        {say}
      </p>
    </section>
  )
}
