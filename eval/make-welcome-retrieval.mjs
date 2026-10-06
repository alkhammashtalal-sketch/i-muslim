// node eval/make-welcome-retrieval.mjs — writes eval/welcome-retrieval.v1.jsonl (reviewer's reply 0021): the four
// suggested questions of the welcome page (web/src/config/suggestions.ts) and the ten starter-path questions
// (web/src/config/starter-path.json), in the ten languages. A starter question identical to a suggestion in the same
// language is kept once. Gold: passages that state the answer in their own text — an executor's proposal (window 2),
// not reviewed by the Sharia reviewer, like eval/gold-extended.v1.jsonl. Run it again when either list changes.
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const src = fs.readFileSync(path.join(ROOT, 'web/src/config/suggestions.ts'), 'utf8')
const SUGGESTIONS = Function(`return ${src.slice(src.indexOf('{', src.indexOf('SUGGESTIONS')), src.lastIndexOf('}') + 1)}`)()
const steps = JSON.parse(fs.readFileSync(path.join(ROOT, 'web/src/config/starter-path.json'), 'utf8')).steps

const GOLD = {
  islam: ['aqeedah:usul:005', 'quran:3:19', 'quran:3:85'], // «الاستسلام لله بالتوحيد…»؛ «إن الدين عند الله الإسلام»
  pillars: ['aqeedah:usul:005'], // «فأركان الإسلام خمسة: شهادة أن لا إله إلا الله…»
  iman: ['aqeedah:usul:007', 'quran:2:285', 'quran:4:136', 'quran:2:177'], // «وأركانه ستة: أن تؤمن بالله وملائكته…»
  create: ['quran:51:56', 'aqeedah:usul:002', 'aqeedah:qawaid:001'], // «وما خلقت الجن والإنس إلا ليعبدون»
  allah: ['aqeedah:usul:002', 'quran:112:1', 'quran:2:255', 'quran:59:22'], // «ربي الله الذي رباني…»
  shahada: ['aqeedah:usul:005', 'quran:3:18', 'quran:47:19'], // «ومعناها: لا معبود بحق إلا الله…»
  salah: ['quran:29:45', 'quran:20:14', 'quran:98:5', 'aqeedah:usul:005'], // «إن الصلاة تنهى عن الفحشاء والمنكر»
  taharah: ['quran:5:6'], // آية الوضوء
  sawm: ['quran:2:183', 'quran:2:185', 'aqeedah:usul:006'], // «كتب عليكم الصيام… لعلكم تتقون»
  zakah: ['quran:9:60', 'quran:9:103'], // «إنما الصدقات للفقراء والمساكين…»
  hajj: ['quran:3:97', 'aqeedah:usul:006', 'aqeedah:usul:008'], // «ولله على الناس حج البيت من استطاع إليه سبيلا»
}
const SUGGESTION_TOPICS = ['islam', 'pillars', 'iman', 'create']

const rows = []
for (const [lang, qs] of Object.entries(SUGGESTIONS))
  qs.forEach((q, i) => {
    const topic = SUGGESTION_TOPICS[i]
    rows.push({ id: `ws-${topic}-${lang}`, lang, q, source: 'suggestion', expected_level: 'A', expected_behavior: 'answer', topic, gold: GOLD[topic] })
  })
for (const st of steps)
  for (const [lang, q] of Object.entries(st.q)) {
    if (rows.some((r) => r.lang === lang && r.q === q)) continue
    rows.push({ id: `wp-${st.id}-${lang}`, lang, q, source: 'starter', expected_level: 'A', expected_behavior: 'answer', topic: st.id, gold: GOLD[st.id] })
  }
fs.writeFileSync(path.join(ROOT, 'eval/welcome-retrieval.v1.jsonl'), rows.map((r) => JSON.stringify(r)).join('\n') + '\n')
console.log(`eval/welcome-retrieval.v1.jsonl: ${rows.length} questions (${rows.filter((r) => r.source === 'suggestion').length} suggestions)`)
