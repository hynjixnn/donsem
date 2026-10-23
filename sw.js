// 돈셈 서비스 워커: 인터넷이 끊겨도 가계부와 계산기가 열리게, 사이트 파일을 기기에 보관해요.
// 사이트를 고쳐서 올릴 때 VERSION을 바꾸면, 예전 보관 파일을 지우고 새로 받아요.
const VERSION = 'donsem-2026-10-23-102';
const CORE = ['/', '/budget/', '/assets/', '/fixed/', '/goals/', '/calculators/', '/my/', '/quiz/', '/money-type/', '/no-spend/', '/collection/', '/money-calendar/', '/style.css', '/app.js', '/budget.js', '/assets.js', '/fixed.js', '/goals.js', '/vt.js', '/my.js', '/quiz.js', '/quiz-data.js', '/money-type.js', '/no-spend.js', '/collection.js', '/money-calendar.js', '/favicon.svg', '/favicon.ico', '/favicon-32.png', '/favicon-96.png', '/logo-donsam.png', '/logo-d.png', '/icon-192.png', '/manifest.webmanifest', '/kb.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== 'donsem-font').map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  // 글씨체(Pretendard)는 한 번 받으면 기기에 보관해서, 앱을 켤 때 글씨체 서버를 기다리지 않게 해요
  if (req.method === 'GET' && url.hostname === 'cdn.jsdelivr.net' && url.pathname.includes('/pretendard')) {
    e.respondWith(caches.open('donsem-font').then(c => c.match(req).then(hit => hit || fetch(req).then(res => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }))));
    return;
  }
  if (req.method !== 'GET' || url.origin !== location.origin) return; // 광고 같은 다른 사이트 파일은 건드리지 않아요
  // 화면을 옮길 때 끊기지 않게: 기기에 보관해 둔 파일로 바로 보여 주고, 서버에서 새 파일은 뒤에서 받아 다음번에 써요.
  // 사이트를 새로 올리면(VERSION이 바뀌면) 보관함을 통째로 새로 받아서, 옛 파일과 새 파일이 섞이지 않아요.
  const key = req.mode === 'navigate' ? url.pathname : req;
  const update = () => fetch(req, { cache: 'no-cache' }).catch(() => fetch(req)).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(key, copy)); }
    return res;
  });
  e.respondWith(caches.match(key, req.mode === 'navigate' ? {} : { ignoreSearch: url.search === '' }).then(hit => {
    const net = update();
    if (hit) { e.waitUntil(net.catch(() => {})); return hit; } // 보관한 게 있으면 바로
    return net.catch(() => (req.mode === 'navigate' ? caches.match('/') : Response.error())); // 처음 보는 파일은 서버에서
  }));
});
