// Quick-access buttons in «يومك» (add-on 0072-add13 §3): the stored order made whole, the moves, the switch, Talal's
// emoji and «ﷲ» for the Names, every button's route a route of the app, and the strings in the ten languages. The
// page tests are web/e2e/v2-0072-shortcuts.spec.ts.
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  ALLAH_MARK,
  isDefaultOrder,
  moveItem,
  normalizeOrder,
  SHORTCUT_EMOJI,
  SHORTCUT_IDS,
  SHORTCUT_PATHS,
  shortcutPlace,
  shortcutStyle,
} from '../../web/src/v2/daily/shortcuts/model'
import { SHORTCUTS } from '../../web/src/v2/daily/shortcuts/strings-shortcuts'
import { parseRoute } from '../../web/src/quran/route'

const LANGS = ['ar', 'en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi'] as const
const WEB = path.resolve(import.meta.dirname, '../../web')

describe('the order', () => {
  it('a missing or broken store gives the default order', () => {
    expect(normalizeOrder(null)).toEqual([...SHORTCUT_IDS])
    expect(normalizeOrder('x')).toEqual([...SHORTCUT_IDS])
    expect(normalizeOrder({})).toEqual([...SHORTCUT_IDS])
  })
  it('drops unknown and repeated ids and keeps the stored order', () => {
    const stored = ['ask', 'quran', 'nope', 'ask', ...SHORTCUT_IDS]
    const out = normalizeOrder(stored)
    expect(out.slice(0, 2)).toEqual(['ask', 'quran'])
    expect(out).toHaveLength(SHORTCUT_IDS.length)
    expect(new Set(out).size).toBe(SHORTCUT_IDS.length)
  })
  it('a button missing from the store comes back after its default neighbour', () => {
    const stored = SHORTCUT_IDS.filter((x) => x !== 'qibla').reverse()
    const out = normalizeOrder(stored)
    expect(out.indexOf('qibla')).toBe(out.indexOf('quran') + 1)
    // the first default button, missing, goes first
    expect(normalizeOrder(SHORTCUT_IDS.slice(1))[0]).toBe('prayerLesson')
  })
  it('keeps only the buttons this build has', () => {
    const all = SHORTCUT_IDS.filter((x) => x !== 'wuduLesson')
    expect(normalizeOrder([...SHORTCUT_IDS], all)).toEqual(all)
    expect(isDefaultOrder(all, all)).toBe(true)
  })
  it('moves an item, clamped at both ends', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd'])
    expect(moveItem(['a', 'b', 'c', 'd'], 3, 0)).toEqual(['d', 'a', 'b', 'c'])
    expect(moveItem(['a', 'b', 'c'], 1, 99)).toEqual(['a', 'c', 'b'])
    expect(moveItem(['a', 'b', 'c'], 1, -5)).toEqual(['b', 'a', 'c'])
    expect(moveItem(['a', 'b'], 7, 0)).toEqual(['a', 'b'])
  })
})

describe('the switch', () => {
  it('off unless asked; the address over the build', () => {
    expect(shortcutStyle('')).toBe('off')
    expect(shortcutStyle('', 'line')).toBe('line')
    expect(shortcutStyle('?shortcuts=emoji', 'line')).toBe('emoji')
    expect(shortcutStyle('?shortcuts=off', 'emoji')).toBe('off')
    expect(shortcutStyle('?shortcuts=bogus', 'nope')).toBe('off')
    expect(shortcutPlace('')).toBe('cards')
    expect(shortcutPlace('?shortcutsAt=times')).toBe('times')
    expect(shortcutPlace('', 'times')).toBe('times')
  })
})

describe('the buttons', () => {
  it('Talal’s emoji, and «ﷲ» for the Names of Allah, never an emoji', () => {
    expect(SHORTCUT_EMOJI).toMatchObject({
      prayerLesson: '🕌',
      wuduLesson: '💧',
      tasbih: '📿',
      adhkar: '🤲',
      quran: '📖',
      qibla: '🧭',
      times: '🕰️',
      calendar: '📅',
      ask: '💬',
    })
    expect('names' in SHORTCUT_EMOJI).toBe(false)
    expect(ALLAH_MARK).toBe('ﷲ')
    for (const id of SHORTCUT_IDS) if (id !== 'names') expect(SHORTCUT_EMOJI[id as Exclude<typeof id, 'names'>]).toBeTruthy()
  })
  it('every route opens a page of the app, not the conversation', () => {
    for (const id of SHORTCUT_IDS) {
      const p = SHORTCUT_PATHS[id]
      if (id === 'ask') {
        expect(p).toBeNull()
        continue
      }
      expect(p, id).toMatch(/^\//)
      expect(parseRoute(p!).view, id).not.toBe('chat')
    }
  })
  it('the lessons’ routes are the lessons in the app', () => {
    for (const l of ['prayer', 'wudu']) expect(fs.existsSync(path.join(WEB, `src/lessons/${l}/meta.ts`))).toBe(true)
  })
})

describe('the strings', () => {
  const keys = Object.keys(SHORTCUTS.en)
  it.each(LANGS)('%s has every string, with the same placeholders', (l) => {
    const s = SHORTCUTS[l] as Record<string, string>
    for (const k of keys) {
      expect(s[k], `${l}.${k}`).toBeTruthy()
      const vars = (x: string) => (x.match(/\{\w+\}/g) ?? []).sort().join()
      expect(vars(s[k]), `${l}.${k}`).toBe(vars((SHORTCUTS.en as Record<string, string>)[k]))
    }
  })
  it('no Latin letters in the right-to-left and Indic languages; no exclamation marks', () => {
    for (const l of ['ar', 'ur', 'bn', 'hi'] as const)
      for (const v of Object.values(SHORTCUTS[l])) expect(v.replace(/\{\w+\}/g, ''), `${l}: ${v}`).not.toMatch(/[A-Za-z]/)
    for (const l of LANGS) for (const v of Object.values(SHORTCUTS[l])) expect(v).not.toMatch(/[!！]/)
  })
  it('the i18n check reads this module', () => {
    const src = fs.readFileSync(path.resolve(WEB, '../scripts/i18n-check.mjs'), 'utf8')
    expect(src).toContain("'v2/daily/shortcuts/strings-shortcuts.ts', 'SHORTCUTS'")
  })
})

describe('the page', () => {
  const css = fs.readFileSync(path.join(WEB, 'src/v2/daily/shortcuts/shortcuts.css'), 'utf8')
  it('44 px targets', () => {
    for (const sel of ['.sc-arrange', '.sc-handle', '.sc-ic']) expect(css).toMatch(new RegExp(`${sel.replace('.', '\\.')}[^{]*\\{[^}]*(min-height|height): 44px`))
    expect(css).toMatch(/\.sc-tile \{[^}]*min-height: 92px/)
  })
  it('the drag handle takes the finger (no page scroll under it)', () => {
    expect(css).toMatch(/\.sc-handle \{[^}]*touch-action: none/)
  })
  it('off by default: the grid of eight stays until Talal chooses', () => {
    const slots = fs.readFileSync(path.join(WEB, 'src/v2/daily/HomeSlots.tsx'), 'utf8')
    expect(slots).toContain("shortcutsLook() === 'off' ? <TodayTools /> : <MawaqifCard />")
  })
})
