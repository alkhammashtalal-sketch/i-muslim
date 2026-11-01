// Swipes on an element turn its pages in both directions (add-on 0072-add54; ./swipe.js says how).
import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react'
import { attachSwipe } from './swipe.js'

const isRtl = () => document.documentElement.dir === 'rtl'

/** `turn(+1)` the next page, `turn(-1)` the previous one; the latest `turn` is used, so it may change each render. */
export function useSwipe<T extends Element>(ref: RefObject<T | null>, turn: (k: 1 | -1) => void, on = true) {
  const latest = useRef(turn)
  useLayoutEffect(() => {
    latest.current = turn
  })
  useEffect(() => {
    const el = ref.current
    if (!el || !on) return
    return attachSwipe(el, (k) => latest.current(k), isRtl)
  }, [ref, on])
}
