// Reply 0060 (Talal 01:42, option 2): the home card «أذكار» (the moments) no longer looks like the tile «الأذكار» (the
// book) above it: its icon is the raised hands of its own board (the situation «التعزية»), from the app's own set, on
// the gold ground instead of the tile's light green. The tile, the widget and the icons inside the page stay as they were.
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = path.resolve(import.meta.dirname, '../..')
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8')

describe('the card «أذكار» on the home (0060)', () => {
  const home = read('web/src/v2/daily/HomeSlots.tsx')
  it('its icon: the raised hands, on gold', () => {
    const card = home.slice(home.indexOf('data-testid="home-mawaqif"'), home.indexOf('</a>', home.indexOf('data-testid="home-mawaqif"')))
    expect(card).toContain('<span className="dt-tool-ic is-gold" data-icon="hands">')
    expect(card).toContain('<SituationIcon name="hands" size={22} />')
    expect(card).not.toContain('IcBook')
    expect(card).not.toContain('is-green')
  })
  it('from the app\'s own icons: the hands drawn for «التعزية» on the board', () => {
    const icons = read('web/src/v2/daily/mawaqif/icons.tsx')
    expect(icons).toMatch(/\n {2}hands: \(\n/)
    const data = JSON.parse(read('data/mawaqif.json')) as { situations: { id: string; icon: string }[] }
    expect(data.situations.find((s) => s.id === 'condolence')?.icon).toBe('hands')
  })
  it('what stays: the tile «الأذكار» its book on green, the widget, the page\'s own icons', () => {
    expect(home).toContain("['adhkar', <IcBook />, 'green'],")
    const tokens = read('web/src/styles/tokens.css')
    expect(tokens).toContain('--tint-gold: rgba(250, 226, 168, 0.95);')
    expect(tokens).toContain('--tint-green: rgba(210, 236, 224, 0.95);')
    // The size is optional and 26 by default, as the board's icons were.
    expect(read('web/src/v2/daily/mawaqif/icons.tsx')).toContain('const Svg = ({ size = 26, children }')
  })
})
