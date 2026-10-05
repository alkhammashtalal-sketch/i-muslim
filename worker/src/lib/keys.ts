// Hashing helpers. Nothing here stores or logs a question or an IP.
const enc = new TextEncoder()
const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')

export async function sha256Hex(s: string): Promise<string> {
  return hex(await crypto.subtle.digest('SHA-256', enc.encode(s)))
}

/** Device key for the daily limit: HMAC-SHA256(secret salt, IP | day). The IP never leaves this function. */
export async function deviceKey(salt: string, ip: string, day: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(salt), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return hex(await crypto.subtle.sign('HMAC', key, enc.encode(`${ip}|${day}`)))
}

/** Calendar day in Riyadh (UTC+3, no daylight saving), YYYY-MM-DD. */
export const riyadhDay = (now = Date.now()) => new Date(now + 3 * 3600_000).toISOString().slice(0, 10)
export const riyadhMonth = (now = Date.now()) => riyadhDay(now).slice(0, 7)

/** Byte-for-byte equality of two strings as UTF-8 (the "matches source" check). */
export function sameBytes(a: string, b: string): boolean {
  const x = enc.encode(a)
  const y = enc.encode(b)
  if (x.length !== y.length) return false
  for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return false
  return true
}
