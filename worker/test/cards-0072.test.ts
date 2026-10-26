// Add-on 0072-add30 §1, «اصنع كروت»: the splitter and the sets (web/src/v2/cards/model.ts, decks.ts).
//   - a text cut only after a complete sentence, and the parts joined are the text exactly; an ayah never cut;
//   - every card carries the source of every quoted text on it, and the app's explanation its title;
//   - the cover first, the closing card last, at most 20 cards by default, and «١ من ٥» in the interface's digits.
import { describe, expect, it } from 'vitest'
import { clauses, cornerOf, defaultChoice, guarded, layoutSectionX, MIN_SCALE, sectionFits, spansOf, digitsOf, layoutDeck, layoutSection, MAX_CARDS, sentences, unitsOf, type Block, type Measure, type Section } from '../../web/src/v2/cards/model'
import { ayahDeck, answerDeck, salafDeck } from '../../web/src/v2/cards/decks'
import { SALAF_CARDS } from '../../web/src/v2/daily/salaf/salaf-model'
import type { AnswerResponse, PassageResponse } from '../../shared/api'

/** A card that holds `room` px; a piece is 40 px a line of 30 characters, and 60 for its source and by-line. */
const est = (text: string) => Math.ceil(text.length / 30) * 40 + 60
const measure = (room = 400): Measure => ({ room, gap: 20, piece: (_b, text) => est(text), fits: (_b, text) => est(text) * MIN_SCALE <= room })

const HADITH =
  'إنما الأعمال بالنيات، وإنما لكل امرئ ما نوى. فمن كانت هجرته إلى الله ورسوله فهجرته إلى الله ورسوله. ومن كانت هجرته لدنيا يصيبها أو امرأة ينكحها فهجرته إلى ما هاجر إليه.'
const LONG_AYAH = 'يَا أَيُّهَا الَّذِينَ آمَنُوا إِذَا تَدَايَنتُم بِدَيْنٍ إِلَىٰ أَجَلٍ مُّسَمًّى فَاكْتُبُوهُ ۚ '.repeat(8).trim()

describe('sentences: cut only after a complete sentence, the text unchanged', () => {
  it('joins back to the text exactly, in Arabic and in English', () => {
    for (const t of [HADITH, 'One. Two? Three! «Four.» Five', 'بلا نهاية', 'أولًا؟ ثانيًا؛ ثالثًا.\nرابعًا', '  مسافة. ', 'A 1.5 km walk. Then home.'])
      expect(sentences(t).join('')).toBe(t)
  })
  it('ends after «.» «؟» «!» and a closing quote, never inside a word or a number', () => {
    expect(sentences(HADITH)).toHaveLength(3)
    expect(sentences('قال: «اتق الله.» ثم سكت.')).toEqual(['قال: «اتق الله.» ', 'ثم سكت.'])
    expect(sentences('A 1.5 km walk. Then home.')).toEqual(['A 1.5 km walk. ', 'Then home.'])
    for (const s of sentences(HADITH).slice(0, -1)) expect(s.trim()).toMatch(/[.؟!]$/)
  })
  it('an ayah is one unit, never cut, whatever its length', () => {
    const b: Block = { kind: 'ayah', text: LONG_AYAH, num: '٢٨٢', ref: 'سورة البقرة ✦ ٢٨٢', source: 'نص المصحف ✦ المصحف الإلكتروني' }
    expect(unitsOf(b)).toEqual([LONG_AYAH])
    const cards = layoutSection({ id: 'a', label: 'a', heading: 'الآية', blocks: [b] }, measure(200))
    expect(cards).toHaveLength(1)
    expect(cards[0][0].text).toBe(LONG_AYAH)
  })
})

