import type { AskRequest, AskResponse, Lang, PassageResponse, ReportRequest } from '../../../shared/api'

// Production talks to the Worker. Demo data exists only for local development (VITE_ASK_MODE=mock) and is
// loaded through a dynamic import that the production build removes.
export const USE_MOCK: boolean = __ASK_MOCK__

export const ALIFTA_URL = 'https://www.alifta.gov.sa'

export type DemoKind = 'answer' | 'referral' | 'abstain' | 'rate' | 'cap' | 'server'

export class NetworkError extends Error {}

const ASK_TIMEOUT_MS = 45_000

export async function ask(req: AskRequest, demo?: DemoKind): Promise<AskResponse> {
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
    res = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(req),
      signal: AbortSignal.timeout(ASK_TIMEOUT_MS),
    })
  } catch {
    throw new NetworkError('fetch failed')
  }
  // The Worker answers every outcome (also 400/429/500/503) with an AskResponse body.
  try {
    const body = (await res.json()) as AskResponse
    if (body && typeof body === 'object' && 'type' in body) return body
  } catch {
    // fall through
  }
  return { type: 'error', code: 'server', message: '' }
}

export async function getPassage(id: string, lang: Lang): Promise<PassageResponse | null> {
  if (__ASK_MOCK__) return (await import('../mock/client')).getMockPassage(id, lang)
  try {
    const res = await fetch(`/api/passage/${encodeURIComponent(id)}`)
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
  const res = await fetch('/api/report', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(report),
  })
  if (!res.ok) throw new Error(`report failed: ${res.status}`)
}
