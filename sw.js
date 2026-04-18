const CACHE = 'bdm-v1';

const PRECACHE = [
  './index.html',
  './manifest.json',
  './assets/audio/musica-fundo.mp3',
  './assets/audio/som-serie.mp3',
  './assets/audio/som-livro-disponivel.mp3',
  './assets/audio/som-livro-indisponivel.mp3',
  './assets/audio/livro-abrindo.mp3',
  './assets/images/livro-azul.png',
  './assets/images/livro-verde.png',
  './assets/icons/icon-192x192.png',
  './assets/icons/icon-512x512.png',
  './assets/icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      // Usa addAll ignorando falhas individuais (ex: arquivo de áudio ausente)
      Promise.allSettled(PRECACHE.map(url => cache.add(url)))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Ignora requisições externas (CDN, Google Fonts, etc.)
  if (!e.request.url.startsWith(self.location.origin)) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        // Armazena no cache apenas respostas válidas
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => {
        // Fallback offline: retorna index.html para navegação
        if (e.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
