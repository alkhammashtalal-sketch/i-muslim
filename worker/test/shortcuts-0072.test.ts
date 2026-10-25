// Quick-access buttons in «يومك» (add-on 0072-add13 §3): the stored order made whole, the moves, the switch, Talal's
// emoji and «ﷲ» for the Names, every button's route a route of the app, and the strings in the ten languages. The
// page tests are web/e2e/v2-0072-shortcuts.spec.ts.
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { ALLAH_BOX, ALLAH_MASS, ALLAH_PATH } from '../../web/src/v2/daily/shortcuts/allah-mark'
import {
  ALLAH_MARGIN,
  ALLAH_MARK,
  ALLAH_MIN_MARGIN,
  ALLAH_STROKE,
  allahPlacement,
  CALENDAR_EMOJI,
  isDefaultOrder,
  LATIN_EMOJI,
  moveItem,
  normalizeOrder,
  SHORTCUT_EMOJI,
  SHORTCUT_IDS,
  SHORTCUT_PATHS,
  shortcutPlace,
  shortcutStyle,
  SHORTCUTS_LOOK,
  SHORTCUTS_ON,
  SHORTCUTS_PLACE,
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
  it('Talal’s choice is configured (add-on 0072-add15; the place from add-on 0072-add28 §3: under the date card); the buttons follow the one line SHORTCUTS_ON', () => {
    expect(SHORTCUTS_LOOK).toBe('emoji')
    expect(SHORTCUTS_PLACE).toBe('date')
    expect(shortcutStyle('')).toBe(SHORTCUTS_ON ? 'emoji' : 'off')
    expect(fs.readFileSync(path.join(WEB, 'src/v2/daily/shortcuts/model.ts'), 'utf8')).toMatch(/^export const SHORTCUTS_ON: boolean = (true|false)$/m)
    // switched on (the one line SHORTCUTS_ON = true): his look, his place; the address still overrides
    expect(shortcutStyle('', undefined, true)).toBe('emoji')
    expect(shortcutStyle('?shortcuts=off', undefined, true)).toBe('off')
    expect(shortcutStyle('', 'off', true)).toBe('off')
  })
  it('off unless asked (the flag off); the address over the build', () => {
    expect(shortcutStyle('', undefined, false)).toBe('off')
    expect(shortcutStyle('', 'line')).toBe('line')
    expect(shortcutStyle('?shortcuts=emoji', 'line')).toBe('emoji')
    expect(shortcutStyle('?shortcuts=off', 'emoji')).toBe('off')
    expect(shortcutStyle('?shortcuts=bogus', 'nope', false)).toBe('off')
    expect(shortcutPlace('')).toBe('date')
    expect(shortcutPlace('?shortcutsAt=cards')).toBe('cards')
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
      calendar: '🌙',
      ask: '💬',
      mosques: '📍',
      goals: '🎯',
    })
    // 📅 and 🗓️ are drawn with Latin dates («JUL 17», «JUL»): the crescent instead (add-on 0072-add15)
    expect(CALENDAR_EMOJI).toBe('🌙')
    for (const e of Object.values(SHORTCUT_EMOJI)) expect(LATIN_EMOJI as readonly string[], e).not.toContain(e)
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

describe('«ﷲ» in its well (add-on 0072-add15)', () => {
  const at = allahPlacement(ALLAH_BOX, ALLAH_MASS)
  const sides = (b: { left: number; top: number; width: number; height: number }) => [b.left, b.top, 1 - b.left - b.width, 1 - b.top - b.height]
  it('the outline measured from Amiri: taller than wide, its mass low (the bowl), a path of its own', () => {
    expect(ALLAH_BOX.h).toBeGreaterThan(ALLAH_BOX.w)
    expect(ALLAH_MASS.y / ALLAH_BOX.h).toBeGreaterThan(0.6)
    expect(ALLAH_PATH).toMatch(/^M[\d.-]+ [\d.-]+/)
    expect(ALLAH_PATH.match(/Z/g)?.length).toBeGreaterThanOrEqual(5) // the letters, the shadda, the dagger alif
    const gen = fs.readFileSync(path.join(WEB, 'src/v2/daily/shortcuts/allah-mark.ts'), 'utf8')
    expect(gen).toContain('GENERATED by scripts/glyphs/allah-mark.py from @fontsource/amiri 5.3.0 (amiri-arabic-700-normal.woff')
    expect(fs.existsSync(path.join(WEB, 'node_modules/@fontsource/amiri/files/amiri-arabic-700-normal.woff'))).toBe(true)
  })
  it('every side keeps at least 14% of the well, the binding side exactly the aimed margin', () => {
    const m = sides(at)
    for (const v of m) expect(v).toBeGreaterThanOrEqual(ALLAH_MIN_MARGIN)
    expect(Math.min(...m)).toBeCloseTo(ALLAH_MARGIN, 9)
    expect(ALLAH_MARGIN).toBeGreaterThanOrEqual(ALLAH_MIN_MARGIN)
  })
  it('optically centred: the optical centre at the well’s centre, the mass below it and the box’s centre above it', () => {
    expect(at.centre.x).toBeCloseTo(0.5, 9)
    expect(at.centre.y).toBeCloseTo(0.5, 9)
    expect(at.massAt.y).toBeGreaterThan(0.5)
    expect(at.top + at.height / 2).toBeLessThan(0.5)
    // halfway: the mass as far below the centre as the box's centre is above it
    expect(at.massAt.y - 0.5).toBeCloseTo(0.5 - (at.top + at.height / 2), 9)
  })
  it('the viewBox is the outline’s box widened by half the stroke on each side', () => {
    const s2 = ALLAH_STROKE / 2
    expect(at.viewBox).toBe(`${-s2} ${-s2} ${ALLAH_BOX.w + ALLAH_STROKE} ${ALLAH_BOX.h + ALLAH_STROKE}`)
    expect(at.width / at.height).toBeCloseTo((ALLAH_BOX.w + ALLAH_STROKE) / (ALLAH_BOX.h + ALLAH_STROKE), 9)
  })
  it('a fixed size in the well: the same placement for any margin asked of it, never outside', () => {
    for (const margin of [0.14, 0.15, 0.2])
      for (const pull of [0, 0.5, 1]) for (const v of sides(allahPlacement(ALLAH_BOX, ALLAH_MASS, { margin, pull }))) expect(v).toBeGreaterThanOrEqual(margin - 1e-12)
  })
  it('the well is in px and the mark in fractions of it: the text size does not grow it', () => {
    const css = fs.readFileSync(path.join(WEB, 'src/v2/daily/shortcuts/shortcuts.css'), 'utf8')
    expect(css).toMatch(/\.sc-ic \{[^}]*position: relative;[^}]*width: 44px;[^}]*height: 44px/)
    expect(css).toMatch(/\.sc-allah \{[^}]*position: absolute/)
    expect(css).not.toMatch(/\.sc-allah \{[^}]*font-size/)
    const icons = fs.readFileSync(path.join(WEB, 'src/v2/daily/shortcuts/icons.tsx'), 'utf8')
    expect(icons).toContain('left: pct(AT.left), top: pct(AT.top), width: pct(AT.width), height: pct(AT.height)')
  })
  it('the shamsa’s dark gold, 3:1 or more on the well', () => {
    const lum = (hex: string) => {
      const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
      return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
    }
    const ratio = (a: string, b: string) => {
      const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
      return (x + 0.05) / (y + 0.05)
    }
    const css = fs.readFileSync(path.join(WEB, 'src/v2/daily/shortcuts/shortcuts.css'), 'utf8')
    expect(css).toContain('color: var(--sc-allah-gold, #8c6d2a)')
    expect(fs.readFileSync(path.join(WEB, 'src/assets/shamsa-light.svg'), 'utf8').toUpperCase()).toContain('#8C6D2A')
    expect(ratio('#8c6d2a', '#faf7f0')).toBeGreaterThanOrEqual(3) // 4.53, the well (--soft-box)
    expect(ratio('#c9a24a', '#1c222b')).toBeGreaterThanOrEqual(3) // 6.66, the shamsa's gold on its dark ground
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
  it('switched off, the grid of eight stays', () => {
    const slots = fs.readFileSync(path.join(WEB, 'src/v2/daily/HomeSlots.tsx'), 'utf8')
    expect(slots).toContain("shortcutsLook() === 'off' ? <TodayTools /> : <MawaqifCard />")
  })
})
