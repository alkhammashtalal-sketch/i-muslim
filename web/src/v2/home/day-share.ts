// «آية وحديث اليوم» as the iOS/Android app shares it (reply 0037 §3.3). The web shares the card's title and the link to
// its page; the app has no page of ours to link to, so it shares what the card shows, each part with its reference:
// the title, the ayah as the ayah's panel shares it, the hadith as its page shares it. web/src/native/share-text.ts then
// adds the app's line and the App Store link. Pure (worker/test/native-app-0037.test.ts).
import type { Lang, PassageResponse } from '../../../../shared/api'
import { displayRef } from '../../quran/format'
import { hadithShareText, type Hadith } from '../hadith/api'

export function dayShareText(o: {
  title: string
  ayah: Pick<PassageResponse, 'text' | 'ref'> | null
  hadith: Pick<Hadith, 'text' | 'grade' | 'attribution' | 'url'> | null
  lang: Lang
  /** HadeethEnc's name in the interface language (web/src/v2/hadith/strings.ts sourceName). */
  sourceName: string
}): string {
  return [o.title, o.ayah ? `﴿${o.ayah.text}﴾ [${displayRef(o.ayah.ref, o.lang)}]` : null, o.hadith ? hadithShareText(o.hadith, o.sourceName) : null]
    .filter(Boolean)
    .join('\n\n')
}
