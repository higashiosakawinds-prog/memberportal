/**
 * 東大阪吹奏楽団 ひがすいポータル Service Worker
 *
 * 方針:
 *  - 同一オリジンの静的ファイル(HTML/CSS/JS/画像)は「ネットワーク優先 → 失敗時キャッシュ」
 *    （common.js の MAINTENANCE_CONFIG などを頻繁に書き換えても古い内容が残らないように）
 *  - CDN(jsdelivr / Google Fonts)は「キャッシュ優先 + 裏で更新」
 *  - Supabase・Google Apps Script・署名付きPDF URL など、上記以外の通信には一切介入しない
 *    （個人情報・認証・楽譜PDFをキャッシュに残さないため）
 *
 * 更新時は VERSION を上げてください。
 */
const VERSION = 'v1';
const SHELL_CACHE   = `higasui-shell-${VERSION}`;
const RUNTIME_CACHE = `higasui-runtime-${VERSION}`;
const NETWORK_TIMEOUT_MS = 4000;

const SHELL_FILES = [
  './',
  'index.html',
  'offline.html',
  'manifest.webmanifest',
  'css/variables.css',
  'css/common.css',
  'js/supabase.js',
  'js/common.js',
  'js/pwa.js',
  'android-chrome-192x192.png',
  'apple-touch-icon-180x180.png',
  'favicon.ico',
  'pages/schedule.html',
  'pages/scores.html',
  'pages/members.html',
  'pages/dues.html',
  'pages/applications.html',
  'pages/instruments.html',
  'pages/settings.html',
  'pages/auth/login.html',
  'pages/auth/register.html',
];

const CDN_HOSTS = ['cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];

// ── install: アプリシェルを事前キャッシュ（1件失敗しても全体は成功扱い） ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(cache =>
      Promise.allSettled(SHELL_FILES.map(f => cache.add(f)))
    ).then(() => self.skipWaiting())
  );
});

// ── activate: 古いキャッシュを削除 ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => ![SHELL_CACHE, RUNTIME_CACHE].includes(k)).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── fetch ──
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 同一オリジン: ネットワーク優先
  if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(req));
    return;
  }

  // 許可したCDNのみ: stale-while-revalidate
  if (CDN_HOSTS.includes(url.hostname)) {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  // それ以外（Supabase / GAS / 署名付きURL 等）は介入しない
});

async function networkFirst(req) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const res = await fetchWithTimeout(req, NETWORK_TIMEOUT_MS);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const cached = await cache.match(req, { ignoreSearch: true });
    if (cached) return cached;
    if (req.mode === 'navigate') {
      const offline = await cache.match('offline.html');
      if (offline) return offline;
    }
    return new Response('オフラインです', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(req);
  const network = fetch(req)
    .then(res => { if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone()); return res; })
    .catch(() => null);
  return cached || (await network) || new Response('', { status: 504 });
}

function fetchWithTimeout(req, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    fetch(req).then(
      res => { clearTimeout(timer); resolve(res); },
      err => { clearTimeout(timer); reject(err); }
    );
  });
}

// ── Web Push（将来用。サーバー側の送信実装が入るまでは何も起きません） ──
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data && event.data.text() }; }
  const title = data.title || '東大阪吹奏楽団';
  event.waitUntil(self.registration.showNotification(title, {
    body: data.body || '',
    icon: 'android-chrome-192x192.png',
    badge: 'android-chrome-192x192.png',
    data: { url: data.url || './index.html' },
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || './index.html', self.registration.scope).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url === target && 'focus' in c) return c.focus();
      }
      return self.clients.openWindow(target);
    })
  );
});
