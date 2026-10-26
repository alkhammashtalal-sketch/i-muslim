// «أيقونة التطبيق» in the settings (add-ons 0072-add31 §2 and 0072-add32 §3-4), in the app's ten languages: Arabic and
// English reviewed, the other eight machine translation like the rest of the interface. The icons' Arabic names are
// Talal's as they are («المورّقة»، «الصافية»، «المؤطّرة»، «العاجية»); the other languages give their meaning (Ornate,
// Classic, Framed, Ivory).
import type { Lang } from '../../../shared/api'
import type { AppIconId } from './app-icon'

export type AppIconText = {
  section: string
  /** Under the four: iOS shows its own notice when the icon changes. */
  hint: string
  names: Record<AppIconId, string>
  /** Under the primary's name. */
  isDefault: string
  error: string
}

export const APP_ICON_TEXT: Record<Lang, AppIconText> = {
  ar: {
    section: 'أيقونة التطبيق',
    hint: 'يُظهر جهازك تنبيهًا عند تغييرها.',
    names: { ornate: 'المورّقة', classic: 'الصافية', framed: 'المؤطّرة', ivory: 'العاجية' },
    isDefault: 'الافتراضية',
    error: 'تعذّر تغيير الأيقونة الآن.',
  },
  en: {
    section: 'App icon',
    hint: 'Your iPhone shows a notice when it changes.',
    names: { ornate: 'Ornate', classic: 'Classic', framed: 'Framed', ivory: 'Ivory' },
    isDefault: 'Default',
    error: 'The icon could not be changed right now.',
  },
  ur: {
    section: 'ایپ کا آئیکن',
    hint: 'آئیکن بدلنے پر آپ کا آلہ ایک اطلاع دکھاتا ہے۔',
    names: { ornate: 'نقش دار', classic: 'کلاسیک', framed: 'فریم والا', ivory: 'ہاتھی دانت' },
    isDefault: 'طے شدہ',
    error: 'آئیکن ابھی نہیں بدلا جا سکا۔',
  },
  id: {
    section: 'Ikon aplikasi',
    hint: 'Perangkat Anda menampilkan pemberitahuan saat ikon diganti.',
    names: { ornate: 'Berhias', classic: 'Klasik', framed: 'Berbingkai', ivory: 'Gading' },
    isDefault: 'Bawaan',
    error: 'Ikon tidak dapat diganti saat ini.',
  },
  ms: {
    section: 'Ikon aplikasi',
    hint: 'Peranti anda memaparkan makluman apabila ikon ditukar.',
    names: { ornate: 'Berhias', classic: 'Klasik', framed: 'Berbingkai', ivory: 'Gading' },
    isDefault: 'Lalai',
    error: 'Ikon tidak dapat ditukar sekarang.',
  },
  tr: {
    section: 'Uygulama simgesi',
    hint: 'Simge değiştiğinde cihazınız bir bildirim gösterir.',
    names: { ornate: 'Süslü', classic: 'Klasik', framed: 'Çerçeveli', ivory: 'Fildişi' },
    isDefault: 'Varsayılan',
    error: 'Simge şu anda değiştirilemedi.',
  },
  fr: {
    section: 'Icône de l’app',
    hint: 'Votre appareil affiche un message lors du changement.',
    names: { ornate: 'Ornée', classic: 'Classique', framed: 'Encadrée', ivory: 'Ivoire' },
    isDefault: 'Par défaut',
    error: 'L’icône n’a pas pu être changée pour l’instant.',
  },
  es: {
    section: 'Icono de la app',
    hint: 'Tu dispositivo muestra un aviso al cambiarlo.',
    names: { ornate: 'Ornamentado', classic: 'Clásico', framed: 'Enmarcado', ivory: 'Marfil' },
    isDefault: 'Predeterminado',
    error: 'No se pudo cambiar el icono ahora.',
  },
  bn: {
    section: 'অ্যাপের আইকন',
    hint: 'আইকন বদলালে আপনার ডিভাইস একটি বার্তা দেখায়।',
    names: { ornate: 'অলংকৃত', classic: 'ক্লাসিক', framed: 'ফ্রেমযুক্ত', ivory: 'আইভরি' },
    isDefault: 'ডিফল্ট',
    error: 'এখন আইকন বদলানো যায়নি।',
  },
  hi: {
    section: 'ऐप आइकन',
    hint: 'आइकन बदलने पर आपका डिवाइस एक सूचना दिखाता है।',
    names: { ornate: 'अलंकृत', classic: 'क्लासिक', framed: 'फ़्रेम वाला', ivory: 'आइवरी' },
    isDefault: 'डिफ़ॉल्ट',
    error: 'आइकन अभी नहीं बदला जा सका।',
  },
}
