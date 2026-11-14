// The hadith page's references (reply 0031-add16 §3): HadeethEnc's reference field holds one reference per line, shown
// as written. The first two lines are always shown, the rest under a collapsed «كل المراجع»; with two lines or fewer
// there is no disclosure. Lines are only split, never edited; an empty line has nothing to show and is skipped.
export const SHOWN_REFERENCES = 2

export function splitReferences(ref: string | null | undefined): { shown: string[]; rest: string[] } {
  const lines = (ref ?? '').split(/\r?\n/).filter((l) => l.trim() !== '')
  return { shown: lines.slice(0, SHOWN_REFERENCES), rest: lines.slice(SHOWN_REFERENCES) }
}
