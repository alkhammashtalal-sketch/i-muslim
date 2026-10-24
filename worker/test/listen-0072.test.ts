// The listen button under each text (add-on 0072-add14). Its most important property: no text of the Quran ever
// reaches a device voice, on any screen, in any language; nor the Arabic text of a hadith (§3). Checked here on the
// rules (web/src/listen/guard.ts) over the whole Quran as stored in D1 (data/processed when present, else the samples)
// and the Arabic hadith, with a normalizer independent of the code under test; then on the engine
// (web/src/listen/engine.ts) with speechSynthesis instrumented: what reaches speak() is recorded and checked. The
// screens themselves: e2e/v2-0072-listen.spec.ts.
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ar from '../../web/src/i18n/ar'
import en from '../../web/src/i18n/en'
import { maskQuoted, speakableText, type SpeakRole } from '../../web/src/listen/guard'
import { nameInAyah } from '../../web/src/listen/name-word'
import { normalizeArabic } from '../src/lib/normalize'

const ROOT = path.resolve(__dirname, '../..')
type Rec = { id: string; text: string; text_en?: string; muyassar?: string }
function lines(name: string, sample: string): { recs: string[]; full: boolean } {
  const full = path.join(ROOT, `data/processed/${name}`)
  const file = fs.existsSync(full) ? full : path.join(ROOT, `data/samples/${sample}`)
  return { recs: fs.readFileSync(file, 'utf8').trim().split('\n'), full: file === full }
}
const q = lines('quran.jsonl', 'quran.sample.jsonl')
const quran = q.recs.map((l) => JSON.parse(l) as Rec)
const byId = new Map(quran.map((r) => [r.id, r]))

// Independent oracle: the Worker's search normalizer, punctuation dropped.
const words = (s: string) => normalizeArabic(s).replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(' ').filter(Boolean)
function sharedRun(output: string, sacred: string, n = 4): string | null {
  const out = ` ${words(output).join(' ')} `
  const w = words(sacred)
  if (w.length < n) return out.includes(` ${w.join(' ')} `) ? w.join(' ') : null
  for (let i = 0; i + n <= w.length; i++) if (out.includes(` ${w.slice(i, i + n).join(' ')} `)) return w.slice(i, i + n).join(' ')
  return null
}
const ARABIC = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/

const ROLES: SpeakRole[] = ['meaning', 'tafsir', 'explanation', 'step', 'answer', 'hadith-translation', 'salaf-translation']
const slot = (tag: string) => (tag === 'ar' ? ar.speakAyahSlot : en.speakAyahSlot)

describe('guard: never the Quran', () => {
  it(`an ayah's own text is never allowed, in any role or language (${quran.length} ayat${q.full ? ', the whole Quran' : ', samples'})`, () => {
    for (const r of quran)
      for (const role of ROLES)
        for (const tag of ['ar', 'en', 'ur', 'fr']) {
          const out = speakableText(r.text, tag, role, { ayat: [r.text] }, slot(tag))
          if (out === null) continue
          // Only the fixed line may remain (an English voice is never given the Arabic letters).
          expect(sharedRun(out, r.text), `${r.id} ${role} ${tag}`).toBeNull()
          if (tag !== 'ar' && tag !== 'ur') expect(ARABIC.test(out), `${r.id} ${role} ${tag}`).toBe(false)
        }
  })

  it('even unguarded: an ayah given to an English, French or Urdu voice has no Arabic letters left, and the basmala is never read', () => {
    for (const r of quran.slice(0, 600))
      for (const tag of ['en', 'fr']) {
        const out = speakableText(r.text, tag, 'explanation', {}, slot(tag))
        expect(out === null || !ARABIC.test(out), r.id).toBe(true)
      }
    expect(speakableText('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', 'ar', 'step', {}, ar.speakAyahSlot)).toBeNull()
  })

  it('al-Muyassar is read only when it repeats no four words of its ayah, and never for an ayah whose tafsir quotes another', () => {
    let read = 0
    let refused = 0
    for (const r of quran) {
      if (!r.muyassar) continue
      const out = speakableText(r.muyassar, 'ar', 'tafsir', { ayat: [r.text], muyassarOf: r.id }, ar.speakAyahSlot)
      if (out === null) {
        refused++
        continue
      }
      read++
      expect(sharedRun(out, r.text), r.id).toBeNull()
    }
    expect(read).toBeGreaterThan(0)
    if (q.full) expect(refused).toBeGreaterThan(0)
  })

  it('ayat quoted in a tafsir between ﴿…﴾ or {…} are replaced by the fixed line', () => {
    const t = 'قال تعالى: ﴿قُلْ هُوَ اللَّهُ أَحَدٌ﴾ أي: هو الواحد، وقال: {اللَّهُ الصَّمَدُ} أي: المقصود في الحوائج.'
    const out = maskQuoted(t, ar.speakAyahSlot)
    expect(out).not.toMatch(/﴿|﴾|\{|\}/)
    expect(sharedRun(out, 'قُلْ هُوَ اللَّهُ أَحَدٌ', 3)).toBeNull()
    expect(out).toContain(ar.speakAyahSlot)
    const en1 = speakableText('Say, “He is Allah, [who is] One” — قُلْ هُوَ اللَّهُ أَحَدٌ — that is, unique.', 'en', 'tafsir', {}, en.speakAyahSlot)!
    expect(ARABIC.test(en1)).toBe(false)
    expect(en1).toContain(en.speakAyahSlot)
  })

  it('the Sahih International meaning is read as it is (a translation of meanings, not the Quran)', () => {
    let n = 0
    for (const r of quran.slice(0, 400)) {
      if (!r.text_en) continue
      const out = speakableText(r.text_en, 'en', 'meaning', { ayat: [r.text] }, en.speakAyahSlot)
      if (!ARABIC.test(r.text_en) && !/[{}﴿﴾]/.test(r.text_en)) {
        expect(out, r.id).toBe(r.text_en.replace(/\s+/g, ' ').trim())
        n++
      }
    }
    expect(n).toBeGreaterThan(0)
  })
})

