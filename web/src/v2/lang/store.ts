// On the device only (reply 0033 §أ1): the previous choice («آخر ما اخترت») and the language requests already sent
// (never sent twice). Nothing here leaves the device except the request itself: the normalised name, nothing else.
import { normalizeName, validRequest } from '../../../../shared/lang-norm'
import { api } from '../../api/base'

const KEY = 'muslim.lang.v1'
type Stored = { prev?: string; requested?: string[] }

export type LangStore = { getItem(k: string): string | null; setItem(k: string, v: string): void }
const storage = (): LangStore | null => {
  try {
    return localStorage
  } catch {
    return null
  }
}
function read(s: LangStore | null = storage()): Stored {
  try {
    const v = JSON.parse(s?.getItem(KEY) ?? '{}') as Stored
    return v && typeof v === 'object' ? v : {}
  } catch {
    return {}
  }
}
function write(v: Stored, s: LangStore | null = storage()) {
  try {
    s?.setItem(KEY, JSON.stringify(v))
  } catch {
    // storage unavailable (private mode): the request may be sent again next time
  }
}

/** The language chosen before the current one, if any. */
export const previousChoice = (s?: LangStore | null): string | null => read(s ?? storage()).prev ?? null

/** Remember the language being left when another is chosen. */
export function rememberChoice(from: string, to: string, s?: LangStore | null) {
  if (!from || from === to) return
  const st = s ?? storage()
  write({ ...read(st), prev: from }, st)
}

/** The text a request carries: the typed name, normalised; null when it is not 2–40 letters and spaces. */
export function requestTextOf(typed: string): string | null {
  const t = normalizeName(typed)
  return validRequest(t) ? t : null
}

export const alreadyRequested = (text: string, s?: LangStore | null) => (read(s ?? storage()).requested ?? []).includes(text)

export type RequestResult = 'sent' | 'already' | 'limited' | 'failed' | 'invalid'

/** POST /api/lang-request with the normalised text only, once per text on this device. */
export async function requestLang(typed: string, s?: LangStore | null, post: typeof fetch = fetch): Promise<RequestResult> {
  const text = requestTextOf(typed)
  if (!text) return 'invalid'
  const st = s ?? storage()
  if (alreadyRequested(text, st)) return 'already'
  try {
    const r = await post(api('/api/lang-request'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text }) })
    if (r.status === 429) return 'limited'
    if (!r.ok) return 'failed'
  } catch {
    return 'failed'
  }
  const cur = read(st)
  write({ ...cur, requested: [...(cur.requested ?? []), text].slice(-100) }, st)
  return 'sent'
}
