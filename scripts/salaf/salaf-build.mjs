// «من أقوال السلف» (reply 0072 item 11; add-on 0072-add4): data/salaf-daily.json from the reviewed cards
// (relay/w1/0072-salaf/samples.json, outside the repository), with only what the home card needs: the text as shown
// (display_text: the source's words without the edition's diacritics, with the logged hamza fixes and the app's own
// diacritics), the narrator's gloss apart, «قال» or «يُروى عن», the topic, the sayer, the book, its volume and page and
// the Shamela link, in the rotation's pre-set order. Nothing of the edition's work (diacritics, notes, headings) and no
// page of the books enters the repository (add-on 0072-add4 §5 د): short quotes of one to three lines.
//   node scripts/salaf/salaf-build.mjs /Users/talal/i-muslim/relay/w1/0072-salaf/samples.json
import fs from 'node:fs'
import path from 'node:path'

const src = process.argv[2]
if (!src) throw new Error('usage: node scripts/salaf/salaf-build.mjs <samples.json>')
const { rotation, samples } = JSON.parse(fs.readFileSync(src, 'utf8'))

// The book as the approved card names it (review.html), and its author as on the book's card in al-Maktaba al-Shamila
// (relay/w1/0072-salaf/README.md §2). The author is kept for the licence basis (add-on 0072-add4 §5 د), not shown.
const BOOKS = {
  8494: { title: 'الزهد', author: 'أحمد بن حنبل', died: '241هـ' },
  10495: { title: 'حلية الأولياء', author: 'أبو نعيم الأصبهاني', died: '430هـ' },
  12031: { title: 'صفة الصفوة', author: 'ابن الجوزي', died: '597هـ' },
  10906: { title: 'سير أعلام النبلاء', author: 'الذهبي', died: '748هـ' },
  11363: { title: 'لطائف المعارف', author: 'ابن رجب', died: '795هـ' },
}

const cards = [...samples]
  .sort((a, b) => a.rotation_day - b.rotation_day)
  .map((s) => {
    const b = BOOKS[s.book_id]
    if (!b) throw new Error(`book ${s.book_id}`)
    return {
      n: s.n,
      day: s.rotation_day,
      topic: s.topic,
      text: s.display_text,
      ...(s.gloss_display ? { gloss: s.gloss_display } : {}),
      attribution: s.attribution,
      attribution_reason: s.attribution_reason,
      sayer: s.sayer_display,
      ...(s.sayer_key_link ? { sayer_key: s.sayer_key, sayer_key_link: s.sayer_key_link } : {}),
      book: s.book,
      book_title: b.title,
      book_id: s.book_id,
      author: b.author,
      author_died: b.died,
      vol_page: s.vol_page,
      url: s.url,
      ...(s.hamza_fixes?.length ? { hamza_fixes: s.hamza_fixes } : {}),
      ...(s.app_diacritics?.length ? { app_diacritics: s.app_diacritics } : {}),
    }
  })

const out = {
  _about:
    'بطاقة «من أقوال السلف» في الصفحة الرئيسية بالواجهة العربية وحدها (رد 0072 البند 11، والملحق 0072-add4 بعد المراجعة المستقلة): 26 قولًا قصيرًا من سطر إلى ثلاثة، من خمسة كتب قديمة في المكتبة الشاملة (shamela.ws) لمؤلفين توفوا بين 241هـ و795هـ، مع القائل والكتاب والجزء والصفحة ورابط الصفحة. النص (`text`) نص المصدر بلا تشكيل الطبعة، ومعه تصحيحات الهمز (`hamza_fixes`) والضبط الذي يضيفه التطبيق (`app_diacritics`) مسجّلة؛ و`gloss` تفسير من الراوي داخل النص يُعرض بلون أخف. ولا شيء من عمل الطبعة: لا تشكيل ولا حواشٍ ولا رؤوس تراجم. `attribution_reason` للمراجعة ولا يُعرض. البناء: scripts/salaf/salaf-build.mjs من relay/w1/0072-salaf/samples.json.',
  epoch: rotation.epoch,
  rule: rotation.rule,
  show_when_interface_lang: rotation.show_when_interface_lang,
  count: cards.length,
  cards,
}
if (out.count !== rotation.count) throw new Error(`count ${out.count} ≠ ${rotation.count}`)
cards.forEach((c, i) => {
  if (c.day !== i) throw new Error(`rotation day ${c.day} at ${i}`)
})
const file = path.resolve(import.meta.dirname, '../../data/salaf-daily.json')
fs.writeFileSync(file, JSON.stringify(out, null, 1) + '\n')
console.log(`${file}: ${cards.length} cards`)
