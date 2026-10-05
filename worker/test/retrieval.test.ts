import assert from 'node:assert/strict'
import fs from 'node:fs'
import { expect, test } from 'vitest'
import { chunkSaadi } from '../src/lib/chunk.ts'
import { passageIdOf, rrf } from '../src/lib/fusion.ts'
import { expand, expandMulti, multiNorm, type Lexicon } from '../src/lib/lexicon.ts'
import { ftsIndexText, ftsMatch, normalizeArabic, queryTerms, stemArabic, tokenize } from '../src/lib/normalize.ts'

const lexAr = JSON.parse(fs.readFileSync(new URL('../src/config/lexicon.ar.json', import.meta.url), 'utf8')) as Lexicon
const lexEn = JSON.parse(fs.readFileSync(new URL('../src/config/lexicon.en.json', import.meta.url), 'utf8')) as Lexicon
const lexMulti = JSON.parse(fs.readFileSync(new URL('../src/config/lexicon.multi.json', import.meta.url), 'utf8')) as Lexicon

test('normalizeArabic keeps every base letter (guards against a mis-ordered character range)', () => {
  const letters = 'ءابتثجحخدذرزسشصضطظعغفقكلمنهوي'
  assert.equal(normalizeArabic(letters), letters)
})

test('normalizeArabic removes harakat and unifies alef, ya and ta marbuta', () => {
  assert.equal(normalizeArabic('بِسْمِ اللَّهِ الرَّحْمَٰنِ'), 'بسم الله الرحمن')
  assert.equal(normalizeArabic('أإآٱ'), 'اااا')
  assert.equal(normalizeArabic('مصطفى صلاة'), 'مصطفي صلاه')
})

test('stemArabic strips prefixes and suffixes conservatively', () => {
  assert.equal(stemArabic('بالصلاه'), stemArabic('الصلاه'))
  assert.equal(stemArabic('كتاب'), 'كتاب')
  assert.equal(stemArabic('اركان'), 'اركان')
  assert.notEqual(stemArabic('العباده'), 'عباد')
  for (const w of ['الوضوء', 'والمؤمنون', 'فاغسلوا', 'صيام']) assert.ok(stemArabic(w).length >= 3, w)
})

test('queryTerms drops question words and keeps content words with their stems', () => {
  const t = queryTerms('كيف أتوضأ؟')
  assert.ok(t.includes('اتوضا'))
  assert.ok(!t.includes('كيف'))
  assert.deepEqual(queryTerms('What is zakat?'), ['zakat'])
})

test('ftsIndexText keeps word order (for phrases) and appends stems', () => {
  const s = ftsIndexText('فَاغْسِلُوا وُجُوهَكُمْ')
  assert.ok(s.startsWith('فاغسلوا وجوهكم'))
})

