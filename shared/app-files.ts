// Two kinds of static files of web/public that the iOS/Android app reads from the server with the connection, and from
// its own copy without it (reply 0037 §3.4): before, the app carried them unchanged until its next store update.
//   GET /api/config/hijri               → config/hijri.json (the global Hijri offset, set after the announcement)
//   GET /api/reviewed/:lang/:sura/:aya  → explain/:lang/:sura_:aya.json (the reviewed al-Muyassar translations)
// The Worker answers these routes with the deployed files' own bytes (worker/src/app-files.ts); the app's offline layer
// falls back to the same file inside the app (web/src/native/offline.ts). The web build keeps reading the static files
// themselves, served without the Worker. One definition for both sides.

/** The languages the reviewed translations are published in: the nine interface languages besides Arabic. */
export const REVIEWED_LANGS: readonly string[] = ['en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi']

const n = (s: string, max: number) => {
  const v = Number(s)
  return v >= 1 && v <= max ? v : null
}

/** The file in web/public (no leading slash) that an /api/ path stands for, or null when it is not one of them. */
export function appFileOf(pathname: string): string | null {
  if (pathname === '/api/config/hijri') return 'config/hijri.json'
  const m = pathname.match(/^\/api\/reviewed\/([a-z]{2})\/([1-9]\d{0,2})\/([1-9]\d{0,2})$/)
  if (m && REVIEWED_LANGS.includes(m[1]) && n(m[2], 114) && n(m[3], 286)) return `explain/${m[1]}/${m[2]}_${m[3]}.json`
  return null
}
