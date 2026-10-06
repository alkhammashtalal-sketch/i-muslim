import { useCallback, useEffect, useRef, useState } from 'react'
import { Endpointer, MIC_ENDPOINT } from './endpoint'
import { encodeWav, toMono16k } from './wav'

// «اسأل بصوتك» (command 11): record → WAV → POST /api/transcribe → text in the question box. Nothing is sent to
// the answer engine automatically, and no audio is kept: chunks are dropped as soon as the WAV is built and sent.
// Recording stops by itself after 3 s of silence (reply 0035, voice/endpoint.ts MIC_ENDPOINT, on the device), and is
// dropped unsent when nothing was said in the first 8 s; the stop button still works. Without Web Audio it stays manual.

export const MAX_SECONDS = 30

export type RecError = 'unsupported' | 'denied' | 'nomic' | 'network' | 'unclear' | 'limit' | 'toolong' | 'failed'
export type RecState =
  | { kind: 'idle' }
  | { kind: 'recording'; seconds: number }
  | { kind: 'transcribing' }
  | { kind: 'error'; reason: RecError }

export const voiceSupported = () =>
  typeof window !== 'undefined' && 'MediaRecorder' in window && !!navigator.mediaDevices?.getUserMedia

export async function transcribe(wav: Blob): Promise<{ text: string } | { error: RecError }> {
  let res: Response
  try {
    res = await fetch('/api/transcribe', { method: 'POST', headers: { 'content-type': 'audio/wav' }, body: wav })
  } catch {
    return { error: 'network' }
  }
  const body = (await res.json().catch(() => ({}))) as { text?: string; empty?: boolean; error?: string }
  if (res.ok && body.text) return { text: body.text }
  if (res.ok && body.empty) return { error: 'unclear' }
  if (res.status === 429) return { error: 'limit' }
  if (res.status === 413) return { error: 'toolong' }
  return { error: 'failed' }
}

export function useRecorder(onText: (text: string) => void) {
  const [state, setState] = useState<RecState>({ kind: 'idle' })
  const rec = useRef<{
    recorder: MediaRecorder
    stream: MediaStream
    chunks: Blob[]
    started: number
    timer: number
    cancelled: boolean
    ctx: AudioContext | null
    ep: Endpointer | null
  } | null>(null)
  const textCb = useRef(onText)
  useEffect(() => {
    textCb.current = onText
  })

  const release = () => {
    const r = rec.current
    if (!r) return
    window.clearInterval(r.timer)
    r.ep?.dispose()
    r.stream.getTracks().forEach((t) => t.stop())
    r.ctx?.close().catch(() => undefined)
    rec.current = null
  }

  const finish = useCallback(async (chunks: Blob[], type: string) => {
    setState({ kind: 'transcribing' })
    try {
      const wav = encodeWav(await toMono16k(new Blob(chunks, { type })))
      chunks.length = 0
      const r = await transcribe(wav)
      if ('text' in r) {
        textCb.current(r.text)
        setState({ kind: 'idle' })
      } else setState({ kind: 'error', reason: r.error })
    } catch {
      setState({ kind: 'error', reason: 'unclear' }) // the browser could not decode what was recorded
    }
  }, [])

  const stop = useCallback(() => {
    const r = rec.current
    if (r && r.recorder.state !== 'inactive') r.recorder.stop()
  }, [])

  const cancel = useCallback(() => {
    const r = rec.current
    if (!r) return
    r.cancelled = true
    if (r.recorder.state !== 'inactive') r.recorder.stop()
    release()
    setState({ kind: 'idle' })
  }, [])

  /** Nothing said in the first seconds: the recording is dropped, nothing is sent. */
  const idle = useCallback(() => {
    const r = rec.current
    if (!r) return
    r.cancelled = true
    if (r.recorder.state !== 'inactive') r.recorder.stop()
    release()
    setState({ kind: 'error', reason: 'unclear' })
  }, [])

  const start = useCallback(async () => {
    if (!voiceSupported()) return setState({ kind: 'error', reason: 'unsupported' })
    // iOS runs an audio context only when it is made inside the press: made here, before the first await.
    let ctx: AudioContext | null = null
    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (Ctx) {
        ctx = new Ctx()
        void ctx.resume()
      }
    } catch {
      ctx = null // no Web Audio: the stop stays manual
    }
    const drop = () => void ctx?.close().catch(() => undefined)
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } })
    } catch (e) {
      drop()
      const name = (e as DOMException)?.name
      const reason: RecError = name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : name === 'NotFoundError' || name === 'OverconstrainedError' ? 'nomic' : 'failed'
      return setState({ kind: 'error', reason })
    }
    let recorder: MediaRecorder
    try {
      recorder = new MediaRecorder(stream)
    } catch {
      stream.getTracks().forEach((t) => t.stop())
      drop()
      return setState({ kind: 'error', reason: 'unsupported' })
    }
    const chunks: Blob[] = []
    const started = Date.now()
    const timer = window.setInterval(() => {
      const seconds = Math.floor((Date.now() - started) / 1000)
      if (seconds >= MAX_SECONDS) stop()
      else setState({ kind: 'recording', seconds })
    }, 250)
    let ep: Endpointer | null = null
    if (ctx) {
      try {
        ep = new Endpointer(ctx, stream, { onLevel: () => undefined, onSpeechStart: () => undefined, onSpeechEnd: () => stop(), onIdle: idle }, MIC_ENDPOINT)
      } catch {
        ep = null
      }
    }
    rec.current = { recorder, stream, chunks, started, timer, cancelled: false, ctx, ep }
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data)
    }
    recorder.onstop = () => {
      const cancelled = rec.current?.cancelled ?? true
      release()
      if (cancelled || chunks.length === 0) {
        chunks.length = 0
        return
      }
      void finish(chunks, recorder.mimeType || chunks[0].type)
    }
    recorder.start(250)
    ep?.start()
    setState({ kind: 'recording', seconds: 0 })
  }, [finish, stop, idle])

  const reset = useCallback(() => setState({ kind: 'idle' }), [])

  // Leaving the page or unmounting while recording: stop the microphone, send nothing.
  useEffect(() => () => {
    if (rec.current) {
      rec.current.cancelled = true
      if (rec.current.recorder.state !== 'inactive') rec.current.recorder.stop()
      release()
    }
  }, [])

  return { state, start, stop, cancel, reset }
}
