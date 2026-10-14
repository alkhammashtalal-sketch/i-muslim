// The adhkar's categories and today's counts on the device, shared by the screen (Adhkar.tsx) and the iOS widgets
// (reply 0046, web/src/native/widget-data.ts). Counts start again each day.
export const CATS = ['301', '465', '313', '302', '303', '306', '307', '308'] as const
/** HadeethEnc's «أذكار الصباح والمساء». */
export const MORNING_EVENING = '301'
export const ADHKAR_KEY = 'muslim.adhkar.v1'
export const adhkarToday = () => new Date().toLocaleDateString('en-CA')

export function loadCounts(): Record<string, number> {
  try {
    const v = JSON.parse(localStorage.getItem(ADHKAR_KEY) ?? '{}') as { day?: string; n?: Record<string, number> }
    return v.day === adhkarToday() ? (v.n ?? {}) : {}
  } catch {
    return {}
  }
}
export function saveCounts(n: Record<string, number>) {
  try {
    localStorage.setItem(ADHKAR_KEY, JSON.stringify({ day: adhkarToday(), n }))
  } catch {}
  // The iOS widget «أذكار الوقت» shows today's progress (reply 0046).
  window.dispatchEvent(new Event('muslim:widgets'))
}
