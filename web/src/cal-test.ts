// The iOS simulator's shots of the calendar and «أضف إلى تقويم الجهاز» (reply 0062, reply 0072 item 14), in TEST builds
// only: built in when VITE_CAL_TEST=1 (never set for the store or the web; main.tsx imports this file behind that switch,
// so other builds do not contain it), as sky-test.ts is for the sky. Before the first paint it reads /cal-test.json, which
// web/scripts/cal-sim-shots.sh writes into the installed app's own folder for each shot, then:
//   - saves the interface language, «welcomed» and the user's Hijri offset, as a user who chose them would have;
//   - sets the text size (the phone's Dynamic Type at 135%);
//   - after the page is drawn, plays the shot's steps: a tap on a button found by its selector (and, with `text`, by its
//     visible text), text typed into a field, or a scroll to an element, each waiting for its element up to ten seconds.
// Nothing here reaches the server or the calendar by itself: the steps press the page's own buttons, so the event is
// created by the same code as a person's tap. The simulator's calendar is its own, never Talal's.
import { deviceStorage } from './storage/device'
type Step = { tap: string; text?: string } | { type: string; value: string } | { scroll: string } | { wait: number }
type CalTest = { lang?: string; textScale?: string; offset?: number; steps?: Step[] }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function find(sel: string, text?: string): Promise<HTMLElement | null> {
  for (let i = 0; i < 100; i++) {
    const all = [...document.querySelectorAll<HTMLElement>(sel)]
    const el = text ? all.find((e) => e.textContent?.includes(text)) : all[0]
    if (el) return el
    await sleep(100)
  }
  return null
}

async function play(steps: Step[]) {
  for (const s of steps) {
    if ('wait' in s) await sleep(s.wait)
    else if ('scroll' in s) (await find(s.scroll))?.scrollIntoView({ block: 'center' })
    else if ('tap' in s) (await find(s.tap, s.text))?.click()
    else if ('type' in s) {
      const el = (await find(s.type)) as HTMLInputElement | null
      if (!el) continue
      // React's own setter, so its onChange sees the typed value.
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(el, s.value)
      el.dispatchEvent(new Event('input', { bubbles: true }))
    }
    await sleep(350)
  }
}

export async function applyCalTest() {
  let t: CalTest
  try {
    const r = await fetch('/cal-test.json', { cache: 'no-store' })
    if (!r.ok) return
    t = (await r.json()) as CalTest
  } catch {
    return
  }
  try {
    deviceStorage.setItem('muslim.welcome.v1', '1')
    if (t.lang) deviceStorage.setItem('imuslim.settings.v1', JSON.stringify({ lang: t.lang, content: t.lang, fontSize: 'md', simple: false }))
    if (typeof t.offset === 'number') deviceStorage.setItem('muslim.hijri.offset.v1', String(t.offset))
  } catch {
    // no storage: the shot shows the first run
  }
  if (t.textScale) document.documentElement.style.setProperty('font-size', t.textScale)
  if (t.steps?.length) void sleep(1500).then(() => play(t.steps!))
}
