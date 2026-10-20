// 돈셈 서비스 워커: 인터넷이 끊겨도 가계부와 계산기가 열리게, 사이트 파일을 기기에 보관해요.
// 사이트를 고쳐서 올릴 때 VERSION을 바꾸면, 예전 보관 파일을 지우고 새로 받아요.
const VERSION = 'donsem-2026-10-21-3';
const CORE = ['/', '/budget/', '/assets/', '/fixed/', '/style.css', '/app.js', '/budget.js', '/assets.js', '/fixed.js', '/favicon.svg', '/icon-192.png', '/manifest.webmanifest'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return; // 광고·글씨체 같은 다른 사이트 파일은 건드리지 않아요
  if (req.mode === 'navigate') {
    // 페이지: 인터넷이 되면 항상 최신으로, 끊기면 보관해 둔 페이지로
    e.respondWith(fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(url.pathname, copy)); }
      return res;
    }).catch(() => caches.match(url.pathname).then(r => r || caches.match('/'))));
    return;
  }
  // 그림·디자인·코드 파일도 인터넷이 되면 최신으로 받아요. 새 페이지에 옛 코드가 섞이지 않게요.
  e.respondWith(fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true })));
});
