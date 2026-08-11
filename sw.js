// VectorScan AI — Service Worker
// Rôle : rendre l'app installable (Android "Ajouter à l'écran d'accueil" /
// iOS Safari "Sur l'écran d'accueil") et permettre l'ouverture de l'interface
// hors connexion. Les fonctionnalités réseau (IA, cartes, géocodage) restent
// indisponibles hors ligne — seule la coquille de l'app (HTML/CSS/JS/icônes)
// est mise en cache.

const CACHE_NAME = 'vectorscan-shell-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Coquille de l'app : cache d'abord, réseau en secours (et mise à jour du cache)
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const fetchPromise = fetch(req)
          .then((res) => {
            if (res && res.status === 200) {
              const clone = res.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
            }
            return res;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Ressources externes (CDN, cartes, API) : réseau direct, pas de cache
  event.respondWith(fetch(req).catch(() => caches.match(req)));
});
