// The Hijri offset the calendar and the home's date card apply, the user's (settings) and the global one: the same
// date on the share images as on the card and the widgets (add-on 0072-add23 §4.6; the widgets' file takes it in
// native/widget-data.ts since 28a49ed). Shared by the share sheets; open to the cards.
import { useEffect, useState } from 'react'
import { totalOffset } from '../../daily/hijri'
import { loadGlobalOffset, loadHijriOffset } from './store'

export function useHijriOffset(): number {
  const [user] = useState(loadHijriOffset)
  const [global, setGlobal] = useState(0)
  useEffect(() => {
    let alive = true
    loadGlobalOffset().then((n) => alive && setGlobal(n))
    return () => {
      alive = false
    }
  }, [])
  return totalOffset(user, global)
}
