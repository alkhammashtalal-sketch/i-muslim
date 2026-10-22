// Reply 0071 §2: the fixes to «اسأل», each behind its own name so each is measured on its own (eval/run-basic.mjs) on
// env v11 before any reaches next. env.ASK_FIXES lists the ones on, comma-separated; the evaluation runner may name
// others for its own requests only (admin routes open, with the token), as with `hadith`. Off, nothing differs.
//   level:      the gate's "general" rules skipped, and D the personal case alone (0069-add6 §1, 0071 §2.4)
//   phrase:     the question's words searched as a phrase too, for a partial or approximate quote (0071 §2.2)
//   understand: the model gives the search words and the text meant, and writes nothing shown (0071 §2.3)
//   grade-tr:   «هل حديث كذا صحيح؟» in the reader's language, against HadeethEnc's own translation (0071 §2.5)
//   grade-near: no wording matches: the hadith nearest by meaning, above a score and a margin set by measurement (§2.5)
//   evidence:   a personal case stays referred, with the text the general ruling rests on (0071 §4.4, 0069-add6 §2 أ)
//   hadith-answer: the hadiths the block kept answer alone when the ayat and creed passages do not (0071 §2.1, measured)
import type { Env } from './index'

export const FIXES = ['level', 'phrase', 'understand', 'grade-tr', 'grade-near', 'evidence', 'hadith-answer'] as const
export type Fix = (typeof FIXES)[number]
export type Fixes = ReadonlySet<Fix>

const parse = (xs: unknown[]): Set<Fix> => new Set(xs.map((x) => String(x).trim()).filter((x): x is Fix => (FIXES as readonly string[]).includes(x)))

/** The fixes on for a request: the evaluation runner's list when it gives one, else env.ASK_FIXES. */
export function fixesOf(env: Env, override?: unknown): Fixes {
  if (Array.isArray(override)) return parse(override)
  return parse((env.ASK_FIXES ?? '').split(','))
}

/** Part of the answers' cache key, so an answer made with a fix is never served without it, nor the other way round. */
export const fixesKey = (f: Fixes) => [...f].sort().join(',')
