// DEMO ONLY: loaded by api/client.ts through a dynamic import when VITE_ASK_MODE=mock (local development).
// Never part of the production bundle.
import type { AskRequest, AskResponse, Lang, PassageResponse } from '../../../shared/api'
import { SUGGESTIONS } from '../config/suggestions'
import type { Strings } from '../i18n'
import { mockAnswer, mockPassage } from './data'
import { ABSTAIN_Q, REFERRAL_Q } from './questions'

export type DemoKind = 'answer' | 'referral' | 'abstain' | 'rate' | 'cap' | 'server'
export const ALIFTA_URL = 'https://www.alifta.gov.sa'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const norm = (s: string) => s.trim().toLowerCase().replace(/[؟?!.\s]+/g, ' ').trim()
const REFERRAL_PATTERNS = [/هل يجوز لي/, /في حالتي/, /طلاق/, /ميراث/, /is it permissible for me/i, /divorce/i, /inheritance/i]

function classify(q: string): DemoKind {
  const n = norm(q)
  if (Object.values(SUGGESTIONS).some((s) => norm(s[1]) === n) || /أركان الإسلام|pillars of islam/i.test(q)) return 'answer'
  if (Object.values(REFERRAL_Q).some((r) => norm(r) === n) || REFERRAL_PATTERNS.some((p) => p.test(q))) return 'referral'
  return 'abstain'
}

export class DemoNetworkError extends Error {}

export async function mockAsk(req: AskRequest, demo?: DemoKind): Promise<AskResponse> {
  await sleep(1400)
  switch (demo ?? classify(req.q)) {
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
      throw new DemoNetworkError('demo')
  }
}

export const getMockPassage = (id: string, lang: Lang): PassageResponse | null => mockPassage(id, lang)

export function demoQuestion(kind: DemoKind, lang: Lang, t: Strings): string {
  return {
    answer: SUGGESTIONS[lang][1],
    referral: REFERRAL_Q[lang],
    abstain: ABSTAIN_Q[lang],
    rate: t.demoRate,
    cap: t.demoCap,
    server: t.demoServer,
  }[kind]
}
