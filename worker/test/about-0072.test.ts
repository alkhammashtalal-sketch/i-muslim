// «عن التطبيق» stated precisely (reply 0072 §10): the list «ما في التطبيق» in the ten languages
// (web/src/components/about-strings.ts) names only what works in 1.1, and its texts keep the app's rules
// (CLAUDE.md §8: the name «مسلم» / "Muslim" only, no Latin text inside the Arabic; §11: no exclamation marks; §3 rule
// 14: no names of people beyond the allowed ones). Each claim's place in the code: relay/w1/0072-about/README.md.
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { ABOUT, ABOUT_FEATURES } from '../../web/src/components/about-strings'
import { STRINGS } from '../../web/src/i18n'
import { CONTENT_COUNTS, hasMukhtasar } from '../../web/src/v2/lang/served'

const WEB = path.resolve(import.meta.dirname, '../../web')
const LANGS = ['ar', 'en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi'] as const
const textsOf = (l: (typeof LANGS)[number]) => {
  const a = ABOUT[l]
  const t = STRINGS[l]
  return [a.lead, a.featuresTitle, a.mukhtasarNotHere, ...ABOUT_FEATURES.flatMap((k) => [a.features[k].name, a.features[k].text]), t.howTitle, t.aboutLanguages]
}

describe('«عن التطبيق»: what the app offers (reply 0072 §10)', () => {
  it('every feature has its name and line in the ten languages, and the not-available line its {name}', () => {
    expect(Object.keys(ABOUT).sort()).toEqual([...LANGS].sort())
    for (const l of LANGS) {
      for (const k of ABOUT_FEATURES) {
        expect(ABOUT[l].features[k].name.trim(), `${l}.${k}.name`).not.toBe('')
        expect(ABOUT[l].features[k].text.trim(), `${l}.${k}.text`).not.toBe('')
      }
      expect(ABOUT[l].mukhtasarNotHere, l).toContain('{name}')
      for (const k of ['{m}', '{x}', '{h}']) expect(STRINGS[l].aboutLanguages, `${l} ${k}`).toContain(k)
    }
  })

  it('calm wording: no exclamation mark, the name «مسلم» / "Muslim" only, and no Latin letters in the Arabic', () => {
    for (const l of LANGS) {
      for (const s of textsOf(l)) {
        expect(s, l).not.toMatch(/[!！¡]/)
        expect(s, l).not.toMatch(/\bi[ -]?Muslim\b|\biMuslim\b|i مسلم|آي مسلم/i)
      }
    }
    for (const s of textsOf('ar')) expect(s.replace(/\{[a-z]+\}/g, ''), s).not.toMatch(/[A-Za-z]/)
  })

  it('no names of people beyond the commentators with their tafsir and the two Sahihs by their titles (rule 14)', () => {
    for (const s of textsOf('ar')) expect(s).not.toMatch(/طلال|سالم|الخديدي|الخماش|عثيمين|ابن باز|عبد الوهاب/)
    for (const s of textsOf('en')) expect(s).not.toMatch(/Talal|Salem|Uthaymeen|Ibn Baz|Abd al-Wahhab/i)
  })

  it('nothing not shipped is claimed: no English al-Mukhtasar, no salaf card, no wudu or prayer lesson', () => {
    // Al-Mukhtasar as served: 27 languages besides Arabic, not English, Urdu or Malay; the page says so in those.
    expect(CONTENT_COUNTS.mukhtasar).toBeGreaterThanOrEqual(27)
    for (const l of ['en', 'ur', 'ms']) expect(hasMukhtasar(l), l).toBe(false)
    for (const l of ['fr', 'tr', 'id', 'es', 'bn', 'hi']) expect(hasMukhtasar(l), l).toBe(true)
    for (const l of LANGS) {
      const all = textsOf(l).join('\n')
      expect(all, l).not.toMatch(/أقوال السلف|السلف|درس الوضوء|درس الصلاة|الوضوء|salaf|wudu|prayer lesson/i)
    }
    const en = Object.values(ABOUT.en.features).map((f) => f.text).join('\n')
    expect(en).not.toMatch(/Mukhtasar/)
    // The English Ibn Kathir (Quran Foundation) is named in English alone, and only «where our server provides it».
    expect(ABOUT.en.features.quran.text).toContain('where our server provides it, Tafsir Ibn Kathir (abridged) in English from Quran Foundation')
    for (const l of LANGS.filter((x) => x !== 'en')) expect(textsOf(l).join('\n'), l).not.toMatch(/Quran Foundation/)
  })

  it('what Talal approved for 1.1 (integrate-1.1) has its line: the name of the day, the five prayers, the next occasion, the forbidden time, the sky', () => {
    const f = ABOUT.ar.features
    expect(f.names.text).toContain('اسم من أسماء الله كل يوم في الصفحة الرئيسية')
    expect(f.names.text).toContain('قائمة الأسماء الحسنى كلها')
    expect(f.goals.text).toContain('«الصلوات الخمس»')
    expect(f.goals.text).toContain('على جهازك وحده')
    expect(f.day.text).toContain('المناسبة القادمة بحديثها')
    expect(f.day.text).toContain('زينةً فقط')
    expect(f.prayer.text).toContain('وقت النهي عن صلاة النافلة')
    expect(f.prayer.text).toContain('بطريقة الحساب الافتراضية لبلدك، ويمكنك تغييرها')
    const e = ABOUT.en.features
    expect(e.names.text).toContain('A Name of Allah each day')
    expect(e.goals.text).toContain('«The five prayers»')
    expect(e.day.text).toContain('the next occasion and its hadith')
    expect(e.day.text).toContain('as decoration only')
    expect(e.prayer.text).toContain('voluntary prayer is not prayed')
  })

  it('the page: the phone app\'s part only in the iOS/Android app, the not-available line from the served data, the badge in the eight', () => {
    const about = fs.readFileSync(path.join(WEB, 'src/components/About.tsx'), 'utf8')
    expect(about).toContain("ABOUT_FEATURES.filter((k) => k !== 'app' || isNative())")
    expect(about).toContain("const noMukhtasar = content !== 'ar' && !hasMukhtasar(content)")
    expect(about).toContain("lang !== 'ar' && lang !== 'en' && (")
    // The order of the page: the title, the list, then how «اسأل» answers, the levels, the languages, privacy, licences.
    const at = (s: string) => about.indexOf(s)
    expect(at('a.featuresTitle')).toBeGreaterThan(at('t.aboutTitle'))
    expect(at('t.howTitle')).toBeGreaterThan(at('a.featuresTitle'))
    expect(at('t.levelsTitle')).toBeGreaterThan(at('t.howTitle'))
  })
})
