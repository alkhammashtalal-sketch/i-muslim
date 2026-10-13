// The sources page's two calls (reply 0033 §أ3): the live facts (GET /api/sources/status) and «أبلغ عن خطأ» (POST
// /api/report with `kind`). Nothing else leaves the device: no identifier, and the place is the one shown in the form.
import type { SourceReportRequest, SourcesStatus } from '../../../../shared/api'

const memo = new Map<string, Promise<SourcesStatus>>()

/** The last monthly check, the updates waiting, and the reader's language versions; cached for the session. */
export function getSourcesStatus(lang: string): Promise<SourcesStatus> {
  let p = memo.get(lang)
  if (!p) {
    p = fetch(`/api/sources/status?lang=${encodeURIComponent(lang)}`).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return r.json() as Promise<SourcesStatus>
    })
    p.catch(() => memo.delete(lang))
    memo.set(lang, p)
  }
  return p
}

export type SendOutcome = 'sent' | 'limited' | 'failed'

export async function sendSourceReport(body: SourceReportRequest): Promise<SendOutcome> {
  try {
    const r = await fetch('/api/report', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    return r.ok ? 'sent' : r.status === 429 ? 'limited' : 'failed'
  } catch {
    return 'failed'
  }
}
