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
import './styles/tokens.css'
import './styles/app.css'
import './styles/v2-shell.css'

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
else start()
