// Prayer bells (reply 0032 part E): the timing for a 0.1° cell, the routes' validation, the cron. PUSH_REPORT=1 also
// writes eval/reports/push-cell-check.md: the largest difference between a cell's centre and a point 0.05° away.
import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import { dayTimes } from '../../web/src/daily/prayer'
import type { Env } from '../src/index'
import { handlePush, runDue } from '../src/push/routes'
import { localInstant, nextBell, validCell } from '../src/push/schedule'
import { pushMessage } from '../src/push/strings'
import { bytesToB64url } from '../src/push/webpush'
import { SqliteD1 } from './d1-sqlite'

const MIG = fs.readFileSync(path.resolve(import.meta.dirname, '../migrations/0011_push.sql'), 'utf8')
const base = { cell_lat: 24.7, cell_lng: 46.7, tz: 'Asia/Riyadh', method: 'UmmAlQura', asr: 'shafi', adjust: '{}', prayers: '["fajr","maghrib"]', ward: null as string | null }

describe('timing', () => {
  it('the next enabled bell after now, rolling to tomorrow', () => {
    const t = dayTimes({ lat: 24.7, lng: 46.7 }, { y: 2026, m: 10, d: 15 })
    expect(nextBell(base, new Date(t.fajr.getTime() - 60_000))).toEqual({ at: t.fajr.getTime(), kind: 'fajr' })
    expect(nextBell(base, new Date(t.fajr.getTime() + 60_000))).toEqual({ at: t.maghrib.getTime(), kind: 'maghrib' })
    const tomorrow = dayTimes({ lat: 24.7, lng: 46.7 }, { y: 2026, m: 10, d: 16 })
    expect(nextBell(base, new Date(t.maghrib.getTime() + 60_000))).toEqual({ at: tomorrow.fajr.getTime(), kind: 'fajr' })
    expect(nextBell({ ...base, prayers: '[]' }, new Date())).toBeNull()
  })
  it('the daily portion at its local time, in the subscription zone', () => {
    const at = localInstant({ y: 2026, m: 10, d: 15 }, '21:30', 'Asia/Riyadh')
    expect(at.toISOString()).toBe('2026-10-15T18:30:00.000Z')
    expect(localInstant({ y: 2026, m: 7, d: 1 }, '08:00', 'Europe/London').toISOString()).toBe('2026-07-01T07:00:00.000Z')
    const n = nextBell({ ...base, prayers: '[]', ward: '21:30' }, new Date('2026-10-15T12:00:00Z'))
    expect(n).toEqual({ at: at.getTime(), kind: 'ward' })
  })
  it('the portion «after Isha» rings 30 minutes after Isha', () => {
    const t = dayTimes({ lat: 24.7, lng: 46.7 }, { y: 2026, m: 10, d: 15 })
    expect(nextBell({ ...base, prayers: '[]', ward: 'after_isha' }, new Date(t.maghrib.getTime()))).toEqual({ at: t.isha.getTime() + 30 * 60_000, kind: 'ward' })
  })
  it('a cell is 0.1° at most precise', () => {
    expect(validCell(24.7, 46.7)).toBe(true)
    expect(validCell(-33.9, 151.2)).toBe(true)
    for (const [a, b] of [[24.69, 46.7], [24.7, 46.72], [91, 0], ['24.7', 46.7]]) expect(validCell(a, b)).toBe(false)
  })
  it('texts in the interface language, no sacred text', () => {
    expect(pushMessage('ar', 'fajr').body).toBe('حان وقت صلاة الفجر')
    expect(pushMessage('en', 'ward').url).toBe('/quran/ward') // the portion's page (reply 0037 §3.7)
    expect(pushMessage('xx', 'asr').body).toBe('حان وقت صلاة العصر')
  })
})

