// The iOS simulator's approval shots of the date card's sky (add-on 0071-add16), in TEST builds only: built in when
// VITE_SKY_TEST=1 (never set for the store or the web; main.tsx imports this file behind that switch, so other builds
// do not contain it). Before the first paint it reads /sky-test.json, which web/scripts/sky-sim-shots.sh writes into
// the installed app's own folder for each shot, and then:
//   - saves the place, the interface language and «welcomed», as a user who chose them would have;
//   - moves the page's clock to the shot's moment (Date and Date.now shifted by a fixed offset, so time still runs,
//     as Playwright's clock does in the browser tests), so the next-prayer line, the date and the sky agree;
//   - with `before`, draws no sky (the card's layers and the page's time sky off): the board's «before».
import { deviceStorage } from './storage/device'
type SkyTest = { at: string; lang?: string; place?: unknown; textScale?: string; before?: boolean }

export async function applySkyTest() {
  let t: SkyTest
  try {
    const r = await fetch('/sky-test.json', { cache: 'no-store' })
    if (!r.ok) return
    t = (await r.json()) as SkyTest
  } catch {
    return
  }
  try {
    deviceStorage.setItem('muslim.welcome.v1', '1')
    if (t.place) deviceStorage.setItem('muslim.place.v1', JSON.stringify(t.place))
    if (t.lang) deviceStorage.setItem('imuslim.settings.v1', JSON.stringify({ lang: t.lang, content: t.lang, fontSize: 'md', simple: false }))
  } catch {
    // no storage: the shot shows the first run
  }
  if (t.textScale) document.documentElement.style.setProperty('font-size', t.textScale)
  if (t.before) {
    const off = document.createElement('style')
    off.textContent = '.sky-l { display: none !important; } :root[data-sky] .v2-sky:not(.is-short) { background: var(--sky) !important; }'
    document.head.append(off)
  }
  const at = new Date(t.at).getTime()
  if (!Number.isFinite(at)) return
  const Real = Date
  const offset = at - Real.now()
  class Shifted extends Real {
    constructor(...a: unknown[]) {
      if (a.length) super(...(a as [number]))
      else super(Real.now() + offset)
    }
    static now() {
      return Real.now() + offset
    }
  }
  globalThis.Date = Shifted as DateConstructor
}