test('ftsMatch quotes every term so user input cannot inject FTS5 operators', () => {
  const m = ftsMatch(['zakat" OR NEAR(x', 'الصلاه', 'فاغسلوا وجوهكم'])!
  assert.equal((m.match(/"/g) ?? []).length % 2, 0)
  for (const part of m.split(' OR ')) assert.match(part, /^"[^"]+"$/)
  assert.ok(m.includes('"فاغسلوا وجوهكم"'))
  assert.equal(ftsMatch(['؟', '!']), null)
})

test('lexicon expands everyday wording to the terms found in the sources', () => {
  assert.ok(expand('كيف أتوضأ', lexAr).add.includes('الوضوء'))
  assert.ok(expand('What is zakat', lexEn).add.includes('zakah'))
  assert.deepEqual(expand('من هو مؤسس شركة أبل؟', lexAr).add, [])
  assert.ok(!expand('ما أركان الإيمان؟', lexAr).topics.includes('أركان الإسلام'))
})

test('the most specific phrase wins: «شروط الصلاة» adds the treatise wording, not the general prayer terms', () => {
  const r = expand('ما شروط الصلاة؟', lexAr)
  assert.ok(r.topics.includes('شروط الصلاة') && r.topics.includes('الصلاة')) // both reported
  assert.ok(r.add.includes('شروط الصلاه'))
  assert.ok(!r.add.includes('اقيموا الصلاه')) // the broader topic's trigger lies inside «شروط الصلاه»
  // A question about prayer in general still gets the general terms.
  assert.ok(expand('كيف أصلي؟', lexAr).add.includes('اقيموا الصلاه'))
  // Wording without the term itself, and the pillars.
  assert.ok(expand('ما الذي يجب أن يتحقق قبل أن أصلي؟', lexAr).add.includes('شروط الصلاه'))
  assert.ok(expand('كم أركان الصلاة؟', lexAr).add.includes('واركان الصلاه اربعه عشر'))
})

test('a precise phrase (the longest trigger, two words or more) names the targets of the reserved seat', () => {
  assert.deepEqual(expand('ما شروط الصلاة؟', lexAr).precise, ['شروط الصلاه', 'شروط الصلاه تسعه'])
  assert.equal(expand('كيف أصلي؟', lexAr).precise, null) // one general word: no seat
  assert.deepEqual(expandMulti('نماز کی شرائط کیا ہیں؟', lexMulti).precise, ['شروط الصلاه', 'شروط الصلاه تسعه'])
})

test('English and other languages reach the treatise through its Arabic wording', () => {
  assert.ok(expand('What are the conditions of prayer?', lexEn).add.includes('شروط الصلاه'))
  const ur = expandMulti('نماز کی شرائط کیا ہیں؟', lexMulti)
  assert.ok(ur.add.includes('شروط الصلاه') && !ur.add.includes('اقيموا الصلاه'))
  assert.ok(expandMulti('Quels sont les piliers de la prière ?', lexMulti).add.includes('اركان الصلاه'))
})

test('lexicon entries are well formed and within the size limit', () => {
  for (const lex of [lexAr, lexEn]) {
    assert.ok(lex.entries.length <= 150)
    for (const e of lex.entries) assert.ok(e.topic && e.when.length && e.add.length, JSON.stringify(e))
  }
})

test('rrf rewards agreement between lists and keeps the best rank per list', () => {
  const r = rrf({ vector: ['a', 'b', 'c'], ayah: ['b', 'a'], tafsir: ['b', 'b'] }, { vector: 1, ayah: 1, tafsir: 1, en: 1, lex: 1 }, 60)
  assert.equal(r[0].id, 'b')
  assert.deepEqual(r[0].foundBy, { vector: 2, ayah: 1, tafsir: 1 })
  assert.equal(r.at(-1)!.id, 'c')
})

test('passageIdOf maps tafsir chunks and rows back to their ayah', () => {
  assert.equal(passageIdOf('tafsir:saadi:5:6:3'), 'quran:5:6')
  assert.equal(passageIdOf('tafsir:muyassar:2:183'), 'quran:2:183')
  assert.equal(passageIdOf('aqeedah:usul:001'), 'aqeedah:usul:001')
})

test('chunkSaadi splits at paragraph boundaries near the target size and loses no text', () => {
  const para = (n: number) => `<p>${'كلمة '.repeat(n).trim()}.</p>`
  const html = para(100) + para(100) + para(400) + '<p></p>'
  const chunks = chunkSaadi(html, 800)
  assert.ok(chunks.length >= 3)
  for (const c of chunks) assert.ok(c.length <= 1200, String(c.length))
  const words = (s: string) => tokenize(s).length
  assert.equal(chunks.reduce((n, c) => n + words(c), 0), words(html))
  assert.deepEqual(chunkSaadi('<p></p>', 800), [])
})

test('multilingual lexicon maps common Islamic terms in other languages to Arabic terms', () => {
  expect(expandMulti('Siapakah yang wajib berpuasa pada bulan Ramadan?', lexMulti).add).toContain('الصيام')
  expect(expandMulti('Pourquoi les musulmans font-ils le jeûne ?', lexMulti).topics).toContain('الصيام')
  expect(expandMulti('Pourquoi jeune ?', lexMulti).topics).toContain('الصيام')
  expect(expandMulti('मुसलमान रोज़ा क्यों रखते हैं?', lexMulti).add).toContain('الصيام')
  expect(expandMulti('İslam\'ın şartları nelerdir?', lexMulti).topics).toContain('أركان الإسلام')
  expect(expandMulti('روزہ کس پر فرض ہے؟', lexMulti).topics).toContain('الصيام')
  expect(expandMulti('Bonjour, quelle heure est-il ?', lexMulti).add).toEqual([])
})

test('multiNorm keeps Devanagari and Bengali vowel signs and folds Latin accents', () => {
  expect(multiNorm('रोज़ा')).toBe(multiNorm('रोज़ा'))
  expect(multiNorm('रोज़ा').length).toBeGreaterThan(2)
  expect(multiNorm('নামাজ')).toBe('নামাজ'.normalize('NFC'))
  expect(multiNorm('Jeûne')).toBe('jeune')
  expect(multiNorm('İSA')).toBe('isa')
})
