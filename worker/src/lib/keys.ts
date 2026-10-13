// Hashing helpers. Nothing here stores or logs a question or an IP.
const enc = new TextEncoder()
const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')

export async function sha256Hex(s: string): Promise<string> {
  return hex(await crypto.subtle.digest('SHA-256', enc.encode(s)))
}

/** Device key for the daily limit: HMAC-SHA256(secret salt, address | day), the address as limitAddress gives it.
 *  The IP never leaves this function. */
export async function deviceKey(salt: string, ip: string, day: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(salt), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return hex(await crypto.subtle.sign('HMAC', key, enc.encode(`${limitAddress(ip)}|${day}`)))
}

/** The eight 16-bit groups of an IPv6 address (with "::" and a dotted IPv4 tail), or null when it is not one. */
function ipv6Groups(s: string): number[] | null {
  let head = s
  let tail: number[] | null = null
  const v4 = s.match(/^(.*:)(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (v4) {
    const b = v4.slice(2, 6).map(Number)
    if (b.some((x) => x > 255)) return null
    head = `${v4[1]}0:0`
    tail = [(b[0] << 8) | b[1], (b[2] << 8) | b[3]]
  }
  const halves = head.split('::')
  if (halves.length > 2) return null
  const parse = (x: string) => (x === '' ? [] : x.split(':').map((h) => (/^[0-9a-f]{1,4}$/.test(h) ? parseInt(h, 16) : NaN)))
  const a = parse(halves[0])
  const b = halves.length === 2 ? parse(halves[1]) : []
  if ([...a, ...b].some(Number.isNaN)) return null
  const fill = halves.length === 2 ? 8 - a.length - b.length : 0
  if (halves.length === 2 ? fill < 1 : a.length !== 8) return null
  const g = [...a, ...new Array<number>(fill).fill(0), ...b]
  if (tail) [g[6], g[7]] = tail
  return g
}

/** The address the daily limits count by (reply 0033 §د). IPv4 as it is. IPv6 by its /64 prefix: a phone or a home
 *  is given a whole /64 and can change the other 64 bits at will (privacy addresses), so counting the full address
 *  would give one device as many daily allowances as it likes. An IPv4-mapped IPv6 address (::ffff:a.b.c.d) counts
 *  as its IPv4 address. Anything unreadable is used as it is. */
export function limitAddress(ip: string): string {
  const s = ip.trim().toLowerCase()
  if (!s.includes(':')) return s
  const g = ipv6Groups(s.replace(/%.*$/, ''))
  if (!g) return s
  if (g.slice(0, 5).every((x) => x === 0) && g[5] === 0xffff) return `${g[6] >> 8}.${g[6] & 255}.${g[7] >> 8}.${g[7] & 255}`
  return `${g
    .slice(0, 4)
    .map((x) => x.toString(16))
    .join(':')}::/64`
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