describe('a sentence longer than a card: cut at its clauses, never inside a quoted ayah', () => {
  // al-Saʿdi's tafsir in the Ayat archive has no full stop at all, only «،» and «:».
  const saadi = 'هذه الآية الكريمة أعظم آيات القرآن وأفضلها وأجلها، وذلك لما اشتملت عليه من الأمور العظيمة، فأخبر تعالى عن نفسه الكريمة بأن { لا إله إلا هو، الحي القيوم } أي: لا معبود بحق سواه، فهو الإله الحق'
  it('the clauses joined are the sentence exactly, each after «، و» or «، ف»', () => {
    const c = clauses(saadi)
    expect(c.join('')).toBe(saadi)
    expect(c).toHaveLength(4)
    expect(c.slice(1).every((x) => /^[وف]/.test(x))).toBe(true)
    // the «،» inside {…} (the ayah quoted) is never a cut
    expect(c.some((x) => x.includes('{') !== x.includes('}'))).toBe(false)
  })
  it('the layout uses them only when one sentence is longer than a card', () => {
    const long = Array.from({ length: 30 }, () => saadi).join('، ')
    const b: Block = { kind: 'quote', text: long, lang: 'ar', dir: 'rtl', source: 'تفسير السعدي ✦ المصحف الإلكتروني' }
    const cards = layoutSection({ id: 's', label: 's', heading: 'تفسير السعدي', blocks: [b] }, measure())
    expect(cards.length).toBeGreaterThan(3)
    expect(cards.flat().map((p) => p.text).join('')).toBe(long)
    for (const p of cards.flat()) expect(p.text.trim().startsWith('}')).toBe(false)
    // a short one stays whole
    expect(layoutSection({ id: 't', label: 't', heading: 't', blocks: [{ ...b, text: saadi }] }, measure(2000))).toHaveLength(1)
  })
})

describe('never inside a quotation, an ayah quoted, or its reference (the review of a2e7545)', () => {
  const cutsOf = (t: string, room: number) => {
    const cards = layoutSection({ id: 'q', label: 'q', heading: 'q', blocks: [{ kind: 'quote', text: t, lang: 'ar', dir: 'rtl', source: 'المصدر' }] }, measure(room))
    const pieces = cards.flat().map((p) => p.text)
    expect(pieces.join('')).toBe(t)
    let at = 0
    return pieces.slice(0, -1).map((p) => (at += p.length))
  }
  it('a quotation with a full stop inside it: the depth is the whole text’s, so the next sentence is still inside (hadith 3261)', () => {
    const t = 'قال: «احتجت الجنة والنار. فقالت هذه: يدخلني الجبارون والمتكبرون، وقالت هذه: يدخلني الضعفاء والمساكين، فقال الله لهذه: أنت عذابي أعذب بك من أشاء. وقال لهذه: أنت رحمتي أرحم بك من أشاء، ولكل واحدة منكما ملؤها». وهذا لفظ الحديث بتمامه.'
    const g = guarded(t)
    for (const c of cutsOf(t, 160)) expect(g[c], `cut at ${c}: «${t.slice(c - 12, c)}‖${t.slice(c, c + 12)}»`).toBe(0)
    expect(sentences(t)).toEqual([t.slice(0, t.indexOf('وهذا')), t.slice(t.indexOf('وهذا'))])
  })
  it('an ayah quoted in braces with its own «؟» (al-Saʿdi 18:104), and Ibn Kathir’s «( … . … ) [سورة : رقم]»', () => {
    const saadi = 'ثم قال: { قُلْ إِنَّ الْخَاسِرِينَ الَّذِينَ خَسِرُوا أَنْفُسَهُمْ وَأَهْلِيهِمْ يَوْمَ الْقِيَامَةِ؟ أَلا ذَلِكَ هُوَ الْخُسْرَانُ الْمُبِينُ } فهذا هو الخسران حقًا. وغيره لا يُعد خسرانًا.'
    expect(sentences(saadi)).toHaveLength(2)
    const katheer = 'وقوله: ( وأطيعوا الله وأطيعوا الرسول واحذروا. فإن توليتم فاعلموا أنما على رسولنا البلاغ المبين ) [ المائدة : 92 ] أي: فيما أمرا به. ثم قال تعالى ذكره.'
    const ss = sentences(katheer)
    expect(ss.some((x) => x.includes('(') !== x.includes(')'))).toBe(false)
    expect(ss.some((x) => x.includes('[') !== x.includes(']'))).toBe(false)
    for (const t of [saadi, katheer]) {
      const g = guarded(t)
      for (const c of cutsOf(t, 160)) expect(g[c]).toBe(0)
    }
  })
  it('a hadith in straight quotes, as al-Saʿdi, Ibn Kathir and HadeethEnc write it (Ibn Kathir 2:97, HadeethEnc 3303), and “…”', () => {
    const katheer = 'فقال رسول الله صلى الله عليه وسلم : " اللهم اشهد عليهم . وأنشدكم بالله الذي لا إله إلا هو ، الذي أنزل التوراة على موسى ، هل تعلمون أنه جبريل ؟ " قالوا : نعم . ثم قال لهم قولًا آخر .'
    expect(sentences(katheer).map((x) => x.split('"').length - 1)).toEqual([2, 0])
    const hadith = 'عن صهيب رضي الله عنه أن رسول الله صلى الله عليه وسلم قال: "كان ملك فيمن كان قبلكم، وكان له ساحر، فلما كبر، قال للملك: إني قد كبرت، فابعث إلي غلامًا أعلمه السحر، فبعث إليه غلامًا يعلمه".'
    const g = guarded(hadith)
    for (const c of cutsOf(hadith, 120)) expect(g[c], `cut at ${c}: «${hadith.slice(c - 12, c)}‖${hadith.slice(c, c + 12)}»`).toBe(0)
    expect(sentences('قال: “أولًا. ثانيًا.” ثم.')).toHaveLength(2)
    // an odd count in a paragraph pairs nothing there
    expect(sentences('قال: "أولًا. ثانيًا.')).toHaveLength(2)
  })
  it('a crossed or stray mark of one kind never unguards another (Ibn Kathir 1:6 «( اهدنا ]», 2:3)', () => {
    const t = '( قال. نعم ] ثم قال: [ أولًا. ثم ) ثانيًا. ]. بعده.'
    const g = guarded(t)
    expect(g[t.indexOf('ثانيًا')]).toBe(1)
    expect(sentences(t)).toEqual([t.slice(0, t.indexOf('بعده')), 'بعده.'])
  })
  it('a «, ﴿ or { never closed guards to its paragraph’s end; a ( or [ never closed, or a closer with no opener, guards nothing; ﴿…﴾ and […] guard', () => {
    expect(sentences('قال: «أولًا. ثانيًا.')).toHaveLength(1) // a « never closed: to the end of its paragraph
    expect(sentences('قال: «أولًا. ثانيًا.\nثالثًا. رابعًا.')).toHaveLength(3)
    expect(sentences('قال: (أولًا. ثانيًا.')).toHaveLength(2)
    expect(sentences('أولًا.» ثانيًا.')).toHaveLength(2)
    expect(sentences('﴿قال. نعم.﴾ ثم.')).toHaveLength(2)
    expect(sentences('[ قال. نعم. ] ثم.')).toHaveLength(1)
    expect(sentences('[ قال. نعم. ]. ثم.')).toHaveLength(2)
  })
  it('spansOf: the ayah whole; the clauses and pauses only where a sentence is too long', () => {
    const fitsAll = () => true
    expect(spansOf({ kind: 'ayah', text: 'أ. ب.', num: '١', ref: 'r', source: 's' }, () => false)).toEqual([[0, 5]])
    expect(spansOf({ kind: 'quote', text: 'أولًا، وثانيًا. ثالثًا.', lang: 'ar', dir: 'rtl', source: 's' }, fitsAll)).toEqual([[0, 16], [16, 23]])
  })
})

