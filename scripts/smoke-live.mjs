// Smoke test of the live link after each deploy (reviewer's reply 0018). One command, a pass/fail table, exit code 1
// on any failure.
//
//   node scripts/smoke-live.mjs [--base https://…] [--no-ask]
//
// What it sends: GET requests only, plus five questions to POST /api/ask (under the daily limit of 40). Those count in
// the device's daily counter and an answer of levels A/B may be cached, as for any visitor; the script writes nothing
// else. --no-ask skips the five questions (checks 4–8 and 10). Check 9 renders the page in Google Chrome when available.
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const opt = (k) => {
  const i = args.indexOf(`--${k}`)
  return i >= 0 ? args[i + 1] : undefined
}
const BASE = (opt('base') ?? 'https://i-muslim.alkhammashtalal.workers.dev').replace(/\/$/, '')
const ASK = !args.includes('--no-ask')
// JavaScript's \b knows Latin letters only, so the end of the name is a look-ahead.
const OLD_NAME = /(^|[^A-Za-z])i (مسلم|Muslim)(?![A-Za-z])|iMuslim/

const rows = []
const add = (n, name, result, detail = '') => rows.push({ n, name, result, detail: String(detail).replace(/\s+/g, ' ').slice(0, 140) })
const get = (p) => fetch(`${BASE}${p}`, { redirect: 'follow' })
const ask = async (q, lang) => {
  const r = await fetch(`${BASE}/api/ask`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ q, lang }) })
  return r.json()
}
// A cached answer keeps the passages of the retrieval that produced it; the table says so.
const cached = (b) => (b.fromCache ? ' (من الكاش)' : '')
const passageText = async (id) => {
  const r = await get(`/api/passage/${encodeURIComponent(id)}`)
  return r.ok ? (await r.json()).text : null
}
const safe = async (n, name, fn) => {
  try {
    await fn()
  } catch (e) {
    add(n, name, 'FAIL', e.message)
  }
}

// 1. The welcome page and the manifest: the name «مسلم», never the old name.
await safe(1, 'الصفحة الرئيسية والاسم', async () => {
  const r = await get('/')
  const html = await r.text()
  const man = await (await get('/manifest.webmanifest')).text()
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1]
  const ok = r.ok && title === 'مسلم' && !OLD_NAME.test(html) && !OLD_NAME.test(man) && JSON.parse(man).name === 'مسلم'
  add(1, 'الصفحة الرئيسية والاسم', ok ? 'PASS' : 'FAIL', `HTTP ${r.status}; title «${title}»; manifest «${JSON.parse(man).name}»${OLD_NAME.test(html + man) ? '; الاسم القديم موجود' : ''}`)
})

// 2. Health, and the admin routes closed.
await safe(2, '/api/health والمسارات الإدارية', async () => {
  const h = await get('/api/health')
  const body = await h.json().catch(() => ({}))
  const admin = await Promise.all([
    fetch(`${BASE}/api/admin/retrieve`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }),
    get('/api/admin/models'),
  ])
  const closed = admin.every((r) => r.status === 404)
  add(2, '/api/health والمسارات الإدارية', h.ok && body.ok === true && closed ? 'PASS' : 'FAIL', `health ${h.status} ok=${body.ok}; admin ${admin.map((r) => r.status).join('/')} (المتوقع 404)`)
})

// 3. Security headers from web/public/_headers (static files) and worker/src/security.ts (/api).
await safe(3, 'الرؤوس الأمنية', async () => {
  const want = {
    'content-security-policy': "default-src 'self'",
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    'permissions-policy': 'microphone=(self)',
    'x-frame-options': 'DENY',
    'strict-transport-security': 'max-age=',
  }
  const missing = []
  for (const p of ['/', '/api/health']) {
    const h = (await get(p)).headers
    for (const [k, v] of Object.entries(want)) if (!(h.get(k) ?? '').includes(v)) missing.push(`${p} ${k}`)
  }
  add(3, 'الرؤوس الأمنية', missing.length ? 'FAIL' : 'PASS', missing.length ? `ناقص: ${missing.join('، ')}` : 'الستة في الصفحة وفي /api')
})

