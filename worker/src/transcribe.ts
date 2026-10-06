// «اسأل بصوتك» (command 11): speech → text for the question box. The user reviews the text and sends it
// themselves; nothing is sent automatically. Input only: no recitation and no reading of religious text, by any model.
//   POST /api/transcribe   body: audio/wav (16 kHz mono from the browser), ≤ 2 MB, ≤ 30 s
//                          → { text, language } | { text: '', empty: true } when nothing intelligible was heard
// Workers AI Whisper detects the language itself. The audio is never stored or logged: it goes to Workers AI and is
// forgotten. A separate daily limit per device (HMAC of IP + day, the IP itself is never stored): 100 recordings
// (raised from 20 on 6 October: the full-screen voice conversation counts each sentence; decision 102).
import { bump } from './ask'
import type { Env } from './index'

export const WHISPER_MODEL = '@cf/openai/whisper-large-v3-turbo'
export const MAX_BYTES = 2 * 1024 * 1024
export const MAX_SECONDS = 30
export const DAILY_RECORDINGS = 100

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })

/** Reads the RIFF/WAVE header: PCM format, channels, sample rate and the duration of the data chunk. */
export function wavInfo(buf: Uint8Array): { seconds: number; sampleRate: number; channels: number } | null {
  if (buf.length < 44) return null
  const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  const tag = (o: number) => String.fromCharCode(buf[o], buf[o + 1], buf[o + 2], buf[o + 3])
  if (tag(0) !== 'RIFF' || tag(8) !== 'WAVE') return null
  let o = 12
  let fmt: { channels: number; sampleRate: number; bytesPerSec: number } | null = null
  while (o + 8 <= buf.length) {
    const id = tag(o)
    const size = v.getUint32(o + 4, true)
    if (id === 'fmt ' && size >= 16) {
      fmt = { channels: v.getUint16(o + 10, true), sampleRate: v.getUint32(o + 12, true), bytesPerSec: v.getUint32(o + 16, true) }
    } else if (id === 'data' && fmt && fmt.bytesPerSec > 0) {
      const dataBytes = Math.min(size, buf.length - o - 8)
      return { seconds: dataBytes / fmt.bytesPerSec, sampleRate: fmt.sampleRate, channels: fmt.channels }
    }
    o += 8 + size + (size % 2)
  }
  return null
}

function toBase64(buf: Uint8Array): string {
  let s = ''
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000))
  return btoa(s)
}

type WhisperOut = { text?: string; transcription_info?: { language?: string } }

export async function handleTranscribe(request: Request, env: Env): Promise<Response> {
  const declared = Number(request.headers.get('content-length') ?? 0)
  if (declared > MAX_BYTES) return json({ error: 'too_large' }, 413)
  const type = (request.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase()
  if (type !== 'audio/wav' && type !== 'audio/x-wav' && type !== 'audio/wave') return json({ error: 'bad_format' }, 415)

  const audio = new Uint8Array(await request.arrayBuffer())
  if (audio.length > MAX_BYTES) return json({ error: 'too_large' }, 413)
  const info = wavInfo(audio)
  if (!info) return json({ error: 'bad_format' }, 415)
  if (info.seconds > MAX_SECONDS + 0.5) return json({ error: 'too_long' }, 413)
  if (info.seconds < 0.3) return json({ text: '', empty: true })

  if (!env.IP_SALT) return json({ error: 'server' }, 500)
  const ip = request.headers.get('cf-connecting-ip') ?? 'unknown'
  if ((await bump(env, env.IP_SALT, ip, 'voice')) > DAILY_RECORDINGS) return json({ error: 'rate_limited' }, 429)

  let out: WhisperOut
  try {
    out = (await env.AI.run(WHISPER_MODEL as never, { audio: toBase64(audio), task: 'transcribe', vad_filter: true } as never)) as WhisperOut
  } catch {
    return json({ error: 'unavailable' }, 502)
  }
  const text = (out.text ?? '').replace(/\s+/g, ' ').trim()
  // Silence or noise: a gentle "didn't catch that" on the client, not a server error.
  if (text.replace(/[\p{P}\p{S}\s]/gu, '').length < 2) return json({ text: '', empty: true })
  return json({ text: text.slice(0, 500), language: out.transcription_info?.language ?? null })
}
