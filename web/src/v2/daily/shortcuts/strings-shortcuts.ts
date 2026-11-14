// The quick-access buttons' own strings (add-on 0072-add13 §3). The buttons that were already on «يومك» keep their
// reviewed names (TODAY.tools), the two lessons their titles (web/src/lessons/*/meta.ts); here are the three new
// names (the wudu lesson's short name, the Quran, «اسأل») and the arranging controls. Arabic from Talal's words and
// English reviewed with them; the other eight are machine translation, like the rest of the interface.
import type { Lang } from '../../../../../shared/api'

const en = {
  wuduLesson: 'Ablution',
  quran: 'Quran',
  ask: 'Ask',
  arrange: 'Arrange',
  done: 'Done',
  arrangeHint: 'Drag a button by its handle, or move it with the arrows.',
  handle: 'Reorder {name}: drag, or use the up and down arrow keys',
  earlier: 'Move {name} earlier',
  later: 'Move {name} later',
  position: '{name}: {n} of {total}',
  reset: 'Default order',
  resetDone: 'The buttons are back in their default order',
}
export type ShortcutStrings = typeof en

const ar: ShortcutStrings = {
  wuduLesson: 'الوضوء',
  quran: 'القرآن',
  ask: 'اسأل',
  arrange: 'ترتيب',
  done: 'تم',
  arrangeHint: 'اسحب الزر من مقبضه، أو حرّكه بالسهمين.',
  handle: 'ترتيب «{name}»: اسحبه، أو استعمل سهمي الأعلى والأسفل',
  earlier: 'قدّم «{name}»',
  later: 'أخّر «{name}»',
  position: '«{name}»: {n} من {total}',
  reset: 'الترتيب الأصلي',
  resetDone: 'عادت الأزرار إلى ترتيبها الأصلي',
}

const ur: ShortcutStrings = {
  wuduLesson: 'وضو',
  quran: 'قرآن',
  ask: 'پوچھیں',
  arrange: 'ترتیب',
  done: 'ہو گیا',
  arrangeHint: 'بٹن کو اس کے ہینڈل سے گھسیٹیں، یا تیروں سے منتقل کریں۔',
  handle: '«{name}» کی ترتیب: گھسیٹیں، یا اوپر اور نیچے کی تیر کلیدیں استعمال کریں',
  earlier: '«{name}» کو پہلے کریں',
  later: '«{name}» کو بعد میں کریں',
  position: '«{name}»: {total} میں سے {n}',
  reset: 'اصل ترتیب',
  resetDone: 'بٹن اپنی اصل ترتیب پر واپس آ گئے',
}

const id: ShortcutStrings = {
  wuduLesson: 'Wudu',
  quran: 'Al-Qur’an',
  ask: 'Tanya',
  arrange: 'Atur',
  done: 'Selesai',
  arrangeHint: 'Seret tombol dari pegangannya, atau pindahkan dengan panah.',
  handle: 'Urutkan {name}: seret, atau gunakan tombol panah atas dan bawah',
  earlier: 'Pindahkan {name} lebih awal',
  later: 'Pindahkan {name} lebih akhir',
  position: '{name}: {n} dari {total}',
  reset: 'Urutan bawaan',
  resetDone: 'Tombol kembali ke urutan bawaannya',
}

const ms: ShortcutStrings = {
  wuduLesson: 'Wuduk',
  quran: 'Al-Quran',
  ask: 'Tanya',
  arrange: 'Susun',
  done: 'Selesai',
  arrangeHint: 'Seret butang pada pemegangnya, atau alihkannya dengan anak panah.',
  handle: 'Susun {name}: seret, atau gunakan kekunci anak panah atas dan bawah',
  earlier: 'Alihkan {name} lebih awal',
  later: 'Alihkan {name} lebih akhir',
  position: '{name}: {n} daripada {total}',
  reset: 'Susunan asal',
  resetDone: 'Butang kembali kepada susunan asalnya',
}

const tr: ShortcutStrings = {
  wuduLesson: 'Abdest',
  quran: 'Kur’an',
  ask: 'Sor',
  arrange: 'Düzenle',
  done: 'Bitti',
  arrangeHint: 'Düğmeyi tutamacından sürükleyin veya oklarla taşıyın.',
  handle: '{name} sırası: sürükleyin veya yukarı ve aşağı ok tuşlarını kullanın',
  earlier: '{name} öğesini öne al',
  later: '{name} öğesini geriye al',
  position: '{name}: {total} içinde {n}',
  reset: 'Varsayılan sıra',
  resetDone: 'Düğmeler varsayılan sıralarına döndü',
}

const fr: ShortcutStrings = {
  wuduLesson: 'Ablutions',
  quran: 'Coran',
  ask: 'Demander',
  arrange: 'Organiser',
  done: 'Terminé',
  arrangeHint: 'Faites glisser un bouton par sa poignée, ou déplacez-le avec les flèches.',
  handle: 'Réorganiser {name} : faites glisser, ou utilisez les flèches haut et bas',
  earlier: 'Avancer {name}',
  later: 'Reculer {name}',
  position: '{name} : {n} sur {total}',
  reset: 'Ordre par défaut',
  resetDone: 'Les boutons ont repris leur ordre par défaut',
}

const es: ShortcutStrings = {
  wuduLesson: 'Ablución',
  quran: 'Corán',
  ask: 'Preguntar',
  arrange: 'Ordenar',
  done: 'Listo',
  arrangeHint: 'Arrastra un botón por su asa, o muévelo con las flechas.',
  handle: 'Reordenar {name}: arrastra, o usa las flechas arriba y abajo',
  earlier: 'Adelantar {name}',
  later: 'Atrasar {name}',
  position: '{name}: {n} de {total}',
  reset: 'Orden predeterminado',
  resetDone: 'Los botones han vuelto a su orden predeterminado',
}

const bn: ShortcutStrings = {
  wuduLesson: 'অজু',
  quran: 'কুরআন',
  ask: 'জিজ্ঞাসা',
  arrange: 'সাজান',
  done: 'হয়েছে',
  arrangeHint: 'বোতামটি তার হাতল ধরে টেনে আনুন, অথবা তীর দিয়ে সরান।',
  handle: '«{name}» সাজান: টেনে আনুন, অথবা উপর ও নিচের তীর কী ব্যবহার করুন',
  earlier: '«{name}» আগে আনুন',
  later: '«{name}» পরে নিন',
  position: '«{name}»: {total}-এর মধ্যে {n}',
  reset: 'মূল ক্রম',
  resetDone: 'বোতামগুলো মূল ক্রমে ফিরে এসেছে',
}

const hi: ShortcutStrings = {
  wuduLesson: 'वुज़ू',
  quran: 'क़ुरआन',
  ask: 'पूछें',
  arrange: 'क्रम बदलें',
  done: 'हो गया',
  arrangeHint: 'बटन को उसके हैंडल से खींचें, या तीरों से हिलाएँ।',
  handle: '«{name}» का क्रम: खींचें, या ऊपर और नीचे की तीर कुंजियाँ इस्तेमाल करें',
  earlier: '«{name}» को पहले करें',
  later: '«{name}» को बाद में करें',
  position: '«{name}»: {total} में से {n}',
  reset: 'मूल क्रम',
  resetDone: 'बटन अपने मूल क्रम में लौट आए',
}

export const SHORTCUTS: Record<Lang, ShortcutStrings> = { ar, en, ur, id, ms, tr, fr, es, bn, hi }
