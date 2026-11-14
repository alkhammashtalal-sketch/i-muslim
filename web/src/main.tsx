// First: inside the iOS/Android app, the offline layer must stand before any module reads the API (reply 0033 §ب3).
import './native/boot'
import '@fontsource/ibm-plex-sans-arabic/400.css'
import '@fontsource/ibm-plex-sans-arabic/500.css'
import '@fontsource/ibm-plex-sans-arabic/600.css'
import '@fontsource/ibm-plex-sans-arabic/700.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { isNative } from './native/platform'
import './styles/amiri-text.css'
// Bengali and Devanagari shipped with the app, first in the interface stack of bn and hi (add-on 0072-add58 §2).
import './styles/fonts-bnhi.css'
// Amharic, Gujarati, Kannada, Punjabi and N'Ko reach the system's fonts, not system-ui (add-on 0072-add60 §7).
import './styles/fonts-add60.css'
import './styles/tokens.css'
import './styles/app.css'
import './styles/v2-shell.css'
// Last of the global styles: the few boxes widened for text at 200% (add-on 0072-add34 §ب3).
import './styles/larger-text.css'

// No service worker in the iOS/Android app (reply 0033 §ب2): the native build has none (vite.config.ts), and any
// registration the web view might hold is removed.
if (isNative()) void navigator.serviceWorker?.getRegistrations().then((rs) => rs.forEach((r) => void r.unregister()), () => {})

const start = () =>
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
// The iOS simulator's approval shots of the date card's sky, in test builds only (VITE_SKY_TEST=1; sky-test.ts).
if (import.meta.env.VITE_SKY_TEST) void import('./sky-test').then((m) => m.applySkyTest()).finally(start)
// And the calendar's shots (reply 0062; VITE_CAL_TEST=1; cal-test.ts).
else if (import.meta.env.VITE_CAL_TEST) void import('./cal-test').then((m) => m.applyCalTest()).finally(start)
else start()
