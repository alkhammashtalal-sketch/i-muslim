// Where /api/* lives (reply 0033 §ب2). The web build is served by the Worker itself, so every path stays relative,
// exactly as before. The native build (Capacitor, `npm run build:native`) carries the interface inside the app, whose
// own origin is capacitor://localhost (iOS) or https://localhost (Android), and talks to the Worker at the absolute
// base VITE_API_BASE fixed at build time (for TestFlight: https://i-muslim-next.alkhammashtalal.workers.dev).
// Every /api/* request in web/src goes through api(); files in public/ (fonts, icons, geo, recitation timings,
// reviewed explanations) are inside the app and stay relative. worker/test/native-shell.test.ts fails on any
// '/api/…' string in web/src that is not wrapped in api().

// `typeof` keeps the module loadable where Vite's define has not run (the worker's tests import web modules).
export const API_BASE: string = typeof __API_BASE__ === 'string' ? __API_BASE__ : ''

/** The URL of an /api/* path: relative in the web build, absolute in the native build. */
export const api = (path: `/api/${string}`): string => API_BASE + path

/**
 * The public address for links meant for other people (sharing an ayah, a hadith or a passage): the page's own origin
 * on the web; in the native app, whose origin is local to the device, the Worker that serves the same web app.
 */
export const webOrigin = (): string => API_BASE || location.origin
