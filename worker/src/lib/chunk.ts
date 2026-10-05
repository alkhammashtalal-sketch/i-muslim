import { stripTags } from './normalize.ts'

/** Split al-Saadi's commentary on one ayah into ~800-character chunks at paragraph (then sentence) boundaries. */
export function chunkSaadi(html: string, target: number): string[] {
  const paras = html
    .split(/<\/p>|<br\s*\/?>/i)
    .map(stripTags)
    .filter((p) => p.length > 0)
  const pieces: string[] = []
  for (const p of paras) {
    if (p.length <= target * 1.5) {
      pieces.push(p)
      continue
    }
    // Sentences, and any sentence still too long is cut between words.
    const sentences = p.split(/(?<=[.؟!:،])\s+/).flatMap((s) => (s.length <= target ? [s] : byWords(s, target)))
    let buf = ''
    for (const s of sentences) {
      if (buf && buf.length + s.length + 1 > target) {
        pieces.push(buf)
        buf = ''
      }
      buf = buf ? `${buf} ${s}` : s
    }
    if (buf) pieces.push(buf)
  }
  const chunks: string[] = []
  let cur = ''
  for (const p of pieces) {
    if (cur && cur.length + p.length + 1 > target) {
      chunks.push(cur)
      cur = ''
    }
    cur = cur ? `${cur}\n${p}` : p
  }
  if (cur) chunks.push(cur)
  return chunks
}

function byWords(s: string, target: number): string[] {
  const out: string[] = []
  let buf = ''
  for (const w of s.split(/\s+/)) {
    if (buf && buf.length + w.length + 1 > target) {
      out.push(buf)
      buf = ''
    }
    buf = buf ? `${buf} ${w}` : w
  }
  if (buf) out.push(buf)
  return out
}
