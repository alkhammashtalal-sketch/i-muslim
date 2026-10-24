// The fatwa topics fetched first for «الإحالة بمصدر» (reply 0072 item 13; add-on 0069-add6): taharah, salah, sawm and
// inheritance, by each site's own fiqh classification. `take`: how many of the subtopic's own listing are taken, in the
// site's order (a useful core, not the whole site); `all`: the whole subtopic. The larger takes are the subtopics where
// personal questions gather (making up prayers and fasts, the ruling of prayer, inheritance).
//
// binbaz.org.sa: https://binbaz.org.sa/categories/fiqhi/<id>/fatwa (15 a page).
// binothaimeen.net: the site's own listing of a «تصنيف فقهي» section, shekhapi.binothaimeen.net/course/sections/
// audio_library/many_lessons/<id>/10?page=<n> (10 a page), the same request its pages make.

export const TOPICS = ['taharah', 'salah', 'sawm', 'mawarith']

export const BINBAZ = [
  // الطهارة (9)
  ...[10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 341].map((id) => ({ id, topic: 'taharah', take: 8 })),
  // الصلاة (22)
  ...[36, 27, 28, 29, 30, 32, 33, 44, 25, 37, 39, 40, 41, 43, 34, 46, 57, 58, 49, 52, 53, 54, 55, 56, 47, 48, 339, 357, 359, 376, 377, 378, 393].map((id) => ({ id, topic: 'salah', take: 4 })),
  { id: 23, topic: 'salah', take: 15 }, // حكم الصلاة وأهميتها
  { id: 42, topic: 'salah', take: 15 }, // قضاء الفوائت
  // الصيام (77)
  ...[83, 84, 85, 86, 87, 88, 89, 90, 91, 93, 94, 95].map((id) => ({ id, topic: 'sawm', take: 8 })),
  { id: 92, topic: 'sawm', take: 15 }, // قضاء الصيام
  // الفرائض (153)
  { id: 153, topic: 'mawarith', all: true },
]

