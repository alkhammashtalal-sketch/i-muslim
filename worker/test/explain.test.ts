import { beforeAll, describe, expect, it, vi } from 'vitest'
import type { Env } from '../src/index'
import { buildDb, hasFullData, rawRecord, type SqliteD1 } from './d1-sqlite'
import limits from '../src/config/limits.json'

// Capture what reaches the model, while keeping the real client (mock mode).
const sent: { role: string; content: string }[][] = []
vi.mock('../src/llm', async (orig) => {
  const real = (await orig()) as typeof import('../src/llm')
  return { ...real, callLlm: (env: Env, messages: { role: 'system' | 'user'; content: string }[], ids: string[]) => (sent.push(messages), real.callLlm(env, messages, ids)) }
})

const { handleReader } = await import('../src/reader')
const { MOCK_TEXT, MOCK_TEXT_AR, quotedSacredTexts, validExplanation, explainCheck, explainMessages } = await import('../src/explain')

let db: SqliteD1
const envOf = (over: Record<string, string> = {}) =>
  ({ DB: db, LLM_MODE: 'mock', READER_EXPLAIN: 'true', IP_SALT: 'test-salt', ...over }) as unknown as Env
const call = async (env: Env, method: 'GET' | 'POST', body?: unknown, ip = '203.0.113.7') => {
  const url = new URL('https://i-muslim.test/api/explain')
  const req = new Request(url, { method, headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip }, body: body ? JSON.stringify(body) : undefined })
  const res = await handleReader(req, env, url)
  return res ? { status: res.status, body: (await res.json()) as any } : null
}

describe('validExplanation', () => {
  const ayah = 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ'
  it('accepts a plain explanation in another language', () => {
    expect(validExplanation('Allah alone deserves worship; He is the Ever-Living who never sleeps.', [ayah])).toBe(true)
  })
  it('rejects empty, too long, non-string, or a copy of four words of the ayah', () => {
    expect(validExplanation('', [ayah])).toBe(false)
    expect(validExplanation('x'.repeat(1300), [ayah])).toBe(false)
    expect(validExplanation({ text: 'x' }, [ayah])).toBe(false)
    expect(validExplanation('It says: الله لا إله إلا هو الحي القيوم, meaning…', [ayah])).toBe(false)
  })
})