describe('layout: no mid-sentence cuts, the source on every card', () => {
  const long = Array.from({ length: 14 }, (_, i) => `هذه الجملة رقم ${i + 1} من شرح طويل للآية والحديث.`).join(' ')
  const sec: Section = {
    id: 'x',
    label: 'تفسير السعدي',
    heading: 'تفسير السعدي',
    blocks: [
      { kind: 'quote', text: long, lang: 'ar', dir: 'rtl', by: 'سورة البقرة ✦ ٢٥٥', source: 'تفسير السعدي ✦ المصحف الإلكتروني' },
      { kind: 'explain', title: 'تفسير السعدي', text: long, lang: 'ar', dir: 'rtl' },
    ],
  }
  const cards = layoutSection(sec, measure())
  it('splits the long text over several cards, each piece whole sentences, the pieces joined the text', () => {
    expect(cards.length).toBeGreaterThan(2)
    for (const b of sec.blocks) {
      const pieces = cards.flat().filter((p) => p.block === b)
      expect(pieces.map((p) => p.text).join('')).toBe(b.text)
      const ss = sentences(b.text)
      for (const p of pieces) {
        // a piece is a run of whole sentences: it starts at a sentence's start and ends at a sentence's end
        let at = 0
        const starts = ss.map((s) => ((at += s.length), at - s.length))
        const from = b.text.indexOf(p.text, starts[0])
        expect(starts).toContain(from)
        expect(starts.concat(b.text.length)).toContain(from + p.text.length)
      }
      expect(pieces.every((p) => p.parts === pieces.length)).toBe(true)
    }
  })
  it('every card names the source of each quoted text on it, and carries the explanation’s title', () => {
    for (const c of cards)
      for (const p of c) {
        if (p.block.kind === 'explain') expect(p.block.title).toBeTruthy()
        else expect(p.block.source.trim()).not.toBe('')
      }
  })
  it('a text over several cards is spread evenly: no full card and a near-empty one after it', () => {
    const m = measure(600)
    const t = Array.from({ length: 9 }, (_, i) => `جملة تامة رقم ${i + 1} في نص منقول طويل بعض الشيء هنا.`).join(' ')
    const c = layoutSection({ id: 'b', label: 'b', heading: 'b', blocks: [{ kind: 'quote', text: t, lang: 'ar', dir: 'rtl', source: 'المصدر' }] }, m)
    expect(c).toHaveLength(2)
    const hs = c.map((x) => m.piece(x[0].block, x[0].text, x[0].first, { id: 'b', label: 'b', heading: 'b', blocks: [] }))
    expect(Math.min(...hs) / Math.max(...hs)).toBeGreaterThan(0.6)
  })
  it('a text no card holds even drawn smaller, with nowhere to cut, leaves its section out: never a text off its card', () => {
    const one = 'كلمة '.repeat(300).trim() + '.'
    const sec: Section = { id: 'y', label: 'y', heading: 'y', blocks: [{ kind: 'quote', text: one, lang: 'ar', dir: 'rtl', source: 'المصدر' }] }
    expect(sectionFits(sec, measure(200))).toBe(false)
    expect(layoutDeck([sec], measure(200)).map((p) => p.kind)).toEqual(['cover', 'closing'])
    expect(defaultChoice([sec], measure(200))).toEqual([])
    // the same, a little shorter: drawn smaller on a card of its own
    const short = 'كلمة '.repeat(40).trim() + '.'
    const ok: Section = { ...sec, blocks: [{ kind: 'quote', text: short, lang: 'ar', dir: 'rtl', source: 'المصدر' }] }
    expect(sectionFits(ok, measure(300))).toBe(true)
  })
  it('a sentence with no joined clause is cut at its pauses («،» «؛» «:») as a last resort, still never inside a quotation', () => {
    const t = Array.from({ length: 40 }, (_, i) => `قول رقم ${i + 1} في المسألة`).join('، ') + ' «فيه، ما لا يُقطع: أبدًا»'
    const sec: Section = { id: 'z', label: 'z', heading: 'z', blocks: [{ kind: 'quote', text: t, lang: 'ar', dir: 'rtl', source: 'المصدر' }] }
    const x = layoutSectionX(sec, measure(300))
    expect(x.fits).toBe(true)
    expect(x.cards.length).toBeGreaterThan(1)
    expect(x.cards.flat().map((p) => p.text).join('')).toBe(t)
    expect(x.cards.flat().some((p) => p.text.includes('«') !== p.text.includes('»'))).toBe(false)
  })
})

