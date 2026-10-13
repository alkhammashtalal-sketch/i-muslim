// First import of main.tsx (before any module can read the API): inside the iOS/Android app, every GET to the API goes
// through the offline layer (web/src/native/offline.ts), which answers what the device holds and passes the rest to
// the network. In a browser this file does nothing (the web keeps its service worker). Reply 0033 §ب3.
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { API_BASE } from '../api/base'
import { ML } from '../quran/api'
import { createOffline, type Kv, type Offline } from './offline'
import { isNative } from './platform'

// Library/NoCloud on iOS: kept like the app's own data, never purged by the system, never copied to iCloud (the
// meanings and kept reads can be downloaded again). Android: the app's files folder.
const ROOT = 'muslim-offline'
const fsKv: Kv = {
  async get(path) {
    try {
      const r = await Filesystem.readFile({ path: `${ROOT}/${path}`, directory: Directory.LibraryNoCloud, encoding: Encoding.UTF8 })
      return typeof r.data === 'string' ? r.data : await r.data.text()
    } catch {
      return null
    }
  },
  async put(path, data) {
    await Filesystem.writeFile({ path: `${ROOT}/${path}`, data, directory: Directory.LibraryNoCloud, encoding: Encoding.UTF8, recursive: true })
  },
  async remove(path) {
    await Filesystem.deleteFile({ path: `${ROOT}/${path}`, directory: Directory.LibraryNoCloud }).catch(() => undefined)
  },
  async list(dir) {
    try {
      return (await Filesystem.readdir({ path: `${ROOT}/${dir}`, directory: Directory.LibraryNoCloud })).files.map((f) => f.name)
    } catch {
      return []
    }
  },
}

export let offline: Offline | null = null

if (isNative() && API_BASE && typeof window !== 'undefined') {
  const net = window.fetch.bind(window)
  offline = createOffline({
    kv: fsKv,
    net: (href) => net(href),
    // The app's copy is a file of the app itself (capacitor://localhost/offline/…).
    bundle: async (rel) => {
      const r = await net(`/offline/${rel}`)
      return r.ok ? await r.text() : null
    },
    // The web/public files the app carries (capacitor://localhost/config/hijri.json, /explain/…): JSON only, so a
    // missing file answered with the page itself is no answer (reply 0037 §3.4).
    appFile: async (rel) => {
      const r = await net(`/${rel}`)
      if (!r.ok) return null
      const text = await r.text()
      try {
        JSON.parse(text)
        return text
      } catch {
        return null
      }
    },
    apiBase: API_BASE,
    meaningLangs: ML,
  })
  const o = offline
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()
    const href = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    if (method === 'GET' && !init?.body) {
      const res = await o.answer(href)
      if (res) return res
    }
    return net(input, init)
  }
}
