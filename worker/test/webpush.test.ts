// Web Push encryption against RFC 8291 Appendix A, and the VAPID JWT shape (RFC 8292), with WebCrypto.
import { describe, expect, it } from 'vitest'
import { allowedEndpoint, b64urlToBytes, bytesToB64url, encryptPayload, vapidAuthorization } from '../src/push/webpush'

const A = {
  plaintext: 'V2hlbiBJIGdyb3cgdXAsIEkgd2FudCB0byBiZSBhIHdhdGVybWVsb24',
  asPublic: 'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8',
  asPrivate: 'yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw',
  uaPublic: 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4',
  salt: 'DGv6ra1nlYgDCS1FRnbzlw',
  auth: 'BTBZMqHH6r4Tts7J_aSIgg',
  header: 'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8',
  ciphertext: '8pfeW0KbunFT06SuDKoJH9Ql87S1QUrdirN6GcG7sFz1y1sqLgVi1VhjVkHsUoEsbI_0LpXMuGvnzQ',
}

describe('Web Push (RFC 8291, RFC 8292)', () => {
  it('encrypts the RFC 8291 example to its exact header and ciphertext', async () => {
    const body = await encryptPayload(b64urlToBytes(A.plaintext), b64urlToBytes(A.uaPublic), b64urlToBytes(A.auth), {
      asPrivate: b64urlToBytes(A.asPrivate),
      asPublic: b64urlToBytes(A.asPublic),
      salt: b64urlToBytes(A.salt),
    })
    expect(bytesToB64url(body.slice(0, 86))).toBe(A.header)
    expect(bytesToB64url(body.slice(86))).toBe(A.ciphertext)
  })
  it('a VAPID header: ES256 JWT for the endpoint origin, signature that verifies, and the public key', async () => {
    const pair = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])) as CryptoKeyPair
    const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey)
    const pub = new Uint8Array((await crypto.subtle.exportKey('raw', pair.publicKey)) as ArrayBuffer)
    const h = await vapidAuthorization('https://fcm.googleapis.com/fcm/send/abc', { privateD: b64urlToBytes(jwk.d!), publicRaw: pub, subject: 'mailto:test@example.com' }, 1_700_000_000_000)
    const m = h.match(/^vapid t=([^.]+)\.([^.]+)\.([^,]+), k=(.+)$/)!
    expect(JSON.parse(atob(m[2].replace(/-/g, '+').replace(/_/g, '/')))).toEqual({ aud: 'https://fcm.googleapis.com', exp: 1_700_000_000 + 43200, sub: 'mailto:test@example.com' })
    expect(m[4]).toBe(bytesToB64url(pub))
    const ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, pair.publicKey, b64urlToBytes(m[3]), new TextEncoder().encode(`${m[1]}.${m[2]}`))
    expect(ok).toBe(true)
  })
  it('only the known push services are reachable', () => {
    for (const ok of ['https://fcm.googleapis.com/fcm/send/x', 'https://web.push.apple.com/abc', 'https://updates.push.services.mozilla.com/wpush/v2/x']) expect(allowedEndpoint(ok)).toBe(true)
    for (const bad of ['http://fcm.googleapis.com/x', 'https://example.com/x', 'https://fcm.googleapis.com.evil.com/x', 'not a url']) expect(allowedEndpoint(bad)).toBe(false)
  })
})
