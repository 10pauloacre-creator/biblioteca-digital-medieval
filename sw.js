const SHELL_CACHE = 'bdm-shell-v7';
const BOOKS_CACHE = 'bdm-books-v1';

// Arquivos essenciais do app (carregados na instalação)
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

// Instala o shell do app
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(SHELL_CACHE)
      .then(cache => Promise.allSettled(PRECACHE.map(url => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

// Limpa caches antigos, mantém shell + books
self.addEventListener('activate', e => {
  const VALID = [SHELL_CACHE, BOOKS_CACHE];
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => !VALID.includes(k)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Detecta se a URL é um livro (pasta /livros/)
function isBookRequest(url) {
  return url.pathname.includes('/livros/');
}

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Ignora CDN externos (Google Fonts, Tailwind, etc.)
  if (url.origin !== self.location.origin) return;

  if (isBookRequest(url)) {
    // LIVROS: Network-first → salva no cache de livros para acesso offline
    e.respondWith(
      fetch(e.request)
        .then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(BOOKS_CACHE).then(cache => cache.put(e.request, clone));
          }
          return response;
        })
        .catch(() => {
          // Offline: entrega versão em cache do livro
          return caches.match(e.request);
        })
    );
  } else {
    // SHELL / OUTROS: Cache-first → fallback para network
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(response => {
          if (response && response.status === 200 && response.type === 'basic') {
            const clone = response.clone();
            caches.open(SHELL_CACHE).then(cache => cache.put(e.request, clone));
          }
          return response;
        }).catch(() => {
          if (e.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
    );
  }
});

// Mensagens da página → lista livros salvos offline
self.addEventListener('message', e => {
  if (e.data === 'GET_CACHED_BOOKS') {
    caches.open(BOOKS_CACHE).then(cache =>
      cache.keys().then(keys => {
        e.source.postMessage({
          type: 'CACHED_BOOKS',
          urls: keys.map(r => r.url)
        });
      })
    );
  }
});
