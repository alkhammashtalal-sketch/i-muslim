import type { Lang } from '../../../../shared/api'
import { isLang } from '../../i18n'
import { isServed, MEANINGS_ONLY } from './served'

// The first run's languages (0048-add2 §6, Talal: «هل … يكون على لغة الجوال؟»), with no settings saved yet: the
// phone's first language. One of the ten: the interface and the content in it. One of the other served content
// languages (Persian, for one): the content in it with the English interface, as contentFor pairs them. Anything
// else: English. Old and regional tags are read as the codes the app serves.
const ALIASES: Record<string, string> = { in: 'id', fil: 'tl', ckb: 'ku', 'zh-hans': 'zh', 'zh-hant': 'zh' }

export function firstRunLanguage(tags: readonly string[] | undefined): { lang: Lang; content: string } {
  const tag = (tags?.[0] ?? '').toLowerCase()
  const parts = tag.split('-')
  const code = ALIASES[`${parts[0]}-${parts[1] ?? ''}`] ?? ALIASES[parts[0]] ?? parts[0]
  if (isLang(code)) return { lang: code, content: code }
  // A language with the translation of the meanings alone (add-on 0072-add60 §7) is chosen in the picker, never by
  // the phone at the first run: that would trade the English hadiths and tafsir for Arabic ones (an open decision).
  if (isServed(code) && !MEANINGS_ONLY.has(code)) return { lang: 'en', content: code }
  return { lang: 'en', content: 'en' }
}
