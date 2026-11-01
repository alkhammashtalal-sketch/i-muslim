// Add-on 0072-add54: «السابق» beside «التالي» wherever pages turn. The widget «اسم الله لليوم» on iOS (NameIntent.swift,
// NameViews.swift NamePaging and NamePager, Widgets.swift) and Android (NamePaging.java, WidgetActions, Widgets,
// WidgetPainter): turning forward then back returns to the same page; «السابق» is not drawn on the first page and never
// turns to the last; «التالي» on the last page shows the first, as it always did. The words in the ten languages, the
// App Intents' titles as keys with English defaults and no «siri» (ITMS-90626), and the swipe both ways (swipe.js).
// The app's own Swift and Java are compiled here on the Mac (skipped where there is no compiler).
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { WIDGET_STRINGS } from '../../web/src/native/widget-strings'
import { CARDS } from '../../web/src/v2/cards/strings'
import { STRINGS } from '../../web/src/i18n'
import { MAWAQIF } from '../../web/src/v2/daily/mawaqif/strings-mawaqif'
import { swipeStep } from '../../web/src/paging/swipe.js'

const ROOT = path.resolve(__dirname, '../..')
const read = (f: string) => fs.readFileSync(path.join(ROOT, f), 'utf8')
const LANGS = ['ar', 'en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi'] as const
const WIDGETS = 'web/ios/App/MuslimWidgets'
const ANDROID = 'web/android/app/src/main/java/com/alkhammashtalal/imuslim/widget'
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩'

/** A Swift type's whole declaration, from `enum Name {` to its closing brace at the line's start. */
const swiftBlock = (src: string, head: string) => {
  const a = src.indexOf(head)
  expect(a, head).toBeGreaterThanOrEqual(0)
  return src.slice(a, src.indexOf('\n}\n', a) + 3)
}

