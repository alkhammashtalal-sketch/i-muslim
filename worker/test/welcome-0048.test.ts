// 0048-add2: the welcome page's box on the screen (the painting whole, stretched 2% at most) and the first run's
// languages (the phone's: one of the ten, another served content language with the English interface, else English);
// the ten localizations in the iOS bundle.
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { firstRunLanguage } from '../../web/src/v2/lang/first-run'
import { ART_RATIO, artBox } from '../../web/src/v2/welcome/Welcome'

const ROOT = path.resolve(import.meta.dirname, '../..')
const TEN = ['ar', 'en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi']

describe('the welcome painting on the screen', () => {
  it('fills a recent iPhone (within 2% of its shape), stretched no more than that', () => {
    for (const [w, h] of [
      [440, 956],
      [430, 932],
      [393, 852],
      [390, 844],
      [402, 874],
    ]) {
      const b = artBox(w, h)
      expect(b, `${w}×${h}`).toEqual({ left: 0, top: 0, width: w, height: h })
      expect(Math.abs(w / h / ART_RATIO - 1)).toBeLessThanOrEqual(0.02)
    }
  })
  it('a shorter screen (iPhone SE): whole at the screen\'s height, centred, nothing cut or stretched', () => {
    const b = artBox(375, 667)
    expect(b.height).toBe(667)
    expect(b.width / b.height).toBeCloseTo(ART_RATIO, 6)
    expect(b.left).toBeCloseTo((375 - b.width) / 2, 6)
    expect(b.top).toBe(0)
  })
  it('a taller screen: whole at the screen\'s width', () => {
    const b = artBox(360, 900)
    expect(b.width).toBe(360)
    expect(b.width / b.height).toBeCloseTo(ART_RATIO, 6)
  })
})

describe('the first run\'s languages (the phone\'s)', () => {
  it('one of the ten: the interface and the content in it', () => {
    for (const l of TEN) expect(firstRunLanguage([`${l}-XX`, 'en'])).toEqual({ lang: l, content: l })
    expect(firstRunLanguage(['ar-SA'])).toEqual({ lang: 'ar', content: 'ar' })
    expect(firstRunLanguage(['en-GB'])).toEqual({ lang: 'en', content: 'en' })
    expect(firstRunLanguage(['in-ID'])).toEqual({ lang: 'id', content: 'id' }) // the old tag for Indonesian
  })
  it('another served content language: the content in it, the English interface', () => {
    expect(firstRunLanguage(['fa-IR'])).toEqual({ lang: 'en', content: 'fa' })
    expect(firstRunLanguage(['zh-Hans-CN'])).toEqual({ lang: 'en', content: 'zh' })
    expect(firstRunLanguage(['fil-PH'])).toEqual({ lang: 'en', content: 'tl' })
    expect(firstRunLanguage(['bs'])).toEqual({ lang: 'en', content: 'bs' })
  })
  it('anything else, or nothing: English', () => {
    expect(firstRunLanguage(['de-DE', 'ar'])).toEqual({ lang: 'en', content: 'en' })
    expect(firstRunLanguage([])).toEqual({ lang: 'en', content: 'en' })
    expect(firstRunLanguage(undefined)).toEqual({ lang: 'en', content: 'en' })
  })
})

describe('the iOS bundle', () => {
  const app = path.join(ROOT, 'web/ios/App/App')
  it('declares the ten languages and carries a localization folder for each, in the project', () => {
    const plist = fs.readFileSync(path.join(app, 'Info.plist'), 'utf8')
    const declared = [...plist.slice(plist.indexOf('CFBundleLocalizations')).split('</array>')[0].matchAll(/<string>([a-z]+)<\/string>/g)].map((m) => m[1])
    expect(declared.sort()).toEqual([...TEN].sort())
    const pbx = fs.readFileSync(path.join(ROOT, 'web/ios/App/App.xcodeproj/project.pbxproj'), 'utf8')
    for (const l of TEN) {
      const strings = fs.readFileSync(path.join(app, `${l}.lproj/InfoPlist.strings`), 'utf8')
      for (const k of ['NSLocationWhenInUseUsageDescription', 'NSLocationAlwaysAndWhenInUseUsageDescription', 'NSMicrophoneUsageDescription', 'NSPhotoLibraryAddUsageDescription'])
        expect(strings, `${l} ${k}`).toMatch(new RegExp(`"${k}" = "[^"]+";`))
      expect(pbx, l).toContain(`path = ${l}.lproj/InfoPlist.strings;`)
      expect(pbx.slice(pbx.indexOf('knownRegions'), pbx.indexOf('mainGroup')), l).toMatch(new RegExp(`\\b${l},`))
    }
  })
})