describe('quotedSacredTexts', () => {
  it('refuses Latin letters inside Urdu, Hindi or Bengali, the marks U+066A/U+066C, and a copy of the English meaning (reply 0020)', () => {
    const ayah = 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ'
    expect(explainCheck('یہ آیت بتاتی ہے کہ اللہ ہی عبادت کے لائق ہے اور وہ ہمیشہ زندہ ہے۔', [ayah], { lang: 'ur' })).toBeNull()
    expect(explainCheck('یہ آیت Kursi کے بارے میں بتاتی ہے کہ اللہ ہی عبادت کے لائق ہے۔', [ayah], { lang: 'ur' })).toBe('latin_in_script')
    expect(explainCheck('اللہ تعال٬ی ہی عبادت کے لائق ہے اور ہمیشہ زندہ ہے۔', [ayah], { lang: 'ur' })).toBe('odd_marks')
    const en = 'Allah - there is no deity except Him, the Ever-Living, the Sustainer of [all] existence.'
    expect(explainCheck('This verse shows that Allah alone deserves worship and He never sleeps.', [ayah], { lang: 'en', ayahEn: en })).toBeNull()
    expect(explainCheck('It says: there is no deity except Him, the Ever-Living, the Sustainer.', [ayah], { lang: 'en', ayahEn: en })).toBe('copies_meaning_en')
    // English in the Arabic slot is now refused as the wrong language, before the English-meaning check (not run for Arabic).
    expect(explainCheck('Il dit : there is no deity except Him, the Ever-Living.', [ayah], { lang: 'ar', ayahEn: en })).toBe('not_target_language')
  })
  it('refuses a text that is not in the language asked for (reply 0021)', () => {
    const ayah = 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ'
    expect(explainCheck('This verse shows that Allah alone deserves worship and never sleeps.', [ayah], { lang: 'ar' })).toBe('not_target_language')
    expect(explainCheck('تبيّن هذه الآية أن الله وحده المستحق للعبادة، وأنه الحي القائم بتدبير خلقه.', [ayah], { lang: 'ar' })).toBeNull()
    expect(explainCheck('یہ آیت بتاتی ہے کہ اللہ ہی 崇拜 کے لائق ہے اور ہمیشہ زندہ ہے۔', [ayah], { lang: 'ur' })).toBe('wrong_script')
    expect(explainCheck('تبيّن هذه الآية أن الله وحده المستحق للعبادة، وأنه الحي القائم.', [ayah], { lang: 'en' })).toBe('not_target_language')
    expect(explainCheck('यह आयत बताती है कि केवल अल्लाह ही इबादत के योग्य है और वह सदा जीवित है।', [ayah], { lang: 'hi' })).toBeNull()
    expect(explainCheck('Bu ayet, yalnızca Allah\'ın ibadete layık olduğunu ve O\'nun hiç uyumadığını açıklar.', [ayah], { lang: 'tr' })).toBeNull()
  })
  it('the prompt asks for the third person, every definition and condition kept, and the language\'s own terms', () => {
    const ayah = 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ'
    const sys = explainMessages({ kind: 'ayah', text: 'تفسير', protectedTexts: [ayah], name: 'x', url: 'x' }, 'tr')[0].content
    expect(sys).toContain('third person')
    expect(sys).toContain('Kursi is the place of the two feet')
    expect(sys).toContain('namaz, abdest')
    expect(explainMessages({ kind: 'ayah', text: 'تفسير', protectedTexts: [ayah], name: 'x', url: 'x' }, 'ur')[0].content).toContain('never in Latin letters')
  })
  it('finds ayat in braces and hadith in quotation marks inside a book passage', () => {
    const p = 'والدليل قوله تعالى: {وَمَا خَلَقْتُ الْجِنَّ وَالْإِنْسَ إِلَّا لِيَعْبُدُونِ} وقال: "من شهد أن لا إله إلا الله" وفي الحديث: «رأس الأمر الإسلام وعموده الصلاة».'
    expect(quotedSacredTexts(p)).toEqual(['وَمَا خَلَقْتُ الْجِنَّ وَالْإِنْسَ إِلَّا لِيَعْبُدُونِ', 'من شهد أن لا إله إلا الله', 'رأس الأمر الإسلام وعموده الصلاة'])
  })
  it('a simplification that copies four words of a quoted ayah is rejected', () => {
    const quoted = quotedSacredTexts('قوله تعالى: {وَمَا خَلَقْتُ الْجِنَّ وَالْإِنْسَ إِلَّا لِيَعْبُدُونِ}')
    expect(validExplanation('خلق الله الناس لعبادته وحده، وهذا معنى الآية.', quoted)).toBe(true)
    expect(validExplanation('يقول: وما خلقت الجن والإنس إلا ليعبدون، أي ليوحدوه.', quoted)).toBe(false)
  })
})

