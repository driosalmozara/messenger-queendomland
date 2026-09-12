/* Messenger Queendomland SW v2 — Corregido y Optimizado */
const CACHE = 'ql-messenger-v2';
const STATIC = [
  './manifest.json',
  './corona.png',
  './icono-q.png', // Añadido el ícono que usas en tus HTML
  './trono-de-oro.css',
  './toasts.js',
  './index.html'   // Precargar la portada principal
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC)).catch(err => console.warn('Falló precarga:', err))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;

  // 1. Navegaciones (HTML): Network First, fallback a caché
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const copy = res.clone();
          // CORRECCIÓN: Guardamos la URL exacta solicitada, no siempre './index.html'
          caches.open(CACHE).then(c => c.put(e.request, copy));
          return res;
        })
        .catch(() => {
          // Si falla la red, buscamos la página en caché. Si no está, mostramos index.html (o offline.html)
          return caches.match(e.request).then(res => res || caches.match('./index.html'));
        })
    );
    return;
  }

  // 2. Estáticos (CSS, JS, Imágenes): Stale-While-Revalidate (Caché primero, actualiza en segundo plano)
  e.respondWith(
    caches.match(e.request).then(hit => {
      const refresh = fetch(e.request)
        .then(res => {
          if (res && res.ok) { 
            const copy = res.clone(); 
            caches.open(CACHE).then(c => c.put(e.request, copy)); 
          }
          return res;
        })
        .catch(() => hit);
      return hit || refresh;
    })
  );
});

// Escucha mensajes desde la ventana para forzar actualización manual
self.addEventListener('message', e => { 
  if (e.data === 'skipWaiting') self.skipWaiting(); 
});

// Notificaciones Push
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) {}
  const options = {
    body: d.body || 'Actividad nueva en la casa.',
    icon: d.icon || './icono-q.png',
    badge: './corona.png',
    vibrate: [100, 50, 100],
    data: { url: d.url || './' },
    actions: d.actions || [] // Soporte para botones en la notificación
  };
  e.waitUntil(self.registration.showNotification(d.title || '♛ Queendomland', options));
});

// Clic en Notificación
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || './';
  
  // Si el usuario hizo clic en una acción (botón) de la notificación
  if (e.action) {
    // Aquí puedes manejar rutas específicas si agregas botones a tus push
    console.log('Acción de notificación:', e.action);
  }

  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) { 
      if (c.url.includes(url) && 'focus' in c) return c.focus(); 
    }
    return clients.openWindow(url);
  }));
});
