// The lessons' hadith and ayah texts, asked of our server by id when a step needs them (add-on 0072, decision 1 of the
// review; CLAUDE.md §7 and §3 rule 4). The lesson's data holds no hadith or ayah text: only where each one is — the
// hadith's id, its field, the benefit's or word's index, the slice [start, end) in code points as the review page cut
// it — and the first 16 hex digits of the SHA-256 of the reviewed bytes (scripts/lessons/build.mjs). A text is shown
// only when what the server sends cuts to those same bytes; otherwise the step shows its reference and link and no
// text (a server that does not answer, or a source that changed since the review). Nothing is kept beyond the page.
// Shared by the lessons' renderers (<id>/lesson.js) and held to the Worker's own answers by
// worker/test/lessons-0072.test.ts.

/** Python's s[a:b]: by code points. */
export const cut = (s, a, b) => Array.from(s).slice(a, b).join('')

/** The first 16 hex digits of the SHA-256 of the text's UTF-8 bytes; null where the browser cannot hash. */
export async function sha16(text) {
  if (!globalThis.crypto?.subtle) return null
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(d)].slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** A HadeethEnc row as GET /api/hadith/:id sends it (worker/src/hadith.ts toHadith), in the review data's field names. */
export const hadithFields = (row) =>
  row ? { hadeeth: row.text, explanation: row.explanation, hints: row.hints, words_meanings: row.words, grade: row.grade, attribution: row.attribution } : null

/** An ayah as GET /api/passage/quran:S:A sends it (worker/src/passage.ts), in the review data's field names. */
export const ayahFields = (p) => (p ? { text: p.text, text_en: p.text_en, muyassar: p.tafsir?.find((t) => t.key === 'muyassar')?.text } : null)

/** A field of a row as the review page cut it: the text, the explanation, a benefit or a word's meaning by its index. */
export function fieldText(fields, field, idx) {
  let v = fields?.[field]
  if (typeof idx === 'number') v = Array.isArray(v) ? v[idx] : undefined
  if (field === 'words_meanings' && v && typeof v === 'object') v = v.meaning
  return typeof v === 'string' ? v : null
}

const WAIT = { s: 'wait' }
const NONE = { s: 'none' }

/**
 * data: the lesson's data (its hadith rows, ayat, steps and close-ups); lang: 'ar' or 'en', the content language.
 * fetchHadith(id, lang) → the server's { ar, tr? } or null; fetchAyah(id) → the server's passage or null.
 */
export function createTexts({ data, lang, fetchHadith, fetchAyah }) {
  // every excerpt (a slice node: { start, end, field, idx?, sha }) by its hadith and language
  const owner = new WeakMap()
  const uses = new Map()
  const walk = (o) => {
    if (Array.isArray(o)) return o.forEach(walk)
    if (!o || typeof o !== 'object') return
    for (const k of Object.keys(o)) {
      const v = o[k]
      if ((k === 'ar' || k === 'en') && v && typeof v.sha === 'string' && typeof v.start === 'number' && typeof o.id === 'string' && o.id in data.hadith) {
        owner.set(v, { id: o.id, lang: k })
        if (!uses.has(o.id)) uses.set(o.id, [])
        uses.get(o.id).push({ node: v, lang: k })
      } else walk(v)
    }
  }
  walk(data.steps)
  walk(data.feet ?? {})

  const state = new Map() // 'h:<id>' | 'q:<id>' → 'wait' | 'ok' | 'none'
  const sliceText = new WeakMap() // node → the matching text
  const whole = new Map() // '<id>|<lang>|<field>' or '<quran id>|<field>' → the matching text

  async function loadHadith(id) {
    const res = await fetchHadith(id, lang).catch(() => null)
    if (!res?.ar) return false
    const rows = { ar: hadithFields(res.ar), en: res.tr?.lang === 'en' ? hadithFields(res.tr) : null }
    for (const { node, lang: l } of uses.get(id) ?? []) {
      const src = fieldText(rows[l], node.field, node.idx)
      if (src == null) continue
      const text = cut(src, node.start, node.end)
      if ((await sha16(text)) === node.sha) sliceText.set(node, text)
    }
    for (const l of ['ar', 'en']) {
      for (const [field, sha] of Object.entries(data.hadith[id]?.[l]?.sha ?? {})) {
        const text = fieldText(rows[l], field)
        if (text != null && (await sha16(text)) === sha) whole.set(`${id}|${l}|${field}`, text)
      }
    }
    return true
  }
  async function loadAyah(id) {
    const f = ayahFields(await fetchAyah(id).catch(() => null))
    if (!f) return false
    for (const [field, sha] of Object.entries(data.quran?.[id]?.sha ?? {})) {
      const text = f[field]
      if (typeof text === 'string' && (await sha16(text)) === sha) whole.set(`${id}|${field}`, text)
    }
    return true
  }
  const load = (key, fn) => {
    state.set(key, 'wait')
    return fn().then(
      (ok) => state.set(key, ok ? 'ok' : 'none'),
      () => state.set(key, 'none'),
    )
  }
  const at = (key, got) => {
    const s = state.get(key)
    if (s === 'ok') return got == null ? NONE : { s: 'ok', text: got }
    return s === 'none' ? NONE : WAIT
  }

  return {
    /** Ask for what a part of the lesson needs (its hadith ids, its ayah ids); a promise when anything new was asked,
     *  settled once all of it has answered, else null. */
    need(o) {
      const hs = new Set(), qs = new Set()
      const seek = (x) => {
        if (Array.isArray(x)) return x.forEach(seek)
        if (typeof x === 'string') {
          if (/^quran:\d{1,3}:\d{1,3}$/.test(x) && data.quran?.[x]) qs.add(x)
          return
        }
        if (!x || typeof x !== 'object') return
        if (typeof x.id === 'string' && x.id in data.hadith) hs.add(x.id)
        Object.values(x).forEach(seek)
      }
      seek(o)
      const jobs = [...[...hs].filter((id) => !state.has(`h:${id}`)).map((id) => load(`h:${id}`, () => loadHadith(id))),
        ...[...qs].filter((id) => !state.has(`q:${id}`)).map((id) => load(`q:${id}`, () => loadAyah(id)))]
      return jobs.length ? Promise.all(jobs) : null
    },
    /** An excerpt by its slice node: { s: 'ok', text } | { s: 'wait' } | { s: 'none' }. */
    slice(node) {
      const o = owner.get(node)
      return o ? at(`h:${o.id}`, sliceText.get(node)) : NONE
    },
    /** A hadith row's field shown whole (the text, the explanation, the grade, the attribution). */
    hadith(id, l, field) {
      return at(`h:${id}`, whole.get(`${id}|${l}|${field}`))
    },
    /** An ayah's field: 'text', 'text_en' (Sahih International), 'muyassar'. */
    ayah(id, field) {
      return at(`q:${id}`, whole.get(`${id}|${field}`))
    },
  }
}
