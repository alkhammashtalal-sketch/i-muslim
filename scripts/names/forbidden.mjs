// The book whose order inspired the names list is never named in the app or its data (replies 0068 and 0071 §4.2,
// add-on 0071-add1). Its title is not written here either: only the SHA-256 of its normalized forms (Arabic, and the
// English of its translation), compared with every window of the same length in a text. Used by
// scripts/names/daily-build.mjs on its output and by worker/test/names-day.test.ts on the data and the app's files.
import crypto from 'node:crypto'

/** Diacritics, tatweel and joiners removed, the alef forms as one, spaces collapsed, lower case. */
export const normalize = (s) =>
  String(s)
    .normalize('NFC')
    .replace(/[ً-ٰٟـ‌‍]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/\s+/g, ' ')
    .toLowerCase()

/** [length of the normalized title, its SHA-256]. */
const FORBIDDEN = [
  [9, '13ef8653e9ebf29359869c539fe3488c5447f69fc30356abd10315373de60745'],
  [21, '7c5ae93ffbb8176e24dc1c62dcbd90bb2ff3fa8128f17bd693b9cb767cdb1991'],
]

const sha = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex')

/** The offsets (in the normalized text) where a forbidden title occurs; empty when none. */
export function findForbidden(text) {
  const t = normalize(text)
  const at = []
  for (const [len, hash] of FORBIDDEN) {
    for (let i = 0; i + len <= t.length; i++) {
      // Both titles begin with a letter, so a window that begins with a space is not hashed.
      if (t[i] === ' ') continue
      if (sha(t.slice(i, i + len)) === hash) at.push(i)
    }
  }
  return at
}
