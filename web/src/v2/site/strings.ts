// The settings' links to the privacy policy page (reply 0033 §ج) and to the support page, «تواصل معنا» (reply 0038 §2:
// the site's page, not a mailto link, since the device may have no mail app). Arabic and English reviewed; the other
// eight follow the project's machine-translated interface strings. `opensOutside` is read by screen readers only: the
// page opens in the browser, outside the app.
import type { Lang } from '../../../../shared/api'

export const SITE_LINKS: Record<Lang, { privacy: string; contact: string; opensOutside: string }> = {
  ar: { privacy: 'سياسة الخصوصية', contact: 'تواصل معنا', opensOutside: 'تُفتح في المتصفح' },
  en: { privacy: 'Privacy policy', contact: 'Contact us', opensOutside: 'opens in the browser' },
  ur: { privacy: 'رازداری کی پالیسی', contact: 'ہم سے رابطہ کریں', opensOutside: 'براؤزر میں کھلتی ہے' },
  id: { privacy: 'Kebijakan privasi', contact: 'Hubungi kami', opensOutside: 'dibuka di peramban' },
  ms: { privacy: 'Dasar privasi', contact: 'Hubungi kami', opensOutside: 'dibuka dalam pelayar' },
  tr: { privacy: 'Gizlilik politikası', contact: 'Bize ulaşın', opensOutside: 'tarayıcıda açılır' },
  fr: { privacy: 'Politique de confidentialité', contact: 'Nous contacter', opensOutside: 's’ouvre dans le navigateur' },
  es: { privacy: 'Política de privacidad', contact: 'Contáctanos', opensOutside: 'se abre en el navegador' },
  bn: { privacy: 'গোপনীয়তা নীতি', contact: 'যোগাযোগ করুন', opensOutside: 'ব্রাউজারে খোলে' },
  hi: { privacy: 'गोपनीयता नीति', contact: 'संपर्क करें', opensOutside: 'ब्राउज़र में खुलती है' },
}
