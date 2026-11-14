// Defined in vite.config.ts: true only when building with VITE_ASK_MODE=mock (local development).
declare const __ASK_MOCK__: boolean
// Defined in vite.config.ts: '' in the web build (every /api/* path stays relative to the page), and the Worker's
// absolute origin, from VITE_API_BASE, in the native build (`npm run build:native`; reply 0033 §ب2). Read through
// web/src/api/base.ts only.
declare const __API_BASE__: string
// The app's version (web/package.json, equal to MARKETING_VERSION in the iOS project; reply 0042).
declare const __APP_VERSION__: string