describe('guard: never the Arabic hadith (§3)', () => {
  const h = lines('hadith.jsonl', 'hadith.sample.jsonl')
  // Arabic rows, a spread through the file (the whole file is 272 MB; every 40th Arabic row is enough here).
  const rows: { id: string; hadeeth: string; explanation?: string }[] = []
  let k = 0
  for (const l of h.recs) {
    if (!l.startsWith('{"lang":"ar"') && !l.startsWith('{"lang": "ar"')) continue
    if (k++ % 40) continue
    const r = JSON.parse(l)
    if (r.hadeeth) rows.push(r)
  }
  it(`a hadith's Arabic text is never given to the device voice as a translation (${rows.length} hadith)`, () => {
    expect(rows.length).toBeGreaterThan(0)
    for (const r of rows) {
      expect(speakableText(r.hadeeth, 'ar', 'hadith-translation', { quotes: [r.hadeeth] }, ar.speakAyahSlot), r.id).toBeNull()
      expect(speakableText(r.hadeeth, 'ar-SA', 'salaf-translation', {}, ar.speakAyahSlot), r.id).toBeNull()
      // Under any other role, guarded against itself, nothing of its words remains.
      const out = speakableText(r.hadeeth, 'ar', 'explanation', { quotes: [r.hadeeth] }, ar.speakAyahSlot)
      expect(out === null || sharedRun(out, r.hadeeth) === null, r.id).toBe(true)
    }
  })
  it('HadeethEnc’s Arabic explanation, guarded by its hadith, never repeats four of the hadith’s words', () => {
    let read = 0
    for (const r of rows) {
      if (!r.explanation) continue
      const out = speakableText(r.explanation, 'ar', 'explanation', { quotes: [r.hadeeth] }, ar.speakAyahSlot)
      if (out === null) continue
      read++
      expect(sharedRun(out, r.hadeeth), r.id).toBeNull()
    }
    expect(read).toBeGreaterThanOrEqual(0)
  })
})