async function keys() {
  const pair = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign'])) as CryptoKeyPair
  const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey)
  const pub = new Uint8Array((await crypto.subtle.exportKey('raw', pair.publicKey)) as ArrayBuffer)
  return { VAPID_PUBLIC_KEY: bytesToB64url(pub), VAPID_PRIVATE_KEY: jwk.d! }
}
async function uaKeys() {
  const ua = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])) as CryptoKeyPair
  return { p256dh: bytesToB64url(new Uint8Array((await crypto.subtle.exportKey('raw', ua.publicKey)) as ArrayBuffer)), auth: bytesToB64url(crypto.getRandomValues(new Uint8Array(16))) }
}
function envWith(extra: Record<string, string> = {}) {
  const db = new DatabaseSync(':memory:')
  db.exec(MIG)
  // A subscribe counts against the device's day (reply 0033 §د): the counter table of migration 0001 and the salt.
  db.exec('CREATE TABLE usage_daily (day TEXT NOT NULL, ip_hash TEXT NOT NULL, count INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (day, ip_hash))')
  return { env: { DB: new SqliteD1(db), IP_SALT: 'test-salt', ...extra } as unknown as Env, db }
}
const post = (env: Env, p: string, body: unknown) => {
  const url = new URL(`https://x.test${p}`)
  return handlePush(new Request(url, { method: 'POST', body: JSON.stringify(body) }), env, url)
}

describe('routes', () => {
  it('404 everywhere until VAPID is configured (the bells stay hidden)', async () => {
    const { env } = envWith()
    const url = new URL('https://x.test/api/push/key')
    expect((await handlePush(new Request(url), env, url))!.status).toBe(404)
  })
  it('subscribe stores the cell, never a finer position; unsubscribe deletes the row', async () => {
    const { env, db } = envWith(await keys())
    const ua = await uaKeys()
    const sub = { endpoint: 'https://fcm.googleapis.com/fcm/send/abc', keys: ua }
    const good = { subscription: sub, cell: { lat: 24.7, lng: 46.7 }, tz: 'Asia/Riyadh', method: 'UmmAlQura', asr: 'shafi', prayers: ['fajr', 'isha'], ward: null, lang: 'ar' }
    expect((await post(env, '/api/push/subscribe', { ...good, cell: { lat: 24.6877, lng: 46.7219 } }))!.status).toBe(400)
    expect((await post(env, '/api/push/subscribe', { ...good, subscription: { ...sub, endpoint: 'https://evil.example/x' } }))!.status).toBe(400)
    expect((await post(env, '/api/push/subscribe', good))!.status).toBe(200)
    const row = db.prepare('SELECT * FROM push_subs').get() as Record<string, unknown>
    expect([row.cell_lat, row.cell_lng, row.tz, row.prayers]).toEqual([24.7, 46.7, 'Asia/Riyadh', '["fajr","isha"]'])
    expect(Object.keys(row).sort()).toEqual(['adjust', 'asr', 'auth', 'cell_lat', 'cell_lng', 'endpoint', 'id', 'lang', 'method', 'next_at', 'next_kind', 'p256dh', 'prayers', 'tz', 'ward'])
    expect((await post(env, '/api/push/unsubscribe', { endpoint: sub.endpoint }))!.status).toBe(200)
    expect(db.prepare('SELECT count(*) n FROM push_subs').get()).toEqual({ n: 0 })
  })
  it('the cron sends what is due, reschedules, deletes a gone subscription, skips a bell missed by over 15 minutes', async () => {
    const { env, db } = envWith(await keys())
    const ua = await uaKeys()
    const now = new Date('2026-10-15T12:00:00Z')
    const ins = db.prepare("INSERT INTO push_subs VALUES (?, ?, ?, ?, 24.7, 46.7, 'Asia/Riyadh', 'UmmAlQura', 'shafi', '{}', '[\"fajr\",\"maghrib\"]', NULL, 'ar', ?, 'maghrib')")
    ins.run('a', 'https://fcm.googleapis.com/fcm/send/a', ua.p256dh, ua.auth, now.getTime() - 30_000)
    ins.run('b', 'https://fcm.googleapis.com/fcm/send/b', ua.p256dh, ua.auth, now.getTime() - 60_000)
    ins.run('c', 'https://fcm.googleapis.com/fcm/send/c', ua.p256dh, ua.auth, now.getTime() - 20 * 60_000)
    ins.run('d', 'https://fcm.googleapis.com/fcm/send/d', ua.p256dh, ua.auth, now.getTime() + 3_600_000)
    const sent: string[] = []
    const fake = async (s: { endpoint: string }) => (sent.push(s.endpoint), s.endpoint.endsWith('/b') ? 410 : 201)
    expect(await runDue(env, now, fake as never)).toEqual({ sent: 1, gone: 1, skipped: 1 })
    expect(sent.sort()).toEqual(['https://fcm.googleapis.com/fcm/send/a', 'https://fcm.googleapis.com/fcm/send/b'])
    const left = db.prepare('SELECT id, next_at FROM push_subs ORDER BY id').all() as { id: string; next_at: number }[]
    expect(left.map((r) => r.id)).toEqual(['a', 'c', 'd'])
    for (const r of left) expect(r.next_at).toBeGreaterThan(now.getTime())
  })
})