let mode = null
if (ASK) {
  // 4. A level-A question: an answer whose quoted text equals the stored text byte for byte.
  await safe(4, 'سؤال أ ← إجابة بشاهد مطابق', async () => {
    const b = await ask('ما أركان الإسلام؟', 'ar')
    const q = b.quotes?.[0]
    const same = q ? Buffer.from(q.text).equals(Buffer.from((await passageText(q.id)) ?? '')) : false
    add(4, 'سؤال أ ← إجابة بشاهد مطابق', b.type === 'answer' && same ? 'PASS' : 'FAIL', `${b.type}${cached(b)}; ${q ? `${q.id} ${same ? 'مطابق' : 'غير مطابق'} لـ D1` : 'بلا شاهد'}`)
    if (JSON.stringify(b).includes('وضع المحاكاة')) mode = 'mock'
  })
  // 5. A personal case (the README example): a referral.
  await safe(5, 'سؤال د ← إحالة', async () => {
    const b = await ask('هل يجوز لي أن أفطر في رمضان لأني مريض؟', 'ar')
    add(5, 'سؤال د ← إحالة', b.type === 'referral' ? 'PASS' : 'FAIL', `${b.type}${b.level ? ` ${b.level}` : ''}`)
  })
  // 6. Out of scope: an apology.
  await safe(6, 'خارج النطاق ← اعتذار', async () => {
    const b = await ask('ما عاصمة اليابان؟', 'ar')
    add(6, 'خارج النطاق ← اعتذار', b.type === 'abstain' ? 'PASS' : 'FAIL', b.type)
  })
  // 7. «ما شروط الصلاة؟»: a passage of «شروط الصلاة وأركانها» among those sent to the model (or shown).
  await safe(7, '«ما شروط الصلاة؟» ← مقطع من الرسالة', async () => {
    const b = await ask('ما شروط الصلاة؟', 'ar')
    const ids = [...(b.considered ?? []), ...(b.quotes ?? []).map((q) => q.id)]
    const hit = ids.find((id) => id.startsWith('aqeedah:shurut:'))
    add(7, '«ما شروط الصلاة؟» ← مقطع من الرسالة', hit ? 'PASS' : 'FAIL', (hit ? `${hit} بين المقاطع` : `المقاطع: ${[...new Set(ids)].join('، ') || '—'}`) + cached(b))
  })
  // 8. A question in English: the answer is in English.
  await safe(8, 'سؤال بالإنجليزية ← answer_lang=en', async () => {
    const b = await ask('What are the pillars of Islam?', 'en')
    const lang = (b.answer_lang ?? '').split('-')[0]
    add(8, 'سؤال بالإنجليزية ← answer_lang=en', b.type === 'answer' && lang === 'en' ? 'PASS' : 'FAIL', `${b.type}${cached(b)}; answer_lang=${b.answer_lang ?? '—'}`)
  })
}

// 9. /quran/2/255 loads, and Ayat al-Kursi on the page equals the text in D1.
await safe(9, '/quran/2/255 ونص آية الكرسي', async () => {
  const page = await get('/quran/2/255')
  const d1 = await passageText('quran:2:255')
  let shown = null
  try {
    const { chromium } = createRequire(path.join(ROOT, 'web/package.json'))('@playwright/test')
    const b = await chromium.launch({ channel: 'chrome', headless: true })
    const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' })).newPage()
    await p.goto(`${BASE}/quran/2/255?lang=ar`, { waitUntil: 'domcontentloaded' })
    await p.waitForSelector('dialog.sheet[open] .sacred', { timeout: 30000 })
    // The ayah marker (a no-break space and the number) follows the text: strip it before comparing.
    shown = (await p.textContent('dialog.sheet[open] .sacred')).replace(/ [٠-٩]+\s*$/, '')
    await b.close()
  } catch (e) {
    shown = `render failed: ${e.message.split('\n')[0]}`
  }
  const same = typeof d1 === 'string' && shown === d1
  add(9, '/quran/2/255 ونص آية الكرسي', page.ok && same ? 'PASS' : 'FAIL', `HTTP ${page.status}; ${same ? 'النص المعروض مطابق لـ D1' : `غير مطابق (${String(shown).slice(0, 60)})`}`)
})

// 10. Which model answered: the live model or the mock.
if (ASK) {
  await safe(10, 'وضع النموذج', async () => {
    const r = await get('/api/explain')
    const m = r.ok ? (await r.json()).mode : null
    const which = m ?? mode ?? 'live'
    add(10, 'وضع النموذج', which === 'live' ? 'PASS' : 'WARN', which === 'live' ? 'النموذج الحي' : 'وضع المحاكاة: الإجابات ليست من النموذج الحي')
  })
}

console.log(`\nفحص ${BASE} — ${new Date().toISOString()}${ASK ? '' : ' (بلا أسئلة: --no-ask)'}\n`)
console.log('| # | الفحص | النتيجة | التفصيل |')
console.log('| --- | --- | --- | --- |')
for (const r of rows.sort((a, b) => a.n - b.n)) console.log(`| ${r.n} | ${r.name} | ${r.result} | ${r.detail} |`)
const failed = rows.filter((r) => r.result === 'FAIL').length
console.log(`\n${rows.filter((r) => r.result === 'PASS').length} PASS · ${failed} FAIL · ${rows.filter((r) => r.result === 'WARN').length} WARN`)
process.exit(failed ? 1 : 0)
