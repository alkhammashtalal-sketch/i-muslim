// The full adhan inside the app (add-on 0072-add24 §1): each of the five prayers its own recording, Fajr the repaired
// one, from the server's approved manifest; nothing before the server lists it. The playing itself (a tap, one sound
// at a time, the audio session) is e2e/v2-0072-adhan-player.spec.ts.
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { EMPTY_MANIFEST, parseManifest } from '../../web/src/native/alert-sounds'
import { ALERT_TEXT } from '../../web/src/native/alert-strings'
import { ADHAN_PRAYERS, adhanPrayers, fullAdhanPath } from '../../web/src/v2/daily/adhan-player'

const ROOT = path.resolve(import.meta.dirname, '../..')
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8')
const shipped = parseManifest(JSON.parse(read('web/public/sounds/manifest.json')))

describe('the full adhan of each prayer (add-on 0072-add24 §1)', () => {
  it('the five prayers, each its own file, Fajr the repaired adhan-full-fajr; no sunrise', () => {
    expect(ADHAN_PRAYERS).toEqual(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'])
    expect(adhanPrayers(shipped)).toEqual([...ADHAN_PRAYERS])
    for (const p of ADHAN_PRAYERS) expect(fullAdhanPath(shipped, p)).toBe(`/sounds/adhan-full-${p}.m4a`)
    expect(fullAdhanPath(shipped, 'sunrise')).toBeNull()
    // Every path is a file of the server's static folder.
    for (const p of ADHAN_PRAYERS) expect(fs.existsSync(path.join(ROOT, 'web/public', fullAdhanPath(shipped, p)!))).toBe(true)
  })

  it('nothing before the server lists it approved, and never the alert clip', () => {
    expect(adhanPrayers(EMPTY_MANIFEST)).toEqual([])
    const unapproved = { ...shipped, sounds: shipped.sounds.map((s) => ({ ...s, approved: false })) }
    expect(adhanPrayers(unapproved)).toEqual([])
    expect(shipped.sounds.some((s) => s.id === 'adhan-short')).toBe(true)
    for (const p of ADHAN_PRAYERS) expect(fullAdhanPath(shipped, p)).not.toMatch(/short|\.caf$|\.ogg$/)
  })

  it('the buttons and the source line in the ten languages, the prayer’s name in each button', () => {
    for (const [l, t] of Object.entries(ALERT_TEXT)) {
      expect(t.listenAdhan, l).toContain('{p}')
      expect(t.stopAdhan, l).toContain('{p}')
      expect(t.adhanFrom, l).toBeTruthy()
    }
    expect(ALERT_TEXT.ar.listenAdhan).toBe('استمع إلى أذان {p}')
  })

  it('shown inside the app only, played only from a tap, giving way to any other sound', () => {
    const page = read('web/src/v2/daily/PrayerTimes.tsx')
    expect(page).toContain('if (!isNative()) return')
    expect(page).toContain('onClick={() => toggleAdhan(n, adhanOf(n)!)}')
    const player = read('web/src/v2/daily/adhan-player.ts')
    expect(player).toContain("window.addEventListener('recitation-start', giveWay)")
    expect(player).toContain("window.addEventListener('listen-start', giveWay)")
    expect(player).toContain("setAudioSession('playback')")
    expect(player).not.toMatch(/autoplay|\.play\(\)[^\n]*setTimeout/)
  })
})
