// Web Push from the Worker with WebCrypto only (reply 0032 part E): the message encryption of RFC 8291 (aes128gcm,
// RFC 8188) and the VAPID authorisation of RFC 8292 (an ES256 JWT). Tested against RFC 8291 Appendix A.

const enc = new TextEncoder()

export function b64urlToBytes(s: string): Uint8Array {
  const b = atob(s.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.replace(/\s+/g, '').length + 3) % 4))
  return Uint8Array.from(b, (c) => c.charCodeAt(0))
}
export function bytesToB64url(b: Uint8Array): string {
  let s = ''
  for (const x of b) s += String.fromCharCode(x)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
const concat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let i = 0
  for (const p of parts) out.set(p, (i += p.length) - p.length)
  return out
}

/** A P-256 key pair as WebCrypto keys, from a private scalar d and the uncompressed public point (65 bytes). */
export async function importEcPair(d: Uint8Array, pub: Uint8Array, usage: 'ECDH' | 'ECDSA') {
  const jwk = { kty: 'EC', crv: 'P-256', d: bytesToB64url(d), x: bytesToB64url(pub.slice(1, 33)), y: bytesToB64url(pub.slice(33, 65)), ext: true }
  const alg = usage === 'ECDH' ? { name: 'ECDH', namedCurve: 'P-256' } : { name: 'ECDSA', namedCurve: 'P-256' }
  const privateKey = await crypto.subtle.importKey('jwk', jwk, alg, false, usage === 'ECDH' ? ['deriveBits'] : ['sign'])
  return { privateKey, publicRaw: pub }
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, bytes: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits'])
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, bytes * 8))
}

/** RFC 8291: the body of one push message (a single record, record size 4096). `fixed` is for the test vector only. */
export async function encryptPayload(
  payload: Uint8Array,
  uaPublic: Uint8Array,
  authSecret: Uint8Array,
  fixed?: { asPrivate: Uint8Array; asPublic: Uint8Array; salt: Uint8Array },
): Promise<Uint8Array> {
  let asPrivate: CryptoKey
  let asPublic: Uint8Array
  if (fixed) {
    ;({ privateKey: asPrivate, publicRaw: asPublic } = await importEcPair(fixed.asPrivate, fixed.asPublic, 'ECDH'))
  } else {
    const pair = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])) as CryptoKeyPair
    asPrivate = pair.privateKey
    asPublic = new Uint8Array((await crypto.subtle.exportKey('raw', pair.publicKey)) as ArrayBuffer)
  }
  const salt = fixed?.salt ?? crypto.getRandomValues(new Uint8Array(16))
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, [])
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey } as unknown as SubtleCryptoDeriveKeyAlgorithm, asPrivate, 256))
  const ikm = await hkdf(authSecret, ecdh, concat(enc.encode('WebPush: info\0'), uaPublic, asPublic), 32)
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16)
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12)
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt'])
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, concat(payload, new Uint8Array([2]))))
  const header = new Uint8Array(21 + asPublic.length)
  header.set(salt, 0)
  new DataView(header.buffer).setUint32(16, 4096)
  header[20] = asPublic.length
  header.set(asPublic, 21)
  return concat(header, cipher)
}

/** RFC 8292: «vapid t=<JWT>, k=<public key>» for an endpoint's origin, valid 12 hours. */
export async function vapidAuthorization(endpoint: string, vapid: { privateD: Uint8Array; publicRaw: Uint8Array; subject: string }, now = Date.now()) {
  const { privateKey } = await importEcPair(vapid.privateD, vapid.publicRaw, 'ECDSA')
  const b64json = (o: unknown) => bytesToB64url(enc.encode(JSON.stringify(o)))
  const unsigned = `${b64json({ typ: 'JWT', alg: 'ES256' })}.${b64json({ aud: new URL(endpoint).origin, exp: Math.floor(now / 1000) + 12 * 3600, sub: vapid.subject })}`
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privateKey, enc.encode(unsigned)))
  return `vapid t=${unsigned}.${bytesToB64url(sig)}, k=${bytesToB64url(vapid.publicRaw)}`
}

/** The push services we send to (no other host: the endpoint comes from the browser, never trusted as a URL). */
export const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /^updates\.push\.services\.mozilla\.com$/, /^web\.push\.apple\.com$/, /(^|\.)notify\.windows\.com$/, /(^|\.)push\.apple\.com$/]
export const allowedEndpoint = (endpoint: string) => {
  try {
    const u = new URL(endpoint)
    return u.protocol === 'https:' && PUSH_HOSTS.some((r) => r.test(u.hostname))
  } catch {
    return false
  }
}

/** Send one message; returns the push service's status (201 sent; 404/410 gone → the subscription is deleted). */
export async function sendPush(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: unknown,
  vapid: { privateD: Uint8Array; publicRaw: Uint8Array; subject: string },
  fetcher: typeof fetch = fetch,
): Promise<number> {
  if (!allowedEndpoint(sub.endpoint)) return 400
  const body = await encryptPayload(enc.encode(JSON.stringify(payload)), b64urlToBytes(sub.p256dh), b64urlToBytes(sub.auth))
  const r = await fetcher(sub.endpoint, {
    method: 'POST',
    headers: { authorization: await vapidAuthorization(sub.endpoint, vapid), 'content-encoding': 'aes128gcm', 'content-type': 'application/octet-stream', ttl: '600', urgency: 'high' },
    body,
  })
  return r.status
}
