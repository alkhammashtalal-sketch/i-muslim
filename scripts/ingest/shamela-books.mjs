// [ج] The editions chosen by Talal (5 Oct 2026). See docs/SOURCES.md.
// `sections` maps a TOC title (as it appears on shamela) to the book we index; anything else
// in the volume (publisher's preface, شروط الصلاة, editor's notes) is skipped.
export const SHAMELA_BOOKS = [
  {
    bookId: 239,
    edition: 'ثلاثة الأصول وأدلتها - وشروط الصلاة - والقواعد الأربع، وزارة الشئون الإسلامية والأوقاف والدعوة والإرشاد، ط1 1421هـ',
    sections: { 'الأصول الثلاثة': 'الأصول الثلاثة', 'القواعد الأربع': 'القواعد الأربع' },
  },
  {
    bookId: 11318,
    edition: 'كتاب التوحيد (مطبوع ضمن مؤلفات الشيخ محمد بن عبد الوهاب، الجزء الأول)، جامعة الإمام محمد بن سعود، تحقيق عبد العزيز بن عبد الرحمن السعيد وغيره',
    sections: { '*': 'كتاب التوحيد' }, // the whole book is the author's text (editor's notes are footnotes)
  },
];
