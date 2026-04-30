// ═══════════════════════════════════════════════════════════════
// BIBLIOTECA DIGITAL MEDIEVAL — Service Worker v14
// Estratégia: cache completo no primeiro acesso
//   Shell + áudio → pré-cache na instalação
//   Vídeo/animação → cache em background após install
//   Livros HTML → pré-cache na instalação + atualização automática
//   Periodic Background Sync → verifica novos livros 1x/dia
//   Push Notifications → Mensagem do Mago Supremo
// ═══════════════════════════════════════════════════════════════

const SW_VERSION   = 'v15';
const SHELL_CACHE  = `bdm-shell-${SW_VERSION}`;  // assets versionados
const MEDIA_CACHE  = 'bdm-media-v3';             // vídeo/webm — persiste entre updates
const BOOKS_CACHE  = 'bdm-books-v2';             // livros HTML — persiste entre updates
const VALID_CACHES = [SHELL_CACHE, MEDIA_CACHE, BOOKS_CACHE];

// ── Shell: imagens, ícones, index, auth
const SHELL_ASSETS_CRITICAL = [
  './',
  './index.html',
  './manifest.json',
];

const SHELL_ASSETS_OPTIONAL = [
  './cache-manifest.json',
  './assets/gif/carregando-video.mp4', // tela de carregamento — deve estar no shell
  './assets/images/livro-azul.png',
  './assets/images/livro-verde.png',
  './assets/images/1-serie-home.png',
  './assets/images/2-serie-home.png',
  './assets/images/3-serie-home.png',
  './assets/images/placa.png',
  './assets/images/pilhadelivros.png',
  './assets/images/mensagem-pra-baixar.png',
  './assets/images/bota\u00e3o-baixar.png',
  './assets/images/splash-screen.png',
  './assets/images/splash-screen-pc.png',
  './assets/images/splash-screen-mobile.jpeg',
  './assets/images/login.png',
  './assets/images/perfil.png',
  './assets/images/forasteiro.png',
  './assets/icons/icon-192x192.png',
  './assets/icons/icon-512x512.png',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/favicon-32x32.png',
  // Páginas de autenticação — necessárias para login offline
  './auth/login.html',
  './auth/cadastro.html',
  './auth/perfil.html',
  './auth/admin.html',
  './assets/js/supabase-config.js',
];

// Retrocompatibilidade: lista completa usada em staleWhileRevalidate
const SHELL_ASSETS = [...SHELL_ASSETS_CRITICAL, ...SHELL_ASSETS_OPTIONAL];

// ── Áudio: pré-cache junto com o shell
const AUDIO_ASSETS = [
  './assets/audio/musica-fundo.mp3',
  './assets/audio/som-serie.mp3',
  './assets/audio/som-livro-disponivel.mp3',
  './assets/audio/som-livro-indisponivel.mp3',
  './assets/audio/livro-abrindo.mp3',
];

// ── Vídeo/animação: cache em background (arquivos grandes)
const MEDIA_ASSETS = [
  './assets/gif/carregando-video.mp4', // tela de carregamento — prioridade máxima
  './assets/gif/vide-de-fundo.mp4',
  './assets/gif/livro-abrindo.webm',
  './assets/gif/intro-pc.mp4',
  './assets/gif/intro-mobile.mp4',
];