export const BINOTHAIMEEN = [
  // الطهارة
  ...[
    'd13e9ab4-f87c-4758-b802-76303136c60d', // المياه
    '82df1101-c855-441f-b728-b192e48a35e4', // الآنية
    '62839c56-92b5-4b62-9e5f-455956b17985', // الخلاء وقضاء الحاجة
    'c6884e6f-39d3-4acd-a1bb-4b03c3147d85', // سنن الفطرة
    '510e269d-2290-4da3-88b7-68c750dd4fe0', // فروض الوضوء وصفته
    '2a9510b1-4fef-48ec-b5c9-510d0fdceeb6', // نواقض الوضوء
    '9932be35-6ba0-48c5-8782-765a14cf065e', // ما يسن له الوضوء
    '1ffbd7ce-ca71-498f-af16-8e0b86122692', // المسح على الخفين
    '72ca0c7d-0cf1-4115-9584-5e5c5da6d272', // الغسل
    'd7f09b54-2e43-41c5-82cd-656b4a795a14', // التيمم
    '3c219158-7c2a-48d9-9ed7-69ba1ce1b6bb', // النجاسات وإزالتها
    '519e0cb6-64bc-43cf-ad9f-999f28938279', // الحيض والنفاس
  ].map((id) => ({ id, topic: 'taharah', take: 8 })),
  // الصلاة
  { id: '497c8c57-f23e-483d-873a-05c8b4391f48', topic: 'salah', take: 15 }, // حكم الصلاة وأهميتها
  { id: '6b462498-01fd-436d-950f-14f2b6fddb21', topic: 'salah', take: 15 }, // الوقت وقضاء الفوائت
  { id: '0a198827-4977-473a-b7da-d32c24e45f92', topic: 'salah', take: 8 }, // صلاة المسافر وأحكام السفر
  ...[
    'ac7ef026-6241-4b89-b819-7a38f73976a2', // الأذان والإقامة
    'dc6dee3a-1eb3-4195-b221-33a572dd1376', // الطهارة من الحدث
    '5d41e981-b0fd-49c9-9092-86cbfd9bc2ae', // ستر العورة
    'c7556a33-6cf4-4f74-99fb-99815109843f', // استقبال القبلة
    '4bba5342-19b6-4d96-bdff-1b08d2a01138', // النية
    '92696af4-d62d-40a6-9663-c3a0ec8872c5', // الطهارة من النجاسة
    '0dfff418-2ae5-4dee-a297-3afb9bcea5c9', // القيام في الصلاة
    '2800f219-81f9-4416-b5e3-a354bfe19426', // التكبيرات والاستفتاح
    '9e7b6b3c-455d-4f0d-a27e-91070ee27f21', // الفاتحة والقراءة في الصلاة
    '975f6c38-ac04-48b2-877d-fc6420160e75', // الركوع والرفع منه
    '83a19407-8292-4357-a3ef-544f8dcbc2e6', // السجود والجلسة بين السجدتين
    '8410cf71-0588-4326-96e5-c3158ebc7835', // التشهد والتسليم
    '9dc7679b-ae48-4386-825a-be92d0d2110a', // الترتيب والطمأنينة والخشوع
    'e782c436-b820-4e62-ae7c-b64f80cf8ec0', // سنن الصلاة
    'd4b85a68-43ce-4d4f-b0d7-3db46df36ed9', // مكروهات الصلاة
    'bafbb82b-f1db-4b1b-bba6-0b3b2e9f6c64', // مبطلات الصلاة
    'ea2fea9f-1217-426f-b68d-8965d555e81d', // سجود السهو
    '67e2cb58-2301-433d-8521-5f31417030fb', // صلاة التطوع
    'e5f58a8a-2d5b-491e-a296-0084ef85b03a', // صلاة الجماعة والإمامة
    '464a913d-c6d3-40d8-9b8b-c328afaf2d1b', // أحكام المساجد
    'b793420e-95e5-4f3f-8a30-ca9dae6a6725', // صلاة المريض
    'd9a23b51-e1a2-4b59-aea7-3223d8390b85', // الجمع للمطر
    'edf82219-0b22-4c3e-8db1-d16c1c7c4d66', // صلاة الخوف
    '23cb8a3b-9834-422a-b710-fbcce7c2d152', // صلاة الجمعة
    '25dccb66-c01e-4d64-8a80-404545c50e67', // صلاة العيدين
    '82653515-94a7-4b68-accc-49a89ff0cf44', // صلاة الكسوف
    '4bb32715-121c-4ab2-8b5c-0735e798d4ea', // صلاة الاستسقاء
  ].map((id) => ({ id, topic: 'salah', take: 4 })),
  // الصيام
  { id: 'd5659f8d-a3f1-41a6-a5ea-dd13d38d7c54', topic: 'sawm', take: 15 }, // حكم القضاء
  { id: '46eea331-8d1f-4db7-b96c-ea2809806fcb', topic: 'sawm', take: 12 }, // وجوب الصوم والأعذار المبيحة للفطر
  ...[
    '7ade2ca8-c9ec-4660-94a9-af5f2dbc1b4e', // ثبوت الشهر وخروجه
    'e95acf0c-0103-4ef1-936d-7ed0caf69ed5', // النية في الصيام
    '0b7f1085-245f-46d3-8e66-1633898602a2', // مفسدات الصوم
    'dd35e815-517e-455c-ab9d-d8f4db086306', // الجماع في نهار رمضان
    '4fece66c-0a7e-47af-a40c-9847f0a9d1ed', // ما يكره ويستحب في الصيام
    '7b248d67-890c-46bb-860f-51b27e997ff8', // صوم التطوع
    '7ded05a0-59cb-4e8f-9867-eb9f2668c842', // الاعتكاف والقيام
    '5eff26a0-bc1f-4008-b586-248802840032', // مسائل متفرقة في الصيام
  ].map((id) => ({ id, topic: 'sawm', take: 8 })),
  // الفرائض
  { id: 'a01d5285-2da9-4680-ae35-caf5e1761cf9', topic: 'mawarith', all: true },
]