describe('the set: cover first, closing last, 20 at most, the corner in the interface’s digits', () => {
  const many: Section[] = Array.from({ length: 12 }, (_, i) => ({
    id: `s${i}`,
    label: `قسم ${i}`,
    heading: `قسم ${i}`,
    blocks: [{ kind: 'quote', text: HADITH, lang: 'ar', dir: 'rtl', source: 'موسوعة الأحاديث النبوية' }],
  }))
  it('the cover and the closing card', () => {
    const pages = layoutDeck(many.slice(0, 2), measure())
    expect(pages[0].kind).toBe('cover')
    expect(pages.at(-1)!.kind).toBe('closing')
    expect(pages.filter((p) => p.kind === 'body').every((p) => p.kind === 'body' && p.pieces.length > 0)).toBe(true)
  })
  it('the sections kept by default stay within 20 cards, in their order', () => {
    const m = measure(200)
    const kept = defaultChoice(many, m)
    const pages = layoutDeck(
      many.filter((s) => kept.includes(s.id)),
      m,
    )
    expect(pages.length).toBeLessThanOrEqual(MAX_CARDS)
    expect(kept).toEqual(many.map((s) => s.id).filter((id) => kept.includes(id)))
    expect(layoutDeck(many, m).length).toBeGreaterThan(MAX_CARDS)
  })
  it('«١ من ٥» in Arabic-Indic digits in Arabic, the language’s own elsewhere', () => {
    expect(cornerOf('ar', '{i} من {n}', 1, 5)).toBe('١ من ٥')
    expect(cornerOf('en', '{i} of {n}', 3, 12)).toBe('3 of 12')
    expect(digitsOf('bn', 12)).toBe('১২')
    expect(digitsOf('ur', 7)).toBe('7')
  })
})