const has = (cmd: string, args: string[]) => {
  try {
    execFileSync(cmd, args, { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}
const canSwift = process.platform === 'darwin' && has('xcrun', ['--find', 'swiftc'])
const canJava = has('javac', ['-version'])

/** A walk of taps from the first page: n «التالي», p «السابق» (only where it is drawn); the page shown after each. */
function walk(pages: number, taps: string, next: (p: number) => number, prev: (p: number) => number, hasPrev: (p: number) => boolean) {
  let at = 0
  return [...taps].map((t) => {
    if (t === 'n') at = next(at)
    else if (hasPrev(at)) at = prev(at)
    return at
  })
}

describe('iOS: NamePaging in NameViews.swift, compiled on the Mac', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nav-prev-'))
  const bin = path.join(dir, 'paging')
  const views = read(`${WIDGETS}/NameViews.swift`)
  const run = (...a: string[]) => execFileSync(bin, a, { encoding: 'utf8' }).trim()

  beforeAll(() => {
    if (!canSwift) return
    const src = [swiftBlock(read(`${WIDGETS}/Views.swift`), 'enum MWDigits {'), swiftBlock(views, 'enum NamePaging {')].join('\n')
    fs.mkdirSync(path.join(dir, 'main'))
    fs.writeFileSync(
      path.join(dir, 'main/main.swift'),
      `import Foundation
${src}
let a = CommandLine.arguments
if a[1] == "walk" {
    let pages = Int(a[2])!
    var at = 0
    var out: [String] = []
    for t in a[3] {
        if t == "n" { at = NamePaging.next(at, pages: pages) } else if NamePaging.hasPrev(at) { at = NamePaging.prev(at, pages: pages) }
        out.append(String(at))
    }
    print(out.joined(separator: " "))
} else {
    print(NamePaging.label(a[2], to: Int(a[3])!, of: Int(a[4])!, template: a[5].isEmpty ? nil : a[5], digits: a[6]))
}
`,
    )
    execFileSync('xcrun', ['swiftc', '-o', bin, path.join(dir, 'main/main.swift')], { stdio: 'pipe' })
  }, 120_000)

  it.runIf(canSwift)('forward then back returns to the same page, on every page', () => {
    expect(run('walk', '3', 'np')).toBe('1 0')
    expect(run('walk', '3', 'nnp')).toBe('1 2 1')
    expect(run('walk', '4', 'nnnppp')).toBe('1 2 3 2 1 0')
    expect(run('walk', '2', 'np')).toBe('1 0')
  })

  it.runIf(canSwift)('the first page: «السابق» does nothing (it is hidden) and never turns to the last', () => {
    expect(run('walk', '3', 'p')).toBe('0')
    expect(run('walk', '3', 'ppp')).toBe('0 0 0')
    expect(run('walk', '3', 'npp')).toBe('1 0 0')
  })

  it.runIf(canSwift)('the last page: «التالي» shows the first again, as before add-on 0072-add54', () => {
    expect(run('walk', '3', 'nnn')).toBe('1 2 0')
    expect(run('walk', '2', 'nn')).toBe('1 0')
    expect(run('walk', '1', 'nn')).toBe('0 0')
  })

  it.runIf(canSwift)('VoiceOver: «السابق، صفحة ٢ من ٣» in the app’s digits; the word alone with older data', () => {
    expect(run('label', 'السابق', '1', '3', WIDGET_STRINGS.ar.navPage, AR_DIGITS)).toBe('السابق، صفحة ٢ من ٣')
    expect(run('label', 'Next', '0', '3', WIDGET_STRINGS.en.navPage, '0123456789')).toBe('Next, page 1 of 3')
    expect(run('label', 'پچھلا', '0', '2', WIDGET_STRINGS.ur.navPage, '۰۱۲۳۴۵۶۷۸۹')).toBe('پچھلا، صفحہ ۱ از ۲')
    expect(run('label', 'التالي', '2', '3', '', AR_DIGITS)).toBe('التالي')
  })

  it('the views: «السابق» hidden on the first page, then the dots, then «التالي»; «شارك» kept, its symbol where it must', () => {
    const pager = swiftBlock(views, 'struct NamePager<Btn: View>: View {')
    expect(pager).toContain('if NamePaging.hasPrev(current) { back } else { back.hidden().accessibilityHidden(true) }')
    expect(pager.indexOf('turn: -1')).toBeLessThan(pager.indexOf('PageDots('))
    expect(pager.indexOf('PageDots(')).toBeLessThan(pager.indexOf('turn: 1'))
    expect(pager).toContain('Link(destination: url) { NamePill(text: labels.share ?? "شارك", s: s, filled: false, icon: shareIcon) }')
    // every candidate keeps «شارك»; the first that fits is shown
    expect(pager.match(/ row\(shareIcon: (true|false), /g)?.length).toBe(5)
    const pill = swiftBlock(views, 'struct NamePill: View {')
    expect(pill).toContain('if turn < 0 { chevron("chevron.backward") }')
    expect(pill).toContain('if turn > 0 { chevron("chevron.forward") }')
    expect(pill).toContain('.accessibilityLabel(Text(spoken ?? text))')
    // both sizes use the one pager
    expect(views.match(/NamePager\(labels: data\.labels/g)?.length).toBe(2)
    const widgets = read(`${WIDGETS}/Widgets.swift`)
    expect(widgets).toMatch(/if label\.turn < 0 \{\s+Button\(intent: PrevNamePageIntent\(day: day\.day, family: family, pages: pages\)\)/)
    expect(widgets).toContain('Button(intent: NextNamePageIntent(day: day.day, family: family, pages: pages))')
  })
})

describe('iOS: the intents’ titles are keys with English defaults, and no «siri» (ITMS-90626)', () => {
  const src = read(`${WIDGETS}/NameIntent.swift`)
  it('«التالي» and «السابق»', () => {
    expect(src).toContain('static let title = LocalizedStringResource("widget.name.next.title", defaultValue: "Next page")')
    expect(src).toContain('static let title = LocalizedStringResource("widget.name.prev.title", defaultValue: "Previous page")')
    for (const [k, v] of [['day', 'Day'], ['size', 'Size'], ['pages', 'Pages']]) {
      expect(src.split(`@Parameter(title: LocalizedStringResource("widget.name.page.${k}", defaultValue: "${v}"))`).length - 1, k).toBe(2)
    }
    // no bare title, no parameter without its key
    expect(src).not.toMatch(/static let title: LocalizedStringResource = "/)
    expect(src).not.toMatch(/@Parameter\(title: "/)
    expect(src).not.toMatch(/siri/i)
    expect(src).toContain('NamePageStore.back(day: day, family: family, pages: pages)')
    expect(src.match(/static let isDiscoverable: Bool = false/g)?.length).toBe(2)
  })
})

describe('Android: NamePaging.java, compiled on its own', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nav-prev-java-'))
  const pkg = 'com.alkhammashtalal.imuslim.widget'
  beforeAll(() => {
    if (!canJava) return
    fs.writeFileSync(
      path.join(dir, 'Check.java'),
      `package ${pkg};
public class Check {
    public static void main(String[] a) {
        if (a[0].equals("label")) { System.out.println(NamePaging.label(a[1], Integer.parseInt(a[2]), Integer.parseInt(a[3]), a[4], a[5])); return; }
        NamePaging.main(new String[] { a[1], a[2] });
    }
}
`,
    )
    execFileSync('javac', ['-encoding', 'UTF-8', '-d', dir, path.join(ROOT, ANDROID, 'NamePaging.java'), path.join(dir, 'Check.java')], { stdio: 'pipe' })
  }, 60_000)
  const run = (...a: string[]) => execFileSync('java', ['-Dstdout.encoding=UTF-8', '-cp', dir, `${pkg}.Check`, ...a], { encoding: 'utf8' }).trim()

  it.runIf(canJava)('the same walks as the iPhone', () => {
    expect(run('walk', '3', 'np')).toBe('1 0')
    expect(run('walk', '4', 'nnnppp')).toBe('1 2 3 2 1 0')
    expect(run('walk', '3', 'ppp')).toBe('0 0 0')
    expect(run('walk', '3', 'nnn')).toBe('1 2 0')
    expect(run('walk', '2', 'npnp')).toBe('1 0 1 0')
  })

  it.runIf(canJava)('TalkBack: «السابق، صفحة ٢ من ٣»', () => {
    expect(run('label', 'السابق', '1', '3', WIDGET_STRINGS.ar.navPage, AR_DIGITS)).toBe('السابق، صفحة ٢ من ٣')
    expect(run('label', 'Previous', '0', '2', WIDGET_STRINGS.en.navPage, '0123456789')).toBe('Previous, page 1 of 2')
  })

  it('the painter, the actions and the broadcasts', () => {
    const painter = read(`${ANDROID}/WidgetPainter.java`)
    const pager = painter.slice(painter.indexOf('private float pager('), painter.indexOf('\n    }\n', painter.indexOf('private float pager(')))
    expect(pager).toMatch(/if \(NamePaging\.hasPrev\(at\)\) \{\s+RectF prev = navPill\(prevWord, false/)
    expect(pager).toContain('tap(prev, WidgetActions.NAME_PREV, NamePaging.label(d.prev, NamePaging.prev(at), n, d.navPage, d.digits));')
    expect(pager).toContain('tap(next, WidgetActions.NAME_NEXT, NamePaging.label(d.next, NamePaging.shown(at + 1, n), n, d.navPage, d.digits));')
    expect(pager).toContain('out.pageShown = at;')
    // «شارك» stays in the large: its words, or its symbol where they do not all fit
    expect(painter).toContain('RectF share = need <= room ? pill(d.shareLabel, START, x0, x1, bottom - ph, ph, false) : shareIcon(x0, x1, bottom - ph, ph);')
    const actions = read(`${ANDROID}/WidgetActions.java`)
    expect(actions).toContain('static final String NAME_PREV = "com.alkhammashtalal.imuslim.widget.NAME_PREV";')
    expect(actions).toContain('else Widgets.setPage(ctx, id, day, NamePaging.prev(intent.getIntExtra(PAGE, 0)));')
    const widgets = read(`${ANDROID}/Widgets.java`)
    expect(widgets).toContain('t.url.equals(WidgetActions.NAME_PREV) ? prevPage(ctx, id, r.pageShown)')
    expect(widgets).toContain('setPage(ctx, id, day, NamePaging.next(page(ctx, id, day)));')
    expect(read(`${ANDROID}/NameData.java`)).toContain('d.prev = str(l, "prevPage");')
  })
})

describe('the words in the ten languages', () => {
  it('the widget: «السابق» beside «التالي», and the screen reader’s line', () => {
    expect(WIDGET_STRINGS.ar.prevPage).toBe('السابق')
    expect(WIDGET_STRINGS.ar.nextPage).toBe('التالي')
    expect(WIDGET_STRINGS.en.prevPage).toBe('Previous')
    for (const l of LANGS) {
      const w = WIDGET_STRINGS[l]
      expect(w.prevPage, l).toMatch(/\S/)
      expect(w.prevPage, l).not.toBe(w.nextPage)
      for (const k of ['{b}', '{n}', '{t}']) expect(w.navPage, `${l} ${k}`).toContain(k)
      expect(`${w.prevPage}${w.navPage}`).not.toMatch(/[!！]/)
    }
  })

  it('the cards’ preview, the starting path, «أذكار المواقف»', () => {
    for (const l of LANGS) {
      expect(CARDS[l].prev, l).toMatch(/\S/)
      expect(CARDS[l].next, l).toMatch(/\S/)
      expect(CARDS[l].navCard, l).toMatch(/\{b\}.*\{card\}/)
      expect(STRINGS[l].starterPrev, l).toContain('{title}')
      expect(STRINGS[l].starterPrev, l).not.toBe(STRINGS[l].starterNext)
      expect(MAWAQIF[l].prev, l).toMatch(/\S/)
    }
    expect(CARDS.ar.prev).toBe('السابق')
    expect(STRINGS.ar.starterPrev).toBe('الخطوة السابقة: {title}')
    expect(MAWAQIF.ms.prev).toBe('Sebelumnya')
  })
})

describe('the swipe, both ways', () => {
  it('the finger moving right is the next page in Arabic and the previous in English', () => {
    expect(swipeStep(80, 5, true)).toBe(1)
    expect(swipeStep(-80, 5, true)).toBe(-1)
    expect(swipeStep(-80, 5, false)).toBe(1)
    expect(swipeStep(80, 5, false)).toBe(-1)
  })

  it('a short or a mostly downward move is no swipe', () => {
    expect(swipeStep(40, 0, true)).toBe(0)
    expect(swipeStep(80, 70, false)).toBe(0)
  })

  it('there and back returns to the same step, and never past the first or the last', () => {
    const N = 5
    let at = 2
    const go = (k: number) => (at = Math.min(N - 1, Math.max(0, at + k)))
    go(swipeStep(-90, 0, false))
    go(swipeStep(90, 0, false))
    expect(at).toBe(2)
    for (let i = 0; i < 9; i++) go(swipeStep(90, 0, true))
    expect(at).toBe(N - 1)
    for (let i = 0; i < 9; i++) go(swipeStep(-90, 0, true))
    expect(at).toBe(0)
  })

  it('the lessons, the name’s page and «أذكار المواقف» turn by it', () => {
    for (const f of ['web/src/lessons/wudu/lesson.js', 'web/src/lessons/prayer/lesson.js']) {
      expect(read(f), f).toContain("const unswipe = attachSwipe(app, (k) => {")
      expect(read(f), f).toMatch(/destroy\(\) \{\s+destroyed = true\s+unswipe\(\)/)
    }
    expect(read('web/src/v2/daily/names/NamePage.tsx')).toContain('useSwipe(')
    expect(read('web/src/v2/daily/mawaqif/Mawaqif.tsx')).toContain('onTouchEnd={onEnd}')
  })
})
