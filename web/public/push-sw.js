// Prayer bells and the daily-portion reminder (reply 0032 part E), loaded into the generated service worker by
// importScripts (vite.config.ts). The message carries only its title, text, tag and the page to open.
self.addEventListener('push', (event) => {
  let m = {}
  try {
    m = event.data ? event.data.json() : {}
  } catch {
    m = {}
  }
  event.waitUntil(
    self.registration.showNotification(m.title || 'مسلم', {
      body: m.body || '',
      tag: m.tag || 'muslim',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: m.url || '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) if (c.url.startsWith(self.location.origin) && 'focus' in c) return c.navigate(url).then((w) => (w || c).focus())
      return self.clients.openWindow(url)
    }),
  )
})