// ── Todos os livros HTML (pré-cache completo)
const ALL_BOOKS = [
  // 1ª Série
  './livros/1-serie/lingua-portuguesa/1-bimestre.html',
  './livros/1-serie/lingua-portuguesa/2-bimestre.html',
  './livros/1-serie/lingua-portuguesa/3-bimestre.html',
  './livros/1-serie/lingua-portuguesa/4-bimestre.html',
  './livros/1-serie/trilhas-de-linguagens/1-bimestre.html',
  './livros/1-serie/trilhas-de-linguagens/2-bimestre.html',
  './livros/1-serie/trilhas-de-linguagens/3-bimestre.html',
  './livros/1-serie/trilhas-de-linguagens/4-bimestre.html',
  './livros/1-serie/trilhas-de-c-humanas/1-bimestre.html',
  './livros/1-serie/trilhas-de-c-humanas/2-bimestre.html',
  './livros/1-serie/trilhas-de-c-humanas/3-bimestre.html',
  './livros/1-serie/trilhas-de-c-humanas/4-bimestre.html',
  // 2ª Série
  './livros/2-serie/lingua-portuguesa/1-bimestre.html',
  './livros/2-serie/lingua-portuguesa/2-bimestre.html',
  './livros/2-serie/lingua-portuguesa/3-bimestre.html',
  './livros/2-serie/lingua-portuguesa/4-bimestre.html',
  './livros/2-serie/trilhas-de-linguagens/1-bimestre.html',
  './livros/2-serie/trilhas-de-linguagens/2-bimestre.html',
  './livros/2-serie/trilhas-de-linguagens/3-bimestre.html',
  './livros/2-serie/trilhas-de-linguagens/4-bimestre.html',
  './livros/2-serie/trilhas-de-c-humanas/1-bimestre.html',
  './livros/2-serie/trilhas-de-c-humanas/2-bimestre.html',
  './livros/2-serie/trilhas-de-c-humanas/3-bimestre.html',
  './livros/2-serie/trilhas-de-c-humanas/4-bimestre.html',
  './livros/2-serie/artes/1-bimestre.html',
  './livros/2-serie/artes/2-bimestre.html',
  './livros/2-serie/artes/3-bimestre.html',
  './livros/2-serie/artes/4-bimestre.html',
  // 3ª Série
  './livros/3-serie/lingua-portuguesa/1-bimestre.html',
  './livros/3-serie/lingua-portuguesa/2-bimestre.html',
  './livros/3-serie/lingua-portuguesa/3-bimestre.html',
  './livros/3-serie/lingua-portuguesa/4-bimestre.html',
  './livros/3-serie/trilhas-de-linguagens/1-bimestre.html',
  './livros/3-serie/trilhas-de-linguagens/2-bimestre.html',
  './livros/3-serie/trilhas-de-linguagens/3-bimestre.html',
  './livros/3-serie/trilhas-de-linguagens/4-bimestre.html',
  './livros/3-serie/trilhas-de-c-humanas/1-bimestre.html',
  './livros/3-serie/trilhas-de-c-humanas/2-bimestre.html',
  './livros/3-serie/trilhas-de-c-humanas/3-bimestre.html',
  './livros/3-serie/trilhas-de-c-humanas/4-bimestre.html',
  './livros/3-serie/artes/1-bimestre.html',
  './livros/3-serie/artes/2-bimestre.html',
  './livros/3-serie/artes/3-bimestre.html',
  './livros/3-serie/artes/4-bimestre.html',
];

// ═══════════════════════════════════════════════════════════════
// INSTALL — pré-cache shell + áudio + todos os livros
// ═══════════════════════════════════════════════════════════════
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(async cache => {
      // Assets críticos — falha aborta install
      await cache.addAll(SHELL_ASSETS_CRITICAL);
      // Assets opcionais (imagens, ícones, auth) — best-effort
      await Promise.allSettled(SHELL_ASSETS_OPTIONAL.map(url => cache.add(url)));
      // Áudio — best-effort
      await Promise.allSettled(AUDIO_ASSETS.map(url => cache.add(url)));
    }).then(() =>
      // Livros — best-effort, não aborta install
      caches.open(BOOKS_CACHE).then(cache =>
        Promise.allSettled(ALL_BOOKS.map(url => cache.add(url)))
      )
    ).then(() => self.skipWaiting())
  );
});

// ═══════════════════════════════════════════════════════════════
// ACTIVATE — limpa caches antigos + inicia cache de mídia
// ═══════════════════════════════════════════════════════════════
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => !VALID_CACHES.includes(k)).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
      .then(() => cacheMediaBackground())
  );
});

