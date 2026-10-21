// 돈셈 서비스 워커: 인터넷이 끊겨도 가계부와 계산기가 열리게, 사이트 파일을 기기에 보관해요.
// 사이트를 고쳐서 올릴 때 VERSION을 바꾸면, 예전 보관 파일을 지우고 새로 받아요.
const VERSION = 'donsem-2026-10-21-30';
const CORE = ['/', '/budget/', '/assets/', '/fixed/', '/goals/', '/calculators/', '/my/', '/quiz/', '/money-type/', '/no-spend/', '/style.css', '/app.js', '/budget.js', '/assets.js', '/fixed.js', '/goals.js', '/vt.js', '/my.js', '/quiz.js', '/quiz-data.js', '/money-type.js', '/no-spend.js', '/favicon.svg', '/icon-192.png', '/manifest.webmanifest'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return; // 광고·글씨체 같은 다른 사이트 파일은 건드리지 않아요
  // 브라우저가 10분씩 기억해 둔 옛 파일을 쓰지 않게, 매번 서버에 '바뀐 거 있어?' 하고 물어봐요 (안 바뀌었으면 짧은 답만 와요)
  const fresh = () => fetch(req, { cache: 'no-cache' }).catch(() => fetch(req)); // 옛 브라우저가 이 방식을 못 쓰면 원래대로
  if (req.mode === 'navigate') {
    // 페이지: 인터넷이 되면 항상 최신으로, 끊기면 보관해 둔 페이지로
    e.respondWith(fresh().then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(url.pathname, copy)); }
      return res;
    }).catch(() => caches.match(url.pathname).then(r => r || caches.match('/'))));
    return;
  }
  // 그림·디자인·코드 파일도 인터넷이 되면 최신으로 받아요. 새 페이지에 옛 코드가 섞이지 않게요.
  e.respondWith(fresh().then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true })));
});
