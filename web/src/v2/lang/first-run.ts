import type { Lang } from '../../../../shared/api'
import { isLang } from '../../i18n'
import { isServed } from './served'

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
  if (isServed(code)) return { lang: 'en', content: code }
  return { lang: 'en', content: 'en' }
}