describe.skipIf(!hasFullData)('POST /api/explain in mock mode (full data)', () => {
  beforeAll(() => {
    db = buildDb()
  })

  it('switched off → no route (404 upstream)', async () => {
    expect(await call(envOf({ READER_EXPLAIN: 'false' }), 'GET')).toBeNull()
    expect(await call(envOf({ READER_EXPLAIN: 'false' }), 'POST', { id: 'quran:2:255', lang: 'en' })).toBeNull()
  })

  it('GET tells the client it is on, and in which mode', async () => {
    expect((await call(envOf(), 'GET'))!.body).toMatchObject({ enabled: true, mode: 'mock' })
  })

  it('ayah and book-passage ids, the ten languages only; unknown ids are 404', async () => {
    for (const body of [{ id: 'quran:2:255', lang: 'xx' }, { id: 'hadith:bukhari:1', lang: 'en' }, { id: 'foo', lang: 'ar' }, {}]) {
      expect((await call(envOf(), 'POST', body))!.status).toBe(400)
    }
    expect((await call(envOf(), 'POST', { id: 'aqeedah:usul:999', lang: 'en' }))!.status).toBe(404)
  })

  it('«بسّط لي»: Arabic is accepted for an ayah and answered from al-Muyassar', async () => {
    sent.length = 0
    const r = await call(envOf(), 'POST', { id: 'quran:112:1', lang: 'ar' }, '192.0.2.10')
    expect(r!.status).toBe(200)
    expect(r!.body).toMatchObject({ text: MOCK_TEXT_AR, mock: true, source: { name: 'التفسير الميسر' } })
    expect(sent[0].map((m) => m.content).join('\n')).toContain(rawRecord('quran:112:1')!.muyassar as string)
  })

  it('a book passage (incl. «شروط الصلاة») is explained from the passage text alone, with its source', async () => {
    for (const id of ['aqeedah:usul:005', 'aqeedah:shurut:001']) {
      sent.length = 0
      const r = await call(envOf(), 'POST', { id, lang: 'en' }, '192.0.2.11')
      expect(r!.status).toBe(200)
      expect(r!.body).toMatchObject({ text: MOCK_TEXT, mock: true, source: { name: rawRecord(id)!.book, url: rawRecord(id)!.url } })
      const user = sent[0].find((m) => m.role === 'user')!.content
      expect(user).toBe(`<source>\n${rawRecord(id)!.text}\n</source>`)
    }
  })

  it('first call asks the model with al-Muyassar only; second call comes from the cache', async () => {
    sent.length = 0
    const a = await call(envOf(), 'POST', { id: 'quran:2:255', lang: 'en' })
    expect(a!.status).toBe(200)
    expect(a!.body).toMatchObject({ text: MOCK_TEXT, fromCache: false, mock: true, source: { name: 'التفسير الميسر' } })
    expect(sent).toHaveLength(1)
    const prompt = sent[0].map((m) => m.content).join('\n')
    expect(prompt).toContain(rawRecord('quran:2:255')!.muyassar as string)
    expect(prompt).not.toContain(rawRecord('quran:2:255')!.text as string)
    expect(prompt).not.toContain(rawRecord('quran:2:255')!.text_en as string)

    const b = await call(envOf(), 'POST', { id: 'quran:2:255', lang: 'en' })
    expect(b!.body).toMatchObject({ text: MOCK_TEXT, fromCache: true, mock: true })
    expect(sent).toHaveLength(1) // no second model call

    const rows = db.db.prepare("SELECT lang FROM explain_cache WHERE id = 'quran:2:255'").all() as { lang: string }[]
    expect(rows.map((r) => r.lang)).toEqual(['en~mock']) // never served once LLM_MODE=live
  })

  it('only new model calls count against the daily device limit; cached answers still work at the limit', async () => {
    const { bump } = await import('../src/ask')
    const { deviceKey, riyadhDay } = await import('../src/lib/keys')
    const ip = '198.51.100.9'
    const env = envOf()
    const count = async () =>
      (db.db.prepare('SELECT count FROM usage_daily WHERE day = ? AND ip_hash = ?').get(riyadhDay(), `ask:${await deviceKey('test-salt', ip, riyadhDay())}`) as { count: number } | undefined)?.count ?? 0
    for (let i = 0; i < 5; i++) await call(env, 'POST', { id: 'quran:1:1', lang: 'fr' }, ip)
    expect(await count()).toBe(1) // one miss, four cache hits
    while ((await count()) < limits.dailyPerDevice) await bump(env, 'test-salt', ip, 'ask')
    expect((await call(env, 'POST', { id: 'quran:112:1', lang: 'fr' }, ip))!.status).toBe(429)
    expect((await call(env, 'POST', { id: 'quran:1:1', lang: 'fr' }, ip))!.status).toBe(200)
  })

  it('in live mode, mock cache rows are not used', async () => {
    const live = await call(envOf({ LLM_MODE: 'live' }), 'POST', { id: 'quran:2:255', lang: 'en' }, '192.0.2.44')
    // No LLM_API_KEY in tests: the call fails and the route says so instead of serving the mock text.
    expect(live!.status).toBe(502)
  })
})
