// End-of-speech detection for the full-screen voice mode (command 18), on the device only: the level of the
// microphone (RMS of an AnalyserNode), a threshold calibrated on the first half second of room noise, the end of a
// sentence after 900 ms of silence, and nothing shorter than 400 ms of speech. No library and no model: the Silero
// VAD (@ricky0123/vad-web) would need about 17 MB of WebAssembly and model files and 'wasm-unsafe-eval' in the
// Content-Security-Policy of every page (report 0025). Nothing leaves the device before a sentence has ended.

export type EndpointOptions = { calibrateMs: number; endSilenceMs: number; minSpeechMs: number; maxSpeechMs: number; idleMs: number }
export const ENDPOINT: EndpointOptions = { calibrateMs: 500, endSilenceMs: 900, minSpeechMs: 400, maxSpeechMs: 28_000, idleMs: 60_000 }

export type EndpointEvents = {
  /** 0..1, for the shamsa's breathing. */
  onLevel: (level: number) => void
  onSpeechStart: () => void
  /** `startMs`: when speech began, in ms since start() (with a short lead-in), to trim the leading silence. */
  onSpeechEnd: (startMs: number) => void
  /** No speech for `idleMs`. */
  onIdle: () => void
}

export class Endpointer {
  private analyser: AnalyserNode
  private source: MediaStreamAudioSourceNode
  private buf: Float32Array<ArrayBuffer>
  private timer = 0
  private t0 = 0
  private noise: number[] = []
  private threshold = 0.02
  private loud = 0
  private speaking = false
  private speechStart = 0
  private lastVoice = 0

  private ev: EndpointEvents
  private o: EndpointOptions

  constructor(ctx: AudioContext, stream: MediaStream, ev: EndpointEvents, o: EndpointOptions = ENDPOINT) {
    this.ev = ev
    this.o = o
    this.source = ctx.createMediaStreamSource(stream)
    this.analyser = ctx.createAnalyser()
    this.analyser.fftSize = 1024
    this.source.connect(this.analyser)
    this.buf = new Float32Array(this.analyser.fftSize)
  }

  start() {
    this.stop()
    this.t0 = performance.now()
    this.noise = []
    this.loud = 0
    this.speaking = false
    this.timer = window.setInterval(() => this.tick(), 50)
  }

  stop() {
    window.clearInterval(this.timer)
    this.timer = 0
  }

  dispose() {
    this.stop()
    try {
      this.source.disconnect()
    } catch {
      // already disconnected
    }
  }

  private rms() {
    this.analyser.getFloatTimeDomainData(this.buf)
    let sum = 0
    for (const x of this.buf) sum += x * x
    return Math.sqrt(sum / this.buf.length)
  }

  private tick() {
    const now = performance.now() - this.t0
    const r = this.rms()
    if (now < this.o.calibrateMs) {
      this.noise.push(r)
      this.ev.onLevel(0)
      return
    }
    if (this.noise.length) {
      const sorted = [...this.noise].sort((a, b) => a - b)
      const floor = sorted[Math.floor(sorted.length / 2)]
      this.threshold = Math.min(0.06, Math.max(0.006, floor * 3 + 0.003))
      this.noise = []
    }
    this.ev.onLevel(Math.min(1, r / (this.threshold * 4)))
    const voiced = r > (this.speaking ? this.threshold * 0.8 : this.threshold)
    if (voiced) {
      this.lastVoice = now
      if (!this.speaking && ++this.loud >= 2) {
        this.speaking = true
        this.speechStart = Math.max(0, now - 300)
        this.ev.onSpeechStart()
      }
    } else if (!this.speaking) this.loud = 0
    if (this.speaking) {
      const long = now - this.speechStart >= this.o.maxSpeechMs
      if (long || now - this.lastVoice >= this.o.endSilenceMs) {
        if (long || this.lastVoice - this.speechStart >= this.o.minSpeechMs) {
          this.stop()
          this.ev.onSpeechEnd(this.speechStart)
        } else {
          this.speaking = false // a knock or a cough, not a question
          this.loud = 0
        }
      }
    } else if (now >= this.o.idleMs) {
      this.stop()
      this.ev.onIdle()
    }
  }
}