// Baixa vídeo e animação em background sem bloquear o activate
async function cacheMediaBackground() {
  try {
    const cache = await caches.open(MEDIA_CACHE);
    for (const url of MEDIA_ASSETS) {
      const cached = await cache.match(url);
      if (cached) continue;
      // Busca sem Range header para obter o arquivo completo
      fetch(new Request(url, { headers: {}, credentials: 'same-origin' }))
        .then(res => { if (res && res.status === 200) cache.put(url, res); })
        .catch(() => {});
    }
  } catch (e) {}
}

// ═══════════════════════════════════════════════════════════════
// FETCH — estratégias por tipo de recurso
// ═══════════════════════════════════════════════════════════════
self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (!url.protocol.startsWith('http')) return;

  // Recursos externos (Google Fonts, etc.) — passa direto para rede
  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(request).catch(() => new Response('', { status: 408 })));
    return;
  }

  const path = url.pathname;

  // Vídeo / animação → Cache-first (serve imediatamente do cache)
  if (path.includes('/assets/gif/') || path.endsWith('.mp4') || path.endsWith('.webm')) {
    event.respondWith(handleMedia(request));
    return;
  }

  // Áudio → Cache-first
  if (path.includes('/assets/audio/') || path.endsWith('.mp3')) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }

  // cache-manifest.json → Network-first (detecta novos livros)
  if (path.endsWith('cache-manifest.json')) {
    event.respondWith(networkFirst(request, SHELL_CACHE));
    return;
  }

  // Livros HTML → Stale-while-revalidate (serve do cache + atualiza em background)
  if (path.includes('/livros/')) {
    event.respondWith(staleWhileRevalidate(request, BOOKS_CACHE));
    return;
  }

  // Shell e demais → Stale-while-revalidate
  event.respondWith(staleWhileRevalidate(request, SHELL_CACHE));
});

// ── Cache-first: cache → rede → salva
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

// ── Stale-while-revalidate: serve do cache, atualiza em background
async function staleWhileRevalidate(request, cacheName) {
  const cached = await caches.match(request);
  const networkPromise = fetch(request).then(response => {
    if (response && response.status === 200 && response.type !== 'opaque') {
      const toCache = response.clone(); // clona sincronicamente ANTES de qualquer await
      caches.open(cacheName).then(cache => cache.put(request, toCache));
    }
    return response;
  }).catch(() => null);

  return cached || (await networkPromise) || new Response('Offline', { status: 503 });
}

// ── Network-first: rede → cache
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (response && response.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}

// ── Vídeo: Cache-first com suporte a Range requests (streaming offline)
async function handleMedia(request) {
  const cache = await caches.open(MEDIA_CACHE);

  // Busca o arquivo completo no cache (armazenado sem Range header)
  const fullCached = await cache.match(new Request(request.url));

  if (fullCached) {
    // Se o browser pediu um Range, fatiamos manualmente do ArrayBuffer
    const rangeHeader = request.headers.get('range');
    if (rangeHeader) {
      try {
        const blob      = await fullCached.clone().blob();
        const total     = blob.size;
        const [, s, e]  = /bytes=(\d*)-(\d*)/.exec(rangeHeader);
        const start     = s ? parseInt(s) : 0;
        const end       = e ? parseInt(e) : total - 1;
        const sliced    = blob.slice(start, end + 1);
        return new Response(sliced, {
          status: 206,
          headers: {
            'Content-Type':  fullCached.headers.get('Content-Type') || 'video/mp4',
            'Content-Range': `bytes ${start}-${end}/${total}`,
            'Content-Length': String(end - start + 1),
            'Accept-Ranges': 'bytes',
          },
        });
      } catch {
        return fullCached; // fallback: entrega a resposta completa
      }
    }
    return fullCached;
  }

  // Não está no cache — baixa da rede e armazena o arquivo completo
  try {
    const response = await fetch(new Request(request.url));
    if (response && response.status === 200) {
      cache.put(new Request(request.url), response.clone());
    }
    return response;
  } catch {
    return new Response('', { status: 503 });
  }
}

