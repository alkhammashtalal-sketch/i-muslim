// The texts of «بياناتك» in the app's settings (add-on 0072-add25 §5), in the app's ten languages: Arabic and English
// reviewed, the other eight machine translation like the rest of the interface. No sacred text here.
export type BackupText = {
  section: string
  hint: string
  backup: string
  restore: string
  confirm: string
  confirmYes: string
  cancel: string
  badFile: string
  failed: string
  fileTitle: string
  /** Under the two buttons when this launch could not load the app's storage (they are off until the next launch). */
  later: string
}

export const BACKUP_TEXT: Record<string, BackupText> = {
  ar: {
    section: 'بياناتك',
    hint: 'علاماتك وملاحظاتك وورْدك وإعداداتك محفوظة على هذا الجهاز وحده، ولا تُرسل إلى أي مكان. ويمكنك أن تحفظ نسخة منها في ملف، وتستعيدها منه على هذا الجهاز أو غيره.',
    backup: 'نسخة احتياطية من بياناتي',
    restore: 'استعادة من نسخة',
    confirm: 'تحل بيانات الملف محل ما يقابلها على هذا الجهاز، ثم يُعاد فتح التطبيق.',
    confirmYes: 'استعادة',
    cancel: 'إلغاء',
    badFile: 'هذا الملف ليس نسخة من بيانات تطبيق مسلم، فلم يتغير شيء.',
    failed: 'تعذّر ذلك الآن، ولم يتغير شيء.',
    fileTitle: 'نسخة من بيانات مسلم',
    later: 'تعذّر تحميل بياناتك في هذا التشغيل، فالنسخ والاستعادة متاحان حين تفتح التطبيق مرة أخرى.',
  },
  en: {
    section: 'Your data',
    hint: 'Your bookmarks, notes, daily portion and settings are kept on this device alone and sent nowhere. You can save a copy of them in a file, and restore it on this device or another.',
    backup: 'Back up my data',
    restore: 'Restore from a backup',
    confirm: 'The data in the file will take the place of the matching data on this device, then the app opens again.',
    confirmYes: 'Restore',
    cancel: 'Cancel',
    badFile: 'This file is not a backup of the Muslim app, so nothing was changed.',
    failed: 'That could not be done just now, and nothing was changed.',
    fileTitle: 'Muslim data backup',
    later: 'Your data could not be loaded this time, so backing up and restoring will be available when you open the app again.',
  },
  ur: {
    section: 'آپ کا ڈیٹا',
    hint: 'آپ کے نشانات، نوٹس، روزانہ کا ورد اور ترتیبات صرف اسی آلے پر محفوظ ہیں اور کہیں نہیں بھیجے جاتے۔ آپ ان کی ایک نقل فائل میں محفوظ کر سکتے ہیں، اور اسی آلے یا کسی دوسرے پر اسے بحال کر سکتے ہیں۔',
    backup: 'میرے ڈیٹا کی بیک اپ نقل',
    restore: 'نقل سے بحال کریں',
    confirm: 'فائل کا ڈیٹا اس آلے پر موجود متعلقہ ڈیٹا کی جگہ لے لے گا، پھر ایپ دوبارہ کھلے گی۔',
    confirmYes: 'بحال کریں',
    cancel: 'منسوخ',
    badFile: 'یہ فائل ایپ مسلم کے ڈیٹا کی نقل نہیں ہے، اس لیے کچھ تبدیل نہیں ہوا۔',
    failed: 'یہ ابھی نہیں ہو سکا، اور کچھ تبدیل نہیں ہوا۔',
    fileTitle: 'مسلم ڈیٹا کی نقل',
    later: 'اس بار آپ کا ڈیٹا لوڈ نہیں ہو سکا، اس لیے نقل اور بحالی ایپ دوبارہ کھولنے پر دستیاب ہوں گی۔',
  },
  id: {
    section: 'Data Anda',
    hint: 'Penanda, catatan, wirid harian, dan pengaturan Anda disimpan hanya di perangkat ini dan tidak dikirim ke mana pun. Anda dapat menyimpan salinannya dalam sebuah berkas, lalu memulihkannya di perangkat ini atau perangkat lain.',
    backup: 'Cadangkan data saya',
    restore: 'Pulihkan dari cadangan',
    confirm: 'Data dalam berkas akan menggantikan data yang sesuai di perangkat ini, lalu aplikasi dibuka kembali.',
    confirmYes: 'Pulihkan',
    cancel: 'Batal',
    badFile: 'Berkas ini bukan cadangan aplikasi Muslim, jadi tidak ada yang diubah.',
    failed: 'Hal itu belum dapat dilakukan sekarang, dan tidak ada yang diubah.',
    fileTitle: 'Cadangan data Muslim',
    later: 'Data Anda belum dapat dimuat kali ini, jadi pencadangan dan pemulihan tersedia saat Anda membuka aplikasi lagi.',
  },
  ms: {
    section: 'Data anda',
    hint: 'Penanda, nota, wirid harian dan tetapan anda disimpan di peranti ini sahaja dan tidak dihantar ke mana-mana. Anda boleh menyimpan salinannya dalam fail, dan memulihkannya pada peranti ini atau peranti lain.',
    backup: 'Sandarkan data saya',
    restore: 'Pulihkan daripada sandaran',
    confirm: 'Data dalam fail akan menggantikan data yang sepadan pada peranti ini, kemudian aplikasi dibuka semula.',
    confirmYes: 'Pulihkan',
    cancel: 'Batal',
    badFile: 'Fail ini bukan sandaran aplikasi Muslim, jadi tiada apa yang diubah.',
    failed: 'Perkara itu tidak dapat dilakukan sekarang, dan tiada apa yang diubah.',
    fileTitle: 'Sandaran data Muslim',
    later: 'Data anda tidak dapat dimuatkan kali ini, jadi sandaran dan pemulihan tersedia apabila anda membuka aplikasi semula.',
  },
  tr: {
    section: 'Verileriniz',
    hint: 'Yer işaretleriniz, notlarınız, günlük virdiniz ve ayarlarınız yalnızca bu cihazda saklanır ve hiçbir yere gönderilmez. Bunların bir kopyasını bir dosyaya kaydedebilir, bu cihazda ya da başka birinde geri yükleyebilirsiniz.',
    backup: 'Verilerimi yedekle',
    restore: 'Yedekten geri yükle',
    confirm: 'Dosyadaki veriler bu cihazdaki karşılıklarının yerini alacak, ardından uygulama yeniden açılacak.',
    confirmYes: 'Geri yükle',
    cancel: 'Vazgeç',
    badFile: 'Bu dosya Muslim uygulamasının bir yedeği değil, bu yüzden hiçbir şey değişmedi.',
    failed: 'Bu şu anda yapılamadı ve hiçbir şey değişmedi.',
    fileTitle: 'Muslim veri yedeği',
    later: 'Verileriniz bu sefer yüklenemedi; yedekleme ve geri yükleme, uygulamayı yeniden açtığınızda kullanılabilir olacak.',
  },
  fr: {
    section: 'Vos données',
    hint: 'Vos signets, vos notes, votre portion quotidienne et vos réglages sont gardés sur cet appareil seulement et ne sont envoyés nulle part. Vous pouvez en enregistrer une copie dans un fichier, et la restaurer sur cet appareil ou un autre.',
    backup: 'Sauvegarder mes données',
    restore: 'Restaurer une sauvegarde',
    confirm: 'Les données du fichier remplaceront les données correspondantes de cet appareil, puis l’application se rouvrira.',
    confirmYes: 'Restaurer',
    cancel: 'Annuler',
    badFile: 'Ce fichier n’est pas une sauvegarde de l’application Muslim : rien n’a été modifié.',
    failed: 'Cela n’a pas pu se faire pour le moment, et rien n’a été modifié.',
    fileTitle: 'Sauvegarde des données Muslim',
    later: 'Vos données n’ont pas pu être chargées cette fois ; la sauvegarde et la restauration seront disponibles à la prochaine ouverture de l’application.',
  },
  es: {
    section: 'Tus datos',
    hint: 'Tus marcadores, notas, porción diaria y ajustes se guardan solo en este dispositivo y no se envían a ningún lugar. Puedes guardar una copia en un archivo y restaurarla en este dispositivo o en otro.',
    backup: 'Copia de seguridad de mis datos',
    restore: 'Restaurar desde una copia',
    confirm: 'Los datos del archivo ocuparán el lugar de los datos correspondientes de este dispositivo y luego la aplicación se abrirá de nuevo.',
    confirmYes: 'Restaurar',
    cancel: 'Cancelar',
    badFile: 'Este archivo no es una copia de la aplicación Muslim, así que no se cambió nada.',
    failed: 'No se pudo hacer ahora, y no se cambió nada.',
    fileTitle: 'Copia de datos de Muslim',
    later: 'Esta vez no se pudieron cargar tus datos; la copia y la restauración estarán disponibles cuando vuelvas a abrir la aplicación.',
  },
  bn: {
    section: 'আপনার তথ্য',
    hint: 'আপনার বুকমার্ক, নোট, দৈনিক ওয়ির্দ ও সেটিংস শুধু এই ডিভাইসেই রাখা থাকে, কোথাও পাঠানো হয় না। আপনি এগুলোর একটি কপি ফাইলে সংরক্ষণ করতে পারেন, এবং এই ডিভাইসে বা অন্য কোনোটিতে তা পুনরুদ্ধার করতে পারেন।',
    backup: 'আমার তথ্যের ব্যাকআপ',
    restore: 'ব্যাকআপ থেকে পুনরুদ্ধার',
    confirm: 'ফাইলের তথ্য এই ডিভাইসের সংশ্লিষ্ট তথ্যের জায়গা নেবে, তারপর অ্যাপটি আবার খুলবে।',
    confirmYes: 'পুনরুদ্ধার',
    cancel: 'বাতিল',
    badFile: 'এই ফাইলটি মুসলিম অ্যাপের ব্যাকআপ নয়, তাই কিছুই বদলায়নি।',
    failed: 'এখন এটি করা গেল না, এবং কিছুই বদলায়নি।',
    fileTitle: 'মুসলিম তথ্যের ব্যাকআপ',
    later: 'এবার আপনার তথ্য লোড করা যায়নি, তাই অ্যাপটি আবার খুললে ব্যাকআপ ও পুনরুদ্ধার পাওয়া যাবে।',
  },
  hi: {
    section: 'आपका डेटा',
    hint: 'आपके बुकमार्क, नोट्स, रोज़ का विर्द और सेटिंग्स केवल इसी डिवाइस पर रखे जाते हैं और कहीं नहीं भेजे जाते। आप इनकी एक प्रति फ़ाइल में सहेज सकते हैं, और इसी डिवाइस या किसी दूसरे पर उसे बहाल कर सकते हैं।',
    backup: 'मेरे डेटा का बैकअप',
    restore: 'बैकअप से बहाल करें',
    confirm: 'फ़ाइल का डेटा इस डिवाइस पर मिलते-जुलते डेटा की जगह ले लेगा, फिर ऐप दोबारा खुलेगा।',
    confirmYes: 'बहाल करें',
    cancel: 'रद्द करें',
    badFile: 'यह फ़ाइल मुस्लिम ऐप का बैकअप नहीं है, इसलिए कुछ नहीं बदला।',
    failed: 'यह अभी नहीं हो सका, और कुछ नहीं बदला।',
    fileTitle: 'मुस्लिम डेटा बैकअप',
    later: 'इस बार आपका डेटा लोड नहीं हो सका, इसलिए ऐप दोबारा खोलने पर बैकअप और बहाली उपलब्ध होंगे।',
  },
}
