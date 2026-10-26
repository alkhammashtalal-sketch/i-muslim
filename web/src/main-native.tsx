// The entry of the iOS/Android app's build (vite.config.ts puts it in index.html in place of main.tsx for
// `vite build --mode native`; the web build keeps main.tsx as it is). The app reads its saved data synchronously, and
// several modules read it as soon as they load, so the device's storage (src/storage/device.ts: Preferences, and the
// one-time move from localStorage) is loaded into memory first, and only then is the app itself loaded (add-on
// 0072-add25). If Preferences does not answer, the app runs on localStorage as before.
// Then, in the iPhone app, the copy in the person's iCloud (storage/cloud.ts; add-on 0072-add34 §ب2), merged before the
// first render too, with its own short deadline; without iCloud nothing happens.
import { startCloud } from './storage/cloud'
import { hydrateStorage } from './storage/device'

void hydrateStorage()
  .then(() => startCloud())
  .catch(() => undefined)
  .finally(() => import('./main.tsx'))