// ═══════════════════════════════════════════════════════════════
// PERIODIC BACKGROUND SYNC — verifica novos livros 1x por dia
// ═══════════════════════════════════════════════════════════════
self.addEventListener('periodicsync', event => {
  if (event.tag === 'bdm-update-check') {
    event.waitUntil(checkForUpdates());
  }
});

// ── Sync ao recuperar conectividade
self.addEventListener('sync', event => {
  if (event.tag === 'bdm-update-check') {
    event.waitUntil(checkForUpdates());
  }
});

// Compara cache-manifest.json com o que está cacheado e baixa novidades
async function checkForUpdates() {
  try {
    const manifestRes = await fetch('./cache-manifest.json?_t=' + Date.now(), {
      cache: 'no-store'
    });
    if (!manifestRes.ok) return;

    const manifest = await manifestRes.json();
    const booksCache = await caches.open(BOOKS_CACHE);
    let hasNew = false;

    await Promise.allSettled(
      (manifest.books || []).map(async entry => {
        const cached = await booksCache.match(entry.url);
        if (!cached) {
          // Livro novo — baixa e guarda
          const res = await fetch(entry.url);
          if (res && res.status === 200) {
            await booksCache.put(entry.url, res);
            hasNew = true;
          }
        } else if (entry.version) {
          // Verifica se a versão mudou
          const cachedVer = cached.headers.get('ETag') || cached.headers.get('Last-Modified') || '';
          if (entry.version !== cachedVer) {
            const res = await fetch(entry.url, { cache: 'no-store' });
            if (res && res.status === 200) {
              await booksCache.put(entry.url, res);
              hasNew = true;
            }
          }
        }
      })
    );

    // Notifica a página se houver novidades
    if (hasNew) {
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach(c => c.postMessage({ type: 'BDM_NEW_BOOKS', version: manifest.version || '' }));
    }
  } catch (e) {}
}

// ═══════════════════════════════════════════════════════════════
// PUSH NOTIFICATIONS — Mago Supremo
// ═══════════════════════════════════════════════════════════════
self.addEventListener('push', event => {
  let payload = { titulo: 'Mago Supremo', texto: 'Nova mensagem do seu professor!' };
  try {
    if (event.data) {
      const d = event.data.json();
      payload.titulo = d.titulo || payload.titulo;
      payload.texto  = d.texto  || payload.texto;
    }
  } catch(e) {}

  event.waitUntil(
    self.registration.showNotification('🧙‍♂️ ' + payload.titulo, {
      body:    payload.texto,
      icon:    './assets/icons/icon-192x192.png',
      badge:   './assets/icons/icon-192x192.png',
      tag:     'mago-mensagem',
      renotify: true,
      data:    { url: './' },
      actions: [{ action: 'open', title: 'Abrir Biblioteca' }]
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || './';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const c of clients) {
        if (c.url.includes(self.location.origin) && 'focus' in c) return c.focus();
      }
      return self.clients.openWindow(target);
    })
  );
});

// ═══════════════════════════════════════════════════════════════
// MENSAGENS vindas da página
// ═══════════════════════════════════════════════════════════════
self.addEventListener('message', event => {
  switch (event.data) {
    case 'GET_CACHED_BOOKS':
      caches.open(BOOKS_CACHE).then(cache =>
        cache.keys().then(keys =>
          event.source.postMessage({
            type: 'CACHED_BOOKS',
            urls: keys.map(r => r.url)
          })
        )
      );
      break;

    case 'FORCE_UPDATE':
      checkForUpdates();
      break;

    case 'CACHE_MEDIA':
      cacheMediaBackground();
      break;

    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
  }
});
