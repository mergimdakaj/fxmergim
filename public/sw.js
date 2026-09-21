// Service Worker for ICT & MSNR Gold Trading Notifications
// Handles background notifications, vibrations, and click-to-open

self.addEventListener('install', (event) => {
  // Immediately activate new service worker
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Take control of all open pages immediately
  event.waitUntil(self.clients.claim());
});

// Handle incoming push events (if backend web push is configured)
self.addEventListener('push', (event) => {
  let data = {
    title: '⚡ HYRJE E RE ICT / MSNR!',
    body: 'Çmimi kapi pikën e hyrjes (Entry). Kontrolloni tregtinë tani!',
    icon: '/pwa-192x192.png',
    badge: '/icon.svg',
    tag: 'trading-alert-' + Date.now(),
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    } catch {
      data.body = event.data.text() || data.body;
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/pwa-192x192.png',
    badge: data.badge || '/icon.svg',
    vibrate: [300, 100, 300, 100, 400],
    tag: data.tag || 'trading-alert',
    renotify: true,
    requireInteraction: true,
    data: {
      url: data.url || '/',
      timestamp: Date.now(),
    },
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          return;
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
