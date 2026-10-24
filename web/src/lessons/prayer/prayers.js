// «علّمني الصلاة» for each prayer (add-on 0072-add13): the prayers' definitions and their steps.
//
// A definitions set is what our server will send (add-on 0072-add13 §2, as it sends the names): its version (v: 1),
// its batch, its words (Arabic and English) and its prayers, each with its time's name on the prayer-times screen,
// its rakahs, how each rakah is recited and its steps (seq), every step an approved lesson step by its key (k) with
// what the prayer sets on it — words by their ids, the texts by their refs ('<step>/<list>/<index>#<id>': a node of
// the approved data, held to its id). A later batch may bring steps of its own (steps: the lesson data's shape, every
// hadith by its id, position and hash as in prayer-data.json) and the HadeethEnc rows they name (hadith: class,
// version, link, hashes); its texts are still asked of our server by id and shown only when they are the reviewed
// bytes (../texts.js).
//
// Batch 1 (the five prayers) is bundled (prayers-batch-1.json, written by scripts/lessons/prayers.mjs from
// template.js) and stays the offline fallback: loadPrayers asks our server for its set and keeps the bundled one
// whenever the answer is missing or does not hold together (validate below), so a set that names a step, a word or a
// text the app does not have is never shown.

const ID = /^[a-z][a-z0-9_]{1,23}$/
const REF = /^[a-z][a-z0-9_]*(\/[a-z0-9_]+)+#\d{1,7}$/

/** The node a ref names in the lesson's data (steps by key), or null when it is not there or is not that id. */
export function resolveRef(ref, steps) {
  if (typeof ref !== 'string' || !REF.test(ref)) return null
  const [path, id] = ref.split('#')
  const [key, ...parts] = path.split('/')
  let o = steps.find((s) => s.key === key)
  for (const p of parts) o = o == null ? undefined : o[/^\d+$/.test(p) ? Number(p) : p]
  return o && typeof o === 'object' && String(o.id) === id ? o : null
}

const isWords = (w) => !!w && typeof w === 'object' && typeof w.ar === 'string' && typeof w.en === 'string' && !!w.ar && !!w.en

/** Why a set cannot be shown (an empty list when it can). `data`: the approved lesson's data (prayer-data.json). */
export function validate(set, data) {
  const errs = []
  if (!set || typeof set !== 'object' || set.v !== 1) return ['not a version-1 set']
  if (!Array.isArray(set.prayers) || !set.prayers.length) return ['no prayers']
  const words = set.words && typeof set.words === 'object' ? set.words : {}
  for (const [k, w] of Object.entries(words)) if (!isWords(w)) errs.push(`word ${k}`)
  const extra = Array.isArray(set.steps) ? set.steps : []
  const hadith = { ...data.hadith, ...(set.hadith && typeof set.hadith === 'object' ? set.hadith : {}) }
  for (const [id, H] of Object.entries(set.hadith ?? {}))
    if (!/^\d{1,7}$/.test(id) || !['sahih', 'hasan'].includes(H?.class) || typeof H?.ar?.url !== 'string') errs.push(`hadith ${id}`)
  for (const s of extra) {
    if (!s || !ID.test(s.key ?? '') || !isWords(s.title) || !isWords(s.do) || !Array.isArray(s.how)) errs.push(`step ${s?.key}`)
    else if (data.steps.some((b) => b.key === s.key)) errs.push(`step ${s.key} is an approved step's key`)
    // every hadith a new step names is a row the set or the app knows
    const ids = []
    const walk = (o) => (Array.isArray(o) ? o.forEach(walk) : o && typeof o === 'object' && (typeof o.id === 'string' && o.ar?.sha && ids.push(o.id), Object.values(o).forEach(walk)))
    walk(s)
    for (const id of ids) if (!hadith[id]) errs.push(`step ${s.key}: hadith ${id}`)
  }
  const steps = [...data.steps, ...extra]
  const keys = new Set(steps.map((s) => s.key))
  const seen = new Set()
  for (const p of set.prayers) {
    const at = `prayer ${p?.id}`
    if (!p || !ID.test(p.id ?? '') || seen.has(p.id)) {
      errs.push(at)
      continue
    }
    seen.add(p.id)
    if (!isWords(p.name) || !isWords(p.recite)) errs.push(`${at}: name or recitation`)
    if (!Number.isInteger(p.rakat) || p.rakat < 0 || p.rakat > 8) errs.push(`${at}: rakat`)
    if (p.time != null && typeof p.time !== 'string') errs.push(`${at}: time`)
    if (!Array.isArray(p.seq) || !p.seq.length) {
      errs.push(`${at}: no steps`)
      continue
    }
    p.seq.forEach((it, i) => {
      const where = `${at} step ${i + 1}`
      if (!it || !keys.has(it.k)) return errs.push(`${where}: no step ${it?.k}`)
      if (it.r != null && (!Number.isInteger(it.r) || it.r < 0 || it.r > p.rakat)) errs.push(`${where}: rakah`)
      for (const f of ['pos', 'cue', 'title', 'tag']) if (it[f] != null && !isWords(words[it[f]])) errs.push(`${where}: ${f} ${it[f]}`)
      if (it.do != null) {
        const ok = it.do.startsWith?.('@') ? keys.has(it.do.slice(1)) : isWords(words[it.do])
        if (!ok) errs.push(`${where}: do ${it.do}`)
      }
      if (it.khilaf != null && (!Array.isArray(it.khilaf) || it.khilaf.some((k) => !steps.find((s) => s.key === k)?.khilaf))) errs.push(`${where}: khilaf`)
      for (const f of ['ev', 'rulings', 'add', 'hide']) {
        if (it[f] == null) continue
        if (!Array.isArray(it[f])) errs.push(`${where}: ${f}`)
        else for (const r of it[f]) if (!resolveRef(r, steps)) errs.push(`${where}: ${f} ${r}`)
      }
      if (it.sit != null && it.sit !== 1 && it.sit !== 2) errs.push(`${where}: sit`)
      if (it.pose != null && !/^[a-z_0-9]{2,20}$/.test(it.pose)) errs.push(`${where}: pose`)
      if (it.feet != null && !(it.feet in (data.feet ?? {}))) errs.push(`${where}: feet ${it.feet}`)
    })
  }
  return errs
}

