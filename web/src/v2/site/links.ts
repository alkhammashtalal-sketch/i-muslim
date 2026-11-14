// The privacy and support pages (reply 0033 §ج; add-on 0033-add1 §5): the static-assets Worker i-muslim-site (site/),
// Arabic at /privacy and /support, English at /en/privacy and /en/support. The settings link the privacy policy in the
// interface language (Apple guideline 5.1.1): Arabic to the Arabic page, every other language to the English one.
import type { Lang } from '../../../../shared/api'

export const SITE_ORIGIN = 'https://i-muslim-site.alkhammashtalal.workers.dev'

export type SitePage = 'privacy' | 'support'

export const sitePage = (page: SitePage, lang: Lang | string): string => `${SITE_ORIGIN}${lang === 'ar' ? '' : '/en'}/${page}`
