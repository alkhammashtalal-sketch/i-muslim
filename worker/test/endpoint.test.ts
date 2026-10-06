// End of speech for the microphone button (reply 0035): voice/endpoint.ts with MIC_ENDPOINT. A fake analyser gives a
// steady level per stretch of time; the endpointer's 50 ms ticks run on fake timers.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ENDPOINT, Endpointer, MIC_ENDPOINT } from '../../web/src/voice/endpoint'

const NOISE = 0.002
const SPEECH = 0.1

function rig() {
  let level = NOISE
  const ctx = {
    createMediaStreamSource: () => ({ connect: () => undefined, disconnect: () => undefined }),
    createAnalyser: () => ({ fftSize: 0, getFloatTimeDomainData: (b: Float32Array) => b.fill(level) }),
  } as unknown as AudioContext
  const events: { t: number; e: string }[] = []
  const t0 = performance.now()
  const at = (e: string) => () => events.push({ t: Math.round(performance.now() - t0), e })
  const ep = new Endpointer(ctx, {} as MediaStream, { onLevel: () => undefined, onSpeechStart: at('start'), onSpeechEnd: at('end'), onIdle: at('idle') }, MIC_ENDPOINT)
  ep.start()
  /** `ms` of `l`, tick by tick. */
  const play = (l: number, ms: number) => {
    level = l
    vi.advanceTimersByTime(ms)
  }
  return { ep, events, play, names: () => events.map((x) => x.e) }
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'performance'] })
  ;(globalThis as unknown as { window: typeof globalThis }).window = globalThis
})
afterEach(() => vi.useRealTimers())

describe('microphone endpoint (MIC_ENDPOINT)', () => {
  it('keeps the full-screen mode as it was, and sets the button apart', () => {
    expect(ENDPOINT).toEqual({ calibrateMs: 500, endSilenceMs: 900, minSpeechMs: 400, maxSpeechMs: 28_000, idleMs: 60_000 })
    expect(MIC_ENDPOINT).toEqual({ calibrateMs: 500, endSilenceMs: 3000, minSpeechMs: 400, maxSpeechMs: 30_000, idleMs: 8000 })
  })

  it('one second of speech, then 3 s of silence: the end, once, and not before 3 s', () => {
    const r = rig()
    r.play(NOISE, 600)
    r.play(SPEECH, 1000)
    r.play(NOISE, 2900)
    expect(r.names()).toEqual(['start'])
    r.play(NOISE, 200)
    expect(r.names()).toEqual(['start', 'end'])
    r.play(NOISE, 10_000)
    expect(r.names()).toEqual(['start', 'end'])
  })

  it('a pause of 2.5 s to think does not end it', () => {
    const r = rig()
    r.play(NOISE, 600)
    r.play(SPEECH, 1000)
    r.play(NOISE, 2500)
    r.play(SPEECH, 1000)
    r.play(NOISE, 2900)
    expect(r.names()).toEqual(['start'])
    r.play(NOISE, 200)
    expect(r.names()).toEqual(['start', 'end'])
  })

  it('nothing said: idle at 8 s from the press, not before', () => {
    const r = rig()
    r.play(NOISE, 7900)
    expect(r.names()).toEqual([])
    r.play(NOISE, 200)
    expect(r.names()).toEqual(['idle'])
  })

  it('a knock under 400 ms of sound is not speech: no end after it, and idle still comes', () => {
    const r = rig()
    r.play(NOISE, 1000)
    r.play(SPEECH, 300)
    r.play(NOISE, 4000)
    expect(r.names()).not.toContain('end')
    r.play(NOISE, 3000)
    expect(r.names()).toEqual(['start', 'idle'])
  })

  it('450 ms of sound is speech: it ends 3 s later', () => {
    const r = rig()
    r.play(NOISE, 600)
    r.play(SPEECH, 450)
    r.play(NOISE, 3200)
    expect(r.names()).toEqual(['start', 'end'])
  })

  it('30 s of speech without a pause: ended at the limit', () => {
    const r = rig()
    r.play(NOISE, 600)
    r.play(SPEECH, 29_000)
    expect(r.names()).toEqual(['start'])
    r.play(SPEECH, 2000)
    expect(r.names()).toEqual(['start', 'end'])
  })
})