describe('the sets: the texts as the screens show them, each with its source', () => {
  const p = {
    id: 'quran:2:255',
    kind: 'ayah',
    text: 'ٱللَّهُ لَآ إِلَٰهَ إِلَّا هُوَ ٱلۡحَيُّ ٱلۡقَيُّومُۚ',
    text_en: 'Allah - there is no deity except Him, the Ever-Living, the Sustainer of existence.',
    ref: 'البقرة ٢٥٥',
    url: 'https://quran.ksu.edu.sa/',
    verified: true,
    ayah: { sura: 2, aya: 255, suraName: 'البقرة', page: 42 },
    tafsir: [
      { key: 'muyassar', name: 'التفسير الميسر', text: 'الله الذي لا يستحق الألوهية والعبودية إلا هو. الحي الذي له جميع معاني الحياة الكاملة.', ref: '', url: '' },
      { key: 'saadi', name: 'تفسير السعدي', text: '', ref: '', url: '', empty: true },
    ],
  } as unknown as PassageResponse
  it('the ayah with its meaning in English from Sahih International, al-Muyassar as stored; no empty tafsir', () => {
    const ar = ayahDeck(p, 'ar')!
    expect(ar.title).toBe('سورة البقرة ✦ ٢٥٥')
    expect(ar.sections.map((s) => s.id)).toEqual(['ayah', 'muyassar'])
    const ay = ar.sections[0].blocks[0]
    expect(ay.kind === 'ayah' && ay.text).toBe(p.text)
    expect(ay.kind === 'ayah' && ay.meaning).toBeNull()
    expect(ar.sections[1].blocks[0].text).toBe(p.tafsir![0].text)
    const en = ayahDeck(p, 'en')!
    const m = en.sections[0].blocks[0]
    expect(m.kind === 'ayah' && m.meaning).toEqual({ text: p.text_en, lang: 'en', dir: 'ltr', by: 'Sahih International' })
    expect(en.quoteNote).toBe('Text in Arabic')
  })
  it('the salaf saying, letter for letter, with «قال» and its book', () => {
    const c = SALAF_CARDS[0]
    const d = salafDeck(c, 'ar', 'من أقوال السلف')
    const b = d.sections[0].blocks[0]
    expect(b.text).toBe(c.text)
    expect(b.kind === 'quote' && b.by).toMatch(/^(قال|يُروى عن) /)
    expect(b.kind === 'quote' && b.source).toContain('المكتبة الشاملة')
  })
  it('an answer: each text, its tafsir, and the generated explanation under its title and tag', () => {
    const res = {
      type: 'answer',
      level: 'A',
      quotes: [{ ...p, tafsirExcerpt: p.tafsir![0].text }, { id: 'hadith:5', kind: 'hadith', text: HADITH, ref: 'متفق عليه', url: '', verified: true, grade: 'صحيح', hadith: { id: '5', class: 'sahih', tier: '1', attribution: 'متفق عليه', title: null } }],
      explanation: [{ text: 'شرح من النصوص.', cites: [0] }],
      machineTranslated: false,
      fromCache: false,
    } as unknown as AnswerResponse
    const d = answerDeck(res, 'ما آية الكرسي؟', 'ar', { plainExplanation: 'شرح مبسّط', generatedTag: 'شرح مولّد من النصوص أعلاه', badgeMT: 'ترجمة آلية' })
    expect(d.title).toBe('ما آية الكرسي؟')
    expect(d.sections.map((s) => s.id)).toEqual(['q0', 't0', 'q1', 'explain'])
    const h = d.sections[2].blocks[0]
    expect(h.kind === 'quote' && h.by).toBe('صحيح ✦ متفق عليه')
    const ex = d.sections[3].blocks[0]
    expect(ex.kind === 'explain' && [ex.title, ex.note]).toEqual(['شرح مبسّط', 'شرح مولّد من النصوص أعلاه'])
    for (const s of d.sections) for (const b of s.blocks) if (b.kind !== 'explain') expect(b.source).toBeTruthy()
  })
})
