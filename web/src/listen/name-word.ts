// «استمع» under a Beautiful Name (add-on 0072-add14 §4): pronounced only by the recitation, and only when the name is
// a word of the ayah shown (its evidence). Pure: the folded words of both, compared word by word.
import { matchWords } from '../trust/sacred'

// What may stand before a word in the Mushaf's spelling: «و», «ف», «ب», «ل», «ك» and the article, alone or together.
const PREFIXES = ['', 'و', 'ف', 'ب', 'ل', 'ك', 'ال', 'وال', 'فال', 'بال', 'كال', 'لل', 'ولل', 'فلل']

/** One word of the ayah stands for one word of the name: the same letters after a prefix, the name's article dropped
 *  when the ayah's word has its own or none (the name indefinite: «غفور»), an accusative alef after it («عليما»).
 *  A core of two letters (الله → له) needs a prefix with the article or «ل», so «له» ("for him") is not the name. */
function sameWord(ayahWord: string, nameWord: string): boolean {
  const core = nameWord.startsWith('ال') && nameWord.length > 3 ? nameWord.slice(2) : nameWord
  for (const p of PREFIXES) {
    if (!ayahWord.startsWith(p)) continue
    let rest = ayahWord.slice(p.length)
    if (rest === nameWord && p !== 'ال') return true
    if (rest !== core && rest.endsWith('ا') && rest.slice(0, -1) === core) rest = core
    // The Mushaf's spelling without the final ya («الْمُتَعَالِ» for المتعالي).
    if (rest !== core && core.endsWith('ي') && rest === core.slice(0, -1)) rest = core
    if (rest !== core) continue
    if (core.length <= 2 && !/ل/.test(p)) continue
    return true
  }
  return false
}

// Hamza seats differ between the name as written and the Mushaf («الرؤوف», «لَرَءُوفٌ»): compared without them.
const fold = (s: string) => matchWords(s.replace(/[ؤئء]/g, ''))

/** True when the name (one word or several, «مالك الملك») is in the ayah's text, in order. */
export function nameInAyah(name: string, ayahText: string): boolean {
  const n = fold(name)
  const a = fold(ayahText)
  if (!n.length || !a.length) return false
  for (let i = 0; i + n.length <= a.length; i++) if (n.every((w, k) => sameWord(a[i + k], w))) return true
  return false
}
