import type { AskRequest, AskResponse, Lang, PassageResponse, ReportRequest } from '../../../shared/api'
import { mockAnswer, mockPassage } from '../mock/data'
import { REFERRAL_Q, SUGGESTIONS } from '../mock/questions'

// Flip to live by building with VITE_ASK_MODE=live once /api/ask exists.
export const USE_MOCK = import.meta.env.VITE_ASK_MODE !== 'live'

export const ALIFTA_URL = 'https://www.alifta.gov.sa'

export type DemoKind = 'answer' | 'referral' | 'abstain' | 'rate' | 'cap' | 'server'

export class NetworkError extends Error {}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const norm = (s: string) => s.trim().toLowerCase().replace(/[؟?!.\s]+/g, ' ').trim()

const REFERRAL_PATTERNS = [/هل يجوز لي/, /في حالتي/, /طلاق/, /ميراث/, /is it permissible for me/i, /divorce/i, /inheritance/i]

function classifyMock(q: string): DemoKind {
  const n = norm(q)
  const all = Object.values(SUGGESTIONS).map((s) => norm(s[1]))
  if (all.includes(n) || /أركان الإسلام|pillars of islam/i.test(q)) return 'answer'
  if (Object.values(REFERRAL_Q).some((r) => norm(r) === n) || REFERRAL_PATTERNS.some((p) => p.test(q))) return 'referral'
  return 'abstain'
}

async function mockAsk(req: AskRequest, demo?: DemoKind): Promise<AskResponse> {
  await sleep(1400)
  const kind = demo ?? classifyMock(req.q)
  switch (kind) {
    case 'answer':
      return mockAnswer(req.lang)
    case 'referral':
      return { type: 'referral', level: 'D', message: '', link: ALIFTA_URL }
    case 'abstain':
      return { type: 'abstain', message: '', link: ALIFTA_URL }
    case 'rate':
      return { type: 'error', code: 'rate_limited', message: '' }
    case 'cap':
      return { type: 'error', code: 'monthly_cap', message: '' }
    case 'server':
      throw new NetworkError('demo')
  }
}

export async function ask(req: AskRequest, demo?: DemoKind): Promise<AskResponse> {
  if (USE_MOCK) return mockAsk(req, demo)
  let res: Response
  try {
    res = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(req),
    })
  } catch {
    throw new NetworkError('fetch failed')
  }
  try {
    return (await res.json()) as AskResponse
  } catch {
    return { type: 'error', code: 'server', message: '' }
  }
}

export async function getPassage(id: string, lang: Lang): Promise<PassageResponse | null> {
  if (USE_MOCK) return mockPassage(id, lang)
  const res = await fetch(`/api/passage/${encodeURIComponent(id)}?lang=${lang}`)
  return res.ok ? ((await res.json()) as PassageResponse) : null
}

export async function sendReport(report: ReportRequest): Promise<void> {
  if (USE_MOCK) {
    await sleep(400)
    return
  }
  await fetch('/api/report', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(report),
  })
}
