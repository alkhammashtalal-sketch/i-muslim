// «منبّه الفجر» with «الأذان مرة» follows a new edition of the short adhan when the app comes back (Opus re-review of
// 6178ba1, relay/w1/0072-alarm/README.md): refreshAlarmSound (web/src/native/fajr-alarm.ts) gives the alarm the file the
// phone has now when it is not the one last given; never when the alarm is off, on its usual sound, or not on there.
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { refreshAlarmSound, type AlarmPrefs, type AlarmSoundDeps } from '../../web/src/native/fajr-alarm'
import type { Ready } from '../../web/src/native/alert-sounds'

const ROOT = path.resolve(import.meta.dirname, '../..')
const OLD = 'muslim-adhan-fajr-short-6dee51f16e84.caf'
const NEW = 'muslim-adhan-fajr-short-0123456789ab.caf'

function phone(o: { prefs: AlarmPrefs; ready: Ready; native?: { supported: boolean; on: boolean } }) {
  let prefs = o.prefs
  const calls: { method: string; o?: unknown }[] = []
  const deps: AlarmSoundDeps = {
    load: () => prefs,
    save: (p) => void (prefs = p),
    available: async () => (calls.push({ method: 'available' }), o.native ?? { supported: true, on: true }),
    prepare: async () => (calls.push({ method: 'prepare' }), o.ready),
    setSound: async (x) => void calls.push({ method: 'setSound', o: x }),
  }
  return { deps, calls, prefs: () => prefs, set: (r: Ready) => void (o.ready = r) }
}
const sets = (c: { method: string }[]) => c.filter((x) => x.method === 'setSound')

describe('the Fajr alarm takes a new short adhan on the way back to the app', () => {
  it('a new edition: given to the alarm once, then nothing on the next returns while it stays the same', async () => {
    const p = phone({ prefs: { on: true, sound: 'adhan', file: OLD }, ready: { 'adhan-fajr-short': NEW } })
    expect(await refreshAlarmSound('إيقاف', p.deps)).toBe(true)
    expect(sets(p.calls)).toEqual([{ method: 'setSound', o: { sound: NEW, stop: 'إيقاف' } }])
    expect(p.prefs()).toEqual({ on: true, sound: 'adhan', file: NEW })
    for (let i = 0; i < 3; i++) expect(await refreshAlarmSound('إيقاف', p.deps)).toBe(false)
    expect(sets(p.calls)).toHaveLength(1)
    // A later edition: once more.
    p.set({ 'adhan-fajr-short': 'muslim-adhan-fajr-short-aaaaaaaaaaaa.caf' })
    expect(await refreshAlarmSound('إيقاف', p.deps)).toBe(true)
    expect(sets(p.calls)).toHaveLength(2)
  })

  it('the same file as given: nothing (every ordinary return)', async () => {
    const p = phone({ prefs: { on: true, sound: 'adhan', file: OLD }, ready: { 'adhan-fajr-short': OLD } })
    expect(await refreshAlarmSound('إيقاف', p.deps)).toBe(false)
    expect(sets(p.calls)).toEqual([])
  })

  it('an alarm set before the file was recorded (1.1 before this): given once, then recorded', async () => {
    const p = phone({ prefs: { on: true, sound: 'adhan' }, ready: { 'adhan-short': OLD } })
    expect(await refreshAlarmSound('Stop', p.deps)).toBe(true)
    expect(sets(p.calls)[0].o).toEqual({ sound: OLD, stop: 'Stop' })
    expect(await refreshAlarmSound('Stop', p.deps)).toBe(false)
  })

  it('never when the alarm is off or on its usual sound: nothing asked of the phone, nothing downloaded', async () => {
    for (const prefs of [{ on: false, sound: 'adhan' as const, file: OLD }, { on: true, sound: 'default' as const }, { on: false, sound: 'default' as const }]) {
      const p = phone({ prefs, ready: { 'adhan-fajr-short': NEW } })
      expect(await refreshAlarmSound('إيقاف', p.deps)).toBe(false)
      expect(p.calls).toEqual([])
    }
  })

  it('never when the phone says the alarm is not on there (turned off, not allowed, or before iOS 26), nor when its answer fails', async () => {
    for (const native of [{ supported: true, on: false }, { supported: false, on: false }]) {
      const p = phone({ prefs: { on: true, sound: 'adhan', file: OLD }, ready: { 'adhan-fajr-short': NEW }, native })
      expect(await refreshAlarmSound('إيقاف', p.deps)).toBe(false)
      expect(p.calls.map((c) => c.method)).toEqual(['available'])
    }
    const p = phone({ prefs: { on: true, sound: 'adhan', file: OLD }, ready: { 'adhan-fajr-short': NEW } })
    p.deps.available = async () => Promise.reject(new Error('not implemented'))
    expect(await refreshAlarmSound('إيقاف', p.deps)).toBe(false)
    expect(sets(p.calls)).toEqual([])
  })

  it('the new file not on the phone (download failed or refused): nothing; the alarm keeps the system’s sound by its signature', async () => {
    for (const ready of [{}, { 'adhan-fajr-short': '../x.caf' }, { 'adhan-fajr-short': 'x.m4a' }] as Ready[]) {
      const p = phone({ prefs: { on: true, sound: 'adhan', file: OLD }, ready })
      expect(await refreshAlarmSound('إيقاف', p.deps)).toBe(false)
      expect(sets(p.calls)).toEqual([])
      expect(p.prefs().file).toBe(OLD)
    }
  })

  it('wired on the way back only (not at launch), after the alerts’ renewal, on the iPhone alone; the settings record the file they give', () => {
    const nd = fs.readFileSync(path.join(ROOT, 'web/src/native/NativeDevice.tsx'), 'utf8')
    const again = nd.slice(nd.indexOf('const again = () => {'), nd.indexOf('const visible = () =>'))
    expect(again).toContain('void rescheduleAlerts(now.current.lang).then(() => refreshAlarmSoundNow(now.current.lang))')
    expect(nd.match(/refreshAlarmSoundNow\(/g)).toHaveLength(1)
    const fa = fs.readFileSync(path.join(ROOT, 'web/src/native/fajr-alarm.ts'), 'utf8')
    expect(fa).toMatch(/export function refreshAlarmSoundNow[\s\S]*if \(platform\(\) !== 'ios'\) return Promise\.resolve\(false\)/)
    const set = fs.readFileSync(path.join(ROOT, 'web/src/native/FajrAlarmSettings.tsx'), 'utf8')
    expect(set).toContain("const next: AlarmPrefs = { ...prefs, on: true, file: file ?? undefined }")
    expect(set).toContain('const given: AlarmPrefs = { ...next, file: file ?? undefined }')
    // The renewal (native) is untouched by this: no Swift changes here.
  })
})
