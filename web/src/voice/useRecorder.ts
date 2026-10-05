import { useCallback, useEffect, useRef, useState } from 'react'
import { encodeWav, toMono16k } from './wav'

// «اسأل بصوتك» (command 11): record → WAV → POST /api/transcribe → text in the question box. Nothing is sent to
// the answer engine automatically, and no audio is kept: chunks are dropped as soon as the WAV is built and sent.

export const MAX_SECONDS = 30

export type RecError = 'unsupported' | 'denied' | 'nomic' | 'network' | 'unclear' | 'limit' | 'toolong' | 'failed'
export type RecState =
  | { kind: 'idle' }
  | { kind: 'recording'; seconds: number }
  | { kind: 'transcribing' }
  | { kind: 'error'; reason: RecError }

export const voiceSupported = () =>
  typeof window !== 'undefined' && 'MediaRecorder' in window && !!navigator.mediaDevices?.getUserMedia

async function transcribe(wav: Blob): Promise<{ text: string } | { error: RecError }> {
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
  const rec = useRef<{ recorder: MediaRecorder; stream: MediaStream; chunks: Blob[]; started: number; timer: number; cancelled: boolean } | null>(null)
  const textCb = useRef(onText)
  useEffect(() => {
    textCb.current = onText
  })

  const release = () => {
    const r = rec.current
    if (!r) return
    window.clearInterval(r.timer)
    r.stream.getTracks().forEach((t) => t.stop())
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

  const start = useCallback(async () => {
    if (!voiceSupported()) return setState({ kind: 'error', reason: 'unsupported' })
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } })
    } catch (e) {
      const name = (e as DOMException)?.name
      const reason: RecError = name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : name === 'NotFoundError' || name === 'OverconstrainedError' ? 'nomic' : 'failed'
      return setState({ kind: 'error', reason })
    }
    let recorder: MediaRecorder
    try {
      recorder = new MediaRecorder(stream)
    } catch {
      stream.getTracks().forEach((t) => t.stop())
      return setState({ kind: 'error', reason: 'unsupported' })
    }
    const chunks: Blob[] = []
    const started = Date.now()
    const timer = window.setInterval(() => {
      const seconds = Math.floor((Date.now() - started) / 1000)
      if (seconds >= MAX_SECONDS) stop()
      else setState({ kind: 'recording', seconds })
    }, 250)
    rec.current = { recorder, stream, chunks, started, timer, cancelled: false }
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
    setState({ kind: 'recording', seconds: 0 })
  }, [finish, stop])

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