describe('a cell versus the exact place', () => {
  const CITIES: [string, number, number][] = [
    ['مكة', 21.4266, 39.8256], ['المدينة', 24.4686, 39.6142], ['الرياض', 24.6877, 46.7219], ['جدة', 21.4901, 39.1862],
    ['الدمام', 26.4344, 50.1033], ['أبها', 18.2164, 42.5053], ['تبوك', 28.3998, 36.5715], ['حائل', 27.5219, 41.6907],
  ]
  const DATES = [{ y: 2026, m: 10, d: 15 }, { y: 2027, m: 2, d: 20 }, { y: 2027, m: 6, d: 21 }, { y: 2026, m: 12, d: 21 }]
  const KEYS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const
  const rows: string[] = []
  let worst = 0
  for (const [name, lat, lng] of CITIES) {
    const c = { lat: Math.round(lat * 10) / 10, lng: Math.round(lng * 10) / 10 }
    let m = 0
    for (const d of DATES) {
      const center = dayTimes(c, d)
      for (const [dl, dg] of [[0.05, 0.05], [0.05, -0.05], [-0.05, 0.05], [-0.05, -0.05]]) {
        const p = dayTimes({ lat: c.lat + dl, lng: c.lng + dg }, d)
        for (const k of KEYS) m = Math.max(m, Math.abs(p[k].getTime() - center[k].getTime()) / 60_000)
      }
    }
    worst = Math.max(worst, m)
    rows.push(`| ${name} | ${c.lat}, ${c.lng} | ${m} |`)
  }
  it('the largest difference stays within a minute or two', () => {
    expect(worst).toBeLessThanOrEqual(2)
  })
  it.runIf(process.env.PUSH_REPORT)('writes eval/reports/push-cell-check.md', () => {
    fs.writeFileSync(
      path.resolve(import.meta.dirname, '../../eval/reports/push-cell-check.md'),
      [
        '# الجرس: وقت الخانة (0.1°) مقابل المكان الدقيق (رد 0032، الجزء هـ)',
        '',
        'لكل مدينة: مركز خانتها، ثم النقاط الأربع على بعد ±0.05° في العرض والطول (أبعد ما يكون مكان داخل الخانة)، في أربعة تواريخ (15 أكتوبر 2026، و20 فبراير 2027 في رمضان، و21 يونيو 2027، و21 ديسمبر 2026)، للأوقات الست بأم القرى (adhan 4.4.4، مقرّبة للدقيقة).',
        '',
        '| المدينة | مركز الخانة | أكبر فرق (دقائق) |',
        '| --- | --- | --- |',
        ...rows,
        '',
        `أكبر فرق في كل المدن: ${worst} دقيقة.`,
        '',
      ].join('\n'),
    )
  })
})
