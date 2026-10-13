// The settings' link to the privacy policy page (reply 0033 §ج). Arabic and English reviewed; the other eight follow
// the project's machine-translated interface strings. `opensOutside` is read by screen readers only: the page opens in
// the browser, outside the app.
import type { Lang } from '../../../../shared/api'

export const SITE_LINKS: Record<Lang, { privacy: string; opensOutside: string }> = {
  ar: { privacy: 'سياسة الخصوصية', opensOutside: 'تُفتح في المتصفح' },
  en: { privacy: 'Privacy policy', opensOutside: 'opens in the browser' },
  ur: { privacy: 'رازداری کی پالیسی', opensOutside: 'براؤزر میں کھلتی ہے' },
  id: { privacy: 'Kebijakan privasi', opensOutside: 'dibuka di peramban' },
  ms: { privacy: 'Dasar privasi', opensOutside: 'dibuka dalam pelayar' },
  tr: { privacy: 'Gizlilik politikası', opensOutside: 'tarayıcıda açılır' },
  fr: { privacy: 'Politique de confidentialité', opensOutside: 's’ouvre dans le navigateur' },
  es: { privacy: 'Política de privacidad', opensOutside: 'se abre en el navegador' },
  bn: { privacy: 'গোপনীয়তা নীতি', opensOutside: 'ব্রাউজারে খোলে' },
  hi: { privacy: 'गोपनीयता नीति', opensOutside: 'ब्राउज़र में खुलती है' },
}
