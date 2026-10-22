import type { AskRequest, AskResponse, Lang, PassageResponse, PendingResponse, ReportRequest } from '../../../shared/api'
import { api } from './base'

// Production talks to the Worker. Demo data exists only for local development (VITE_ASK_MODE=mock) and is
// loaded through a dynamic import that the production build removes.
export const USE_MOCK: boolean = __ASK_MOCK__

export const ALIFTA_URL = 'https://www.alifta.gov.sa'

export type DemoKind = 'answer' | 'referral' | 'abstain' | 'rate' | 'cap' | 'server'

export class NetworkError extends Error {}

const ASK_TIMEOUT_MS = 45_000

// Questions in review (add-ons 0071-add3 §1 and 0071-add4 §3; worker/src/queue.ts): the server keeps each with an id until
// its answer is made, and the answer for a week. Their ids stay on this device until the answers come, so leaving the
// screen, closing the app or losing the connection loses nothing: the app asks by the id when it is back. Each poll waits
// on the server for the answer (up to POLL_WAIT_MS); a poll that fails is tried again with growing waits, in silence,
// as long as the app is open. Nothing here is shown as waiting: no place in line, no time, no button to try again.
const PENDING_KEY = 'ask.pending'
const PENDING_KEEP_MS = 7 * 86_400_000
const POLL_WAIT_MS = 20_000
export type PendingAsk = { id: string; q: string; at: number }

/** The questions of this device still in review, oldest first. */
export function pendingAsks(): PendingAsk[] {
  try {
    const all = JSON.parse(localStorage.getItem(PENDING_KEY) ?? '[]') as PendingAsk[]
    return Array.isArray(all) ? all.filter((p) => p && typeof p.id === 'string' && typeof p.q === 'string' && p.at > Date.now() - PENDING_KEEP_MS) : []
  } catch {
    return []
  }
}
function savePending(all: PendingAsk[]) {
  try {
    if (all.length) localStorage.setItem(PENDING_KEY, JSON.stringify(all))
    else localStorage.removeItem(PENDING_KEY)
  } catch {
    // A private window: the answer still comes while the app is open.
  }
}
const keepPending = (p: PendingAsk) => savePending([...pendingAsks().filter((x) => x.id !== p.id), p])
const dropPending = (id: string) => savePending(pendingAsks().filter((x) => x.id !== id))

/** The answer of a question in review, by its id: final once the server has made it (a 404: the id is past its week). */
export async function awaitAnswer(id: string): Promise<AskResponse> {
  for (let fails = 0; ; ) {
    try {
      const res = await fetch(api(`/api/ask/job/${encodeURIComponent(id)}?wait=${POLL_WAIT_MS}`), {
        cache: 'no-store',
        signal: AbortSignal.timeout(POLL_WAIT_MS + 15_000),
      })
      if (res.status === 404) {
        dropPending(id)
        return { type: 'error', code: 'server', message: '' }
      }
      const body = (await res.json()) as AskResponse | PendingResponse
      if (body && typeof body === 'object' && 'type' in body) {
        if (body.type === 'pending') {
          fails = 0
          continue
        }
        dropPending(id)
        return body
      }
    } catch {
      // No connection, or an answer that did not arrive whole: asked again below.
    }
    fails++
    await new Promise((r) => setTimeout(r, Math.min(1000 * 2 ** Math.min(fails - 1, 4), 15_000)))
  }
}

/** `onStage`: told 'review' when the search is done and the texts are in review (the question waits for the model). */
export async function ask(req: AskRequest, demo?: DemoKind, onStage?: (stage: 'review') => void): Promise<AskResponse> {
  if (__ASK_MOCK__) {
    const m = await import('../mock/client')
    try {
      return await m.mockAsk(req, demo)
    } catch {
      throw new NetworkError('demo')
    }
  }
  let res: Response
  try {
    res = await fetch(api('/api/ask'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      // canWait: this app knows «in review» and asks by the id.
      body: JSON.stringify({ ...req, canWait: true }),
      signal: AbortSignal.timeout(ASK_TIMEOUT_MS),
    })
  } catch {
    throw new NetworkError('fetch failed')
  }
  // The Worker answers every outcome (also 400/429/500/503) with an AskResponse body, or «in review» with an id.
  let body: AskResponse | PendingResponse | null = null
  try {
    body = (await res.json()) as AskResponse | PendingResponse
  } catch {
    // fall through
  }
  if (!body || typeof body !== 'object' || !('type' in body)) return { type: 'error', code: 'server', message: '' }
  if (body.type !== 'pending') return body
  keepPending({ id: body.id, q: req.q, at: Date.now() })
  onStage?.('review')
  return awaitAnswer(body.id)
}

export async function getPassage(id: string, lang: Lang): Promise<PassageResponse | null> {
  if (__ASK_MOCK__) return (await import('../mock/client')).getMockPassage(id, lang)
  try {
    const res = await fetch(api(`/api/passage/${encodeURIComponent(id)}`))
    return res.ok ? ((await res.json()) as PassageResponse) : null
  } catch {
    return null
  }
}

/** Throws when the report could not be delivered, so the sheet can say so instead of thanking. */
export async function sendReport(report: ReportRequest): Promise<void> {
  if (__ASK_MOCK__) {
    await new Promise((r) => setTimeout(r, 400))
    return
  }
  const res = await fetch(api('/api/report'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(report),
  })
  if (!res.ok) throw new Error(`report failed: ${res.status}`)
}