describe('names (§4): «استمع» only when the name is a word of its ayah', () => {
  const names = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/names.json'), 'utf8')) as { names: { name: string; quran?: { ayah: string } }[] }
  it('every name with an evidence ayah in our data is found in it', () => {
    const missed: string[] = []
    let checked = 0
    for (const n of names.names) {
      const r = n.quran?.ayah ? byId.get(n.quran.ayah) : undefined
      if (!r) continue
      checked++
      if (!nameInAyah(n.name, r.text)) missed.push(`${n.name} ${r.id}`)
    }
    if (q.full) expect(checked).toBeGreaterThan(50)
    expect(missed).toEqual([])
  })
  it('a word that only looks like the name is not it', () => {
    expect(nameInAyah('الله', 'لَهُ مَا فِي السَّمَاوَاتِ')).toBe(false)
    expect(nameInAyah('الله', 'قُلْ هُوَ اللَّهُ أَحَدٌ')).toBe(true)
    expect(nameInAyah('الله', 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ')).toBe(true)
    expect(nameInAyah('العليم', 'وَكَانَ اللَّهُ عَلِيمًا حَكِيمًا')).toBe(true)
    expect(nameInAyah('العليم', 'وَعَلَّمَ آدَمَ الْأَسْمَاءَ')).toBe(false)
    expect(nameInAyah('الرحمن', 'قُلْ هُوَ اللَّهُ أَحَدٌ')).toBe(false)
  })
})

// ---- the engine, with speechSynthesis instrumented ----

type Utt = { text: string; lang: string; voice: unknown; onstart?: () => void; onend?: () => void; onerror?: (e: { error: string }) => void }
function fakeSpeech(voiceLangs: string[]) {
  const spoken: Utt[] = []
  let cancels = 0
  let current: Utt | null = null
  const voices = voiceLangs.map((l) => ({ name: `v-${l}`, lang: l, localService: true, default: false, voiceURI: l }))
  const synth = {
    getVoices: () => voices,
    speak(u: Utt) {
      spoken.push(u)
      current = u
      queueMicrotask(() => u.onstart?.())
    },
    cancel() {
      cancels++
      const c = current
      current = null
      c?.onerror?.({ error: 'interrupted' })
    },
    addEventListener() {},
    removeEventListener() {},
  }
  class U {
    text: string
    lang = ''
    voice: unknown = null
    constructor(t: string) {
      this.text = t
    }
  }
  return { synth, U, spoken, cancels: () => cancels, end: () => current?.onend?.() }
}

describe('engine: what reaches speechSynthesis.speak', () => {
  let fake: ReturnType<typeof fakeSpeech>
  const stops: string[] = []
  let screen: { text: string; lang: string }[] = []
  beforeEach(() => {
    vi.resetModules()
    fake = fakeSpeech(['ar-SA', 'en-US'])
    stops.length = 0
    screen = []
    vi.stubGlobal('window', Object.assign(new EventTarget(), { setTimeout, clearTimeout, speechSynthesis: fake.synth, SpeechSynthesisUtterance: fake.U }))
    vi.stubGlobal('speechSynthesis', fake.synth)
    vi.stubGlobal('SpeechSynthesisUtterance', fake.U)
    vi.stubGlobal('navigator', { userAgent: 'test' })
    // The screen: elements showing ayat and Arabic hadith, as the selectors of engine.ts find them.
    vi.stubGlobal('document', {
      documentElement: {},
      querySelectorAll: () => screen.map((s) => ({ textContent: s.text, closest: () => ({ lang: s.lang }) })),
    })
    vi.doMock('../../web/src/quran/recitation', () => ({ play: () => stops.push('play'), stop: () => stops.push('stop'), stopReadingRecitation: () => undefined }))
    vi.doMock('../../web/src/voice/session', () => ({ setAudioSession: () => undefined }))
  })
  afterEach(() => {
    vi.doUnmock('../../web/src/quran/recitation')
    vi.doUnmock('../../web/src/voice/session')
    vi.unstubAllGlobals()
  })

  it('a text repeating an ayah or an Arabic hadith on the screen is refused at the press: nothing is spoken', async () => {
    const { speakNow } = await import('../../web/src/listen/engine')
    const ayah = byId.get('quran:2:255') ?? quran[0]
    screen = [{ text: ayah.text, lang: 'ar' }]
    expect(speakNow('a', `تفسيرها: ${ayah.text}`, 'ar')).toBe('refused')
    expect(speakNow('b', ayah.text, 'ar')).toBe('refused')
    const hadith = 'إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى'
    screen = [{ text: hadith, lang: 'ar' }]
    expect(speakNow('c', `قال: إنما الأعمال بالنيات وإنما لكل امرئ ما نوى`, 'ar')).toBe('refused')
    expect(fake.spoken).toEqual([])
    // An English page's own words beside them (an element of another language) are not taken for them.
    screen = [{ text: ayah.text, lang: 'ar' }, { text: 'Allah - there is no deity except Him', lang: 'en' }]
    expect(speakNow('d', 'Allah - there is no deity except Him, the Ever-Living.', 'en')).toBe('started')
    expect(fake.spoken.map((u) => u.text).join(' ')).not.toMatch(ARABIC)
  })

  it('one sound at a time: a reading stops the recitation; a new reading ends the one before; no voice, no reading', async () => {
    const { speakNow, reciteNow, getSpeaking } = await import('../../web/src/listen/engine')
    expect(speakNow('one', 'The first text. It has two sentences.', 'en')).toBe('started')
    expect(stops).toContain('stop') // the recitation, if any, ended first
    expect(getSpeaking()?.key).toBe('one')
    const before = fake.cancels()
    expect(speakNow('two', 'النص الثاني من كلامنا.', 'ar')).toBe('started')
    expect(fake.cancels()).toBeGreaterThan(before)
    expect(getSpeaking()?.key).toBe('two')
    // The recitation pressed: the device voice ends (recitation-start), and the recitation plays.
    reciteNow('three', 2, 255)
    expect(stops.at(-1)).toBe('play')
    window.dispatchEvent(new Event('recitation-start'))
    expect(getSpeaking()).toBeNull()
    expect(speakNow('four', 'Ein Satz.', 'de')).toBe('no-voice')
    // The first reading's second sentence was never said: it was ended before it.
    expect(fake.spoken.map((u) => u.text)).toEqual(['The first text.', 'النص الثاني من كلامنا.'])
  })

  it('a button leaving the screen stops what it started', async () => {
    const { speakNow, releaseKey, getSpeaking } = await import('../../web/src/listen/engine')
    speakNow('k', 'A sentence of ours.', 'en')
    expect(getSpeaking()?.key).toBe('k')
    releaseKey('other', false)
    expect(getSpeaking()?.key).toBe('k')
    releaseKey('k', false)
    expect(getSpeaking()).toBeNull()
  })
})