/** The bundled set with what our server adds: its new prayers after the bundled ones, and a newer definition of a
 *  bundled prayer (a higher batch) in its place. A server set that does not hold together adds nothing. */
export function mergeSets(bundled, remote, data) {
  if (!remote || typeof remote !== 'object' || remote.v !== 1 || !Array.isArray(remote.prayers) || !remote.prayers.length) return bundled
  const prayers = [...bundled.prayers]
  for (const p of remote.prayers) {
    if (!p || typeof p !== 'object') return bundled
    const i = prayers.findIndex((b) => b.id === p.id)
    if (i < 0) prayers.push(p)
    else if ((p.batch ?? 0) > (prayers[i].batch ?? 0)) prayers[i] = p
  }
  const merged = {
    v: 1,
    batch: Math.max(bundled.batch ?? 1, remote.batch ?? 1),
    words: { ...remote.words, ...bundled.words },
    steps: [...(bundled.steps ?? []), ...(remote.steps ?? [])],
    hadith: { ...(bundled.hadith ?? {}), ...(remote.hadith ?? {}) },
    prayers,
  }
  // the bundled words keep their reviewed wording; a remote prayer that needs one of its own must name it anew
  return validate(merged, data).length ? bundled : merged
}

/** Our server's set, merged with the bundled one; the bundled set when it does not answer. `fetchJson()` → the parsed
 *  answer of GET /api/lessons/prayers (asked through the app's api(…), lesson-prayer.tsx) or null. Nothing is kept:
 *  offline, the bundled set is the lesson. */
export async function loadPrayers({ bundled, data, fetchJson }) {
  const remote = await Promise.resolve()
    .then(() => fetchJson())
    .catch(() => null)
  return mergeSets(bundled, remote, data)
}

/** The renderer's steps for one prayer: each approved step as it is (its texts are the approved nodes themselves,
 *  so ../texts.js knows them), with the prayer's words, rulings and texts set on it, and its place in the prayer. */
export function buildSteps(p, set, steps) {
  const words = set.words
  const byKey = Object.fromEntries(steps.map((s) => [s.key, s]))
  const w = (id) => (id ? words[id] : null)
  return p.seq.map((it, i) => {
    const b = byKey[it.k]
    const st = { ...b, n: i, repeat: null, then: null, at: it }
    if (it.title) st.title = w(it.title)
    if (it.do) st.do = it.do.startsWith('@') ? byKey[it.do.slice(1)].do : w(it.do)
    if (it.tag) st.tag = w(it.tag)
    if (it.pose) st.pose = it.pose
    if (it.feet) st.feet = it.feet
    if (it.rulings) st.rulings = it.rulings.map((r) => resolveRef(r, steps))
    // approved texts left out here (hide), and others shown here too (add: HadeethEnc under the evidence, Ibn Baz after it)
    const hide = new Set((it.hide ?? []).map((r) => resolveRef(r, steps)))
    const add = (it.add ?? []).map((r) => resolveRef(r, steps))
    if (hide.size || add.length) {
      st.how = [...b.how.filter((x) => !hide.has(x)), ...add.filter((x) => !isBinbaz(x))]
      st.bbhow = [...(b.bbhow ?? []).filter((x) => !hide.has(x)), ...add.filter(isBinbaz)]
    }
    // the disputed-matter boxes: the step's own, or those the prayer names (each with its step's sunnah.com rows)
    const box = (s) => ({ khilaf: s.khilaf, sunnah: (s.sunnah ?? []).filter((x) => x.place === 'khilaf') })
    st.khilafs = it.khilaf ? it.khilaf.map((k) => box(byKey[k])) : b.khilaf ? [box(b)] : []
    st.khilaf = st.khilafs[0]?.khilaf ?? null
    st.cue = it.cue ? { text: w(it.cue), ev: (it.ev ?? []).map((r) => resolveRef(r, steps)) } : null
    st.posName = w(it.pos)
    return st
  })
}

/** An Ibn Baz excerpt (his words, with his page), as against a HadeethEnc node. */
export const isBinbaz = (o) => typeof o?.text === 'string' && /^https:\/\/binbaz\.org\.sa\//.test(String(o.url ?? ''))
